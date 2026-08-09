import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/contact.dart';
import '../../../config/theme.dart';
import '../../../core/utils/external_link.dart';
import '../../../widgets/common/whatsapp_icon.dart';

/// Floating support control — mirrors website `ChatWithUsButton`.
/// Opens a compact menu with WhatsApp + Call.
class HomeCornerActions extends StatefulWidget {
  const HomeCornerActions({super.key});

  @override
  State<HomeCornerActions> createState() => _HomeCornerActionsState();
}

class _HomeCornerActionsState extends State<HomeCornerActions> {
  bool _open = false;

  void _toggle() => setState(() => _open = !_open);

  void _close() {
    if (_open) setState(() => _open = false);
  }

  Future<void> _openWhatsApp() async {
    _close();
    await openExternalUrl(ContactConfig.contactWhatsAppUrl);
  }

  Future<void> _callSupport() async {
    _close();
    final uri = Uri.parse(ContactConfig.contactPhoneTel);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TapRegion(
      onTapOutside: (_) => _close(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          AnimatedSize(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            alignment: Alignment.bottomRight,
            child: _open
                ? Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: Colors.white,
                      elevation: 8,
                      shadowColor: Colors.black.withValues(alpha: 0.22),
                      shape: const StadiumBorder(
                        side: BorderSide(color: AppColors.borderLight),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _MenuAction(
                              tooltip: 'WhatsApp',
                              background: const Color(0xFF25D366),
                              onTap: _openWhatsApp,
                              child: const WhatsAppIcon(
                                size: 18,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 6),
                            _MenuAction(
                              tooltip: 'Call',
                              background: AppColors.primary,
                              onTap: _callSupport,
                              child: const Icon(
                                Icons.phone_rounded,
                                size: 18,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
          Material(
            color: AppColors.primary.withValues(alpha: 0.82),
            elevation: 6,
            shadowColor: AppColors.primary.withValues(alpha: 0.28),
            shape: const CircleBorder(),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: _toggle,
              child: SizedBox(
                width: 44,
                height: 44,
                child: Icon(
                  _open ? Icons.close_rounded : Icons.more_vert_rounded,
                  color: Colors.white.withValues(alpha: 0.95),
                  size: _open ? 22 : 26,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuAction extends StatelessWidget {
  const _MenuAction({
    required this.tooltip,
    required this.background,
    required this.onTap,
    required this.child,
  });

  final String tooltip;
  final Color background;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: background,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
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
