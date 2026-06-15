import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/constants.dart';
import '../../models/product.dart';

String buildProductShareUrl(String productId) =>
    '${AppConstants.webShareBaseUrl}/product/$productId';

String buildProductShareMessage(Product product) {
  final url = buildProductShareUrl(product.id);
  return 'Check out ${product.name} on Bulk Mobile Mart\n\n$url';
}

Future<void> showProductShareSheet(BuildContext context, Product product) async {
  final message = buildProductShareMessage(product);

  await showModalBottomSheet<void>(
    context: context,
    builder: (context) => SafeArea(
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
          ListTile(
            leading: const Icon(Icons.chat, color: Color(0xFF25D366)),
            title: const Text('WhatsApp'),
            onTap: () async {
              Navigator.pop(context);
              final uri = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(message)}');
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            },
          ),
          ListTile(
            leading: const Icon(Icons.email_outlined),
            title: const Text('Email'),
            onTap: () async {
              Navigator.pop(context);
              final uri = Uri.parse(
                'mailto:?subject=${Uri.encodeComponent(product.name)}&body=${Uri.encodeComponent(message)}',
              );
              await launchUrl(uri);
            },
          ),
          ListTile(
            leading: const Icon(Icons.link),
            title: const Text('Copy link'),
            onTap: () async {
              await Clipboard.setData(ClipboardData(text: message));
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Link copied')),
                );
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.share_outlined),
            title: const Text('More options'),
            onTap: () async {
              Navigator.pop(context);
              await SharePlus.instance.share(ShareParams(text: message, subject: product.name));
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
