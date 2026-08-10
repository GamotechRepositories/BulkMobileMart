import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/utils/image_gallery_save.dart';
import '../../core/utils/network_image_bytes.dart';
import '../../models/product.dart';

String buildAdminProductShareMessage(Product product) {
  final lines = <String>[product.name.trim()];
  final brand = product.brandName.trim();
  if (brand.isNotEmpty) {
    lines.add('Brand: $brand');
  }
  return lines.join('\n');
}

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

Future<File?> _createAdminShareImageFile(Product product) async {
  final imageUrl = product.primaryImage ?? '';
  if (imageUrl.isEmpty) return null;

  final bytes = await downloadNetworkImageBytes(imageUrl);
  if (bytes == null || bytes.isEmpty) return null;

  final ext = _imageExtension(imageUrl);
  final safeName = product.name
      .replaceAll(RegExp(r'[^\w\s-]'), '')
      .trim()
      .replaceAll(RegExp(r'\s+'), '-')
      .toLowerCase();

  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/${safeName.isEmpty ? 'product' : safeName}.$ext');
  await file.writeAsBytes(bytes, flush: true);
  return file;
}

Future<void> _shareAdminProduct(
  BuildContext context,
  Product product, {
  bool whatsAppFallback = false,
}) async {
  final caption = buildAdminProductShareMessage(product);

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
              Text('Preparing share...'),
            ],
          ),
        ),
      ),
    ),
  );

  try {
    final imageFile = await _createAdminShareImageFile(product);

    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      loadingVisible = false;
    }

    if (imageFile != null) {
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile(
              imageFile.path,
              mimeType: _mimeTypeForExtension(_imageExtension(product.primaryImage ?? '')),
              name: imageFile.uri.pathSegments.last,
            ),
          ],
          text: caption,
          subject: product.name,
        ),
      );
      return;
    }

    if (whatsAppFallback && caption.isNotEmpty) {
      final uri = Uri.parse(
        'https://wa.me/?text=${Uri.encodeComponent(caption)}',
      );
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return;
    }

    await SharePlus.instance.share(
      ShareParams(
        text: caption,
        subject: product.name,
      ),
    );
  } catch (error, stackTrace) {
    debugPrint('Admin product share failed: $error\n$stackTrace');
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

Future<void> _copyAdminProductShare(
  BuildContext context,
  Product product,
) async {
  final caption = buildAdminProductShareMessage(product);
  final imageUrl = product.primaryImage ?? '';

  var copiedImage = false;
  if (imageUrl.isNotEmpty) {
    final result = await saveProductImageToGallery(
      imageUrl: imageUrl,
      productId: product.id,
    );
    copiedImage = result.success;
  }

  if (caption.isNotEmpty) {
    await Clipboard.setData(ClipboardData(text: caption));
  }

  if (!context.mounted) return;

  final message = copiedImage
      ? 'Image saved to gallery & product details copied'
      : 'Product details copied';
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message)),
  );
}

Future<void> _shareAdminToInstagram(BuildContext context, Product product) async {
  try {
    await _shareAdminProduct(context, product);
  } catch (_) {
    if (!context.mounted) return;
    await _copyAdminProductShare(context, product);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Product image saved and details copied — paste in Instagram.',
        ),
      ),
    );
  }
}

Future<void> showProductAdminShareSheet(
  BuildContext context,
  Product product,
) async {
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
              'Share product',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              'Shares product image with name and brand only. No price, description, or link.',
              style: TextStyle(fontSize: 13, color: Colors.black54),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.chat, color: Color(0xFF25D366)),
            title: const Text('WhatsApp'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await _shareAdminProduct(
                parentContext,
                product,
                whatsAppFallback: true,
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined, color: Color(0xFFE1306C)),
            title: const Text('Instagram'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await _shareAdminToInstagram(parentContext, product);
            },
          ),
          ListTile(
            leading: const Icon(Icons.email_outlined),
            title: const Text('Email'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await _shareAdminProduct(parentContext, product);
            },
          ),
          ListTile(
            leading: const Icon(Icons.sms_outlined, color: Color(0xFF2196F3)),
            title: const Text('SMS'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await _shareAdminProduct(parentContext, product);
            },
          ),
          ListTile(
            leading: const Icon(Icons.copy_outlined),
            title: const Text('Copy image & details'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await _copyAdminProductShare(parentContext, product);
            },
          ),
          ListTile(
            leading: const Icon(Icons.share_outlined),
            title: const Text('More options'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await _shareAdminProduct(parentContext, product);
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
