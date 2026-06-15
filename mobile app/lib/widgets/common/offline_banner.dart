import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/connectivity_provider.dart';

class OfflineBannerHost extends ConsumerWidget {
  const OfflineBannerHost({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOffline = ref.watch(isOfflineProvider);

    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: AnimatedCrossFade(
            duration: const Duration(milliseconds: 200),
            crossFadeState:
                isOffline ? CrossFadeState.showFirst : CrossFadeState.showSecond,
            firstChild: Material(
              elevation: 2,
              color: Colors.red.shade700,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    'No internet connection. Some features may not work.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
            secondChild: const SizedBox.shrink(),
          ),
        ),
      ],
    );
  }
}
