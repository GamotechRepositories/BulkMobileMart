import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../config/env.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/network_image_bytes.dart';
import '../../core/utils/product_pricing.dart';
import '../../core/utils/product_share_capture.dart';
import '../../models/product.dart';

String _imageExtension(String imageUrl) {
  final match = RegExp(r'\.(jpe?g|png|webp|gif)(?:\?|$)', caseSensitive: false)
      .firstMatch(imageUrl);
  return match?.group(1)?.toLowerCase() ?? 'jpg';
}

String _mimeTypeForExtension(String ext) {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

Future<void> shareProductImageOnly(
  BuildContext context,
  Product product,
) async {
  final imageUrl = product.primaryImage ?? '';
  if (imageUrl.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No product image available to share')),
    );
    return;
  }

  var loadingVisible = true;
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (_) => const Center(
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 12),
              Text('Preparing image to share...'),
            ],
          ),
        ),
      ),
    ),
  );

  try {
    final bytes = await downloadNetworkImageBytes(imageUrl);
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      loadingVisible = false;
    }

    if (bytes != null && bytes.isNotEmpty) {
      final ext = _imageExtension(imageUrl);
      final safeName = product.name
          .replaceAll(RegExp(r'[^\w\s-]'), '')
          .trim()
          .replaceAll(RegExp(r'\s+'), '-')
          .toLowerCase();

      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${safeName.isEmpty ? 'product' : safeName}.$ext');
      await file.writeAsBytes(bytes, flush: true);

      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile(
              file.path,
              mimeType: _mimeTypeForExtension(ext),
              name: file.uri.pathSegments.last,
            ),
          ],
        ),
      );
      return;
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not download image to share')),
      );
    }
  } catch (error, stackTrace) {
    debugPrint('Share image only failed: $error\n$stackTrace');
    if (context.mounted && loadingVisible) {
      Navigator.of(context, rootNavigator: true).pop();
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not share image')),
      );
    }
  }
}

String buildProductShareUrl(String productId) =>
    '${Env.storeUrl}/product/$productId?openInApp=1';

String buildProductShareMessage(
  Product product, {
  String variantName = '',
}) {
  final url = buildProductShareUrl(product.id);
  final priceLabel = formatProductPriceLabel(
    product,
    (value) => formatInr(value, withDecimals: true),
    variantName,
  );

  final lines = <String>[
    product.name.trim(),
    priceLabel,
    if (product.brandName.trim().isNotEmpty)
      'Brand: ${product.brandName.trim()}',
    if (variantName.trim().isNotEmpty) 'Variant: ${variantName.trim()}',
    '',
    'Shop on Bulk Mobile Mart:',
    url,
  ];

  return lines.join('\n');
}

Future<File?> _createShareImageFile(
  BuildContext context,
  Product product, {
  required String priceLabel,
  required String variantName,
}) async {
  final imageUrl = product.primaryImage ?? '';
  if (imageUrl.isEmpty) return null;

  return captureProductShareCardFile(
    context: context,
    productId: product.id,
    imageUrl: imageUrl,
    productName: product.name,
    priceLabel: priceLabel,
    brandName: product.brandName,
    shareUrl: buildProductShareUrl(product.id),
  );
}

Future<void> _shareImageFile(
  File file, {
  String? caption,
}) async {
  await SharePlus.instance.share(
    ShareParams(
      files: [
        XFile(
          file.path,
          mimeType: 'image/png',
          name: 'product-share.png',
        ),
      ],
      text: caption,
      subject: caption,
    ),
  );
}

Future<void> shareProductWithCard(
  BuildContext context,
  Product product, {
  String variantName = '',
}) async {
  final message = buildProductShareMessage(product, variantName: variantName);
  final priceLabel = formatProductPriceLabel(
    product,
    (value) => formatInr(value, withDecimals: true),
    variantName,
  );

  if (!context.mounted) return;

  var loadingVisible = true;
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (_) => const Center(
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 12),
              Text('Preparing share image...'),
            ],
          ),
        ),
      ),
    ),
  );

  try {
    final imageFile = await _createShareImageFile(
      context,
      product,
      priceLabel: priceLabel,
      variantName: variantName,
    );

    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      loadingVisible = false;
    }

    if (imageFile != null) {
      await _shareImageFile(imageFile, caption: message);
      return;
    }

    await SharePlus.instance.share(
      ShareParams(
        text: message,
        subject: product.name,
      ),
    );
  } catch (error, stackTrace) {
    debugPrint('Product share failed: $error\n$stackTrace');
    if (context.mounted && loadingVisible) {
      Navigator.of(context, rootNavigator: true).pop();
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not share product')),
      );
    }
  }
}

Future<void> showProductShareSheet(
  BuildContext context,
  Product product, {
  String variantName = '',
}) async {
  final message = buildProductShareMessage(product, variantName: variantName);
  final parentContext = context;

  await showModalBottomSheet<void>(
    context: context,
    builder: (sheetContext) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Share this product',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              'Shares image, name, brand, price, and product link',
              style: TextStyle(fontSize: 13, color: Colors.black54),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.chat, color: Color(0xFF25D366)),
            title: const Text('WhatsApp'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await shareProductWithCard(
                parentContext,
                product,
                variantName: variantName,
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.email_outlined),
            title: const Text('Email'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await shareProductWithCard(
                parentContext,
                product,
                variantName: variantName,
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.link),
            title: const Text('Copy link'),
            onTap: () async {
              await Clipboard.setData(ClipboardData(text: message));
              if (sheetContext.mounted) {
                Navigator.pop(sheetContext);
                ScaffoldMessenger.of(parentContext).showSnackBar(
                  const SnackBar(content: Text('Link copied')),
                );
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.share_outlined),
            title: const Text('More options'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await shareProductWithCard(
                parentContext,
                product,
                variantName: variantName,
              );
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
