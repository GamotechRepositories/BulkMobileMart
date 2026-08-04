import 'package:flutter/material.dart';

import '../../../config/contact.dart';
import '../../../config/env.dart';
import '../../../config/theme.dart';
import '../../../core/utils/external_link.dart';

/// Home floating actions — mirrors website `ChatWithUsButton` / `FloatingCornerActions`.
class HomeCornerActions extends StatefulWidget {
  const HomeCornerActions({super.key});

  @override
  State<HomeCornerActions> createState() => _HomeCornerActionsState();
}

class _HomeCornerActionsState extends State<HomeCornerActions> {
  bool _open = false;

  Future<void> _openLink(String url) async {
    setState(() => _open = false);
    await openExternalUrl(url, context: context);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (_open) ...[
          Material(
            color: Colors.white,
            elevation: 8,
            shadowColor: Colors.black26,
            borderRadius: BorderRadius.circular(999),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ActionChip(
                    tooltip: 'WhatsApp',
                    color: const Color(0xFF25D366),
                    onTap: () => _openLink(ContactConfig.contactWhatsAppUrl),
                    child: const Icon(Icons.chat, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 6),
                  _ActionChip(
                    tooltip: 'Call',
                    color: AppColors.primary,
                    onTap: () => _openLink(ContactConfig.contactPhoneTel),
                    child: const Icon(Icons.phone, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 6),
                  _ActionChip(
                    tooltip: 'Play Store',
                    color: const Color(0xFF01875F),
                    onTap: () => _openLink(Env.playStoreAppUrl),
                    child: const Icon(Icons.download, color: Colors.white, size: 18),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        Material(
          color: AppColors.primary,
          elevation: 6,
          shadowColor: AppColors.primary.withValues(alpha: 0.4),
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: () => setState(() => _open = !_open),
            child: SizedBox(
              width: 44,
              height: 44,
              child: Icon(
                _open ? Icons.close : Icons.more_vert,
                color: Colors.white,
                size: _open ? 20 : 22,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.tooltip,
    required this.color,
    required this.onTap,
    required this.child,
  });

  final String tooltip;
  final Color color;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: color,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: 36,
            height: 36,
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}
