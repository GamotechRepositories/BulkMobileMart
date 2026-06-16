import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'features/auth/auth_host.dart';
import 'routes/app_router.dart';
import 'widgets/cart/cart_feedback_overlay.dart';
import 'widgets/deep_link_listener.dart';

class BulkMobileMartApp extends ConsumerWidget {
  const BulkMobileMartApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return DeepLinkListener(
      child: MaterialApp.router(
        title: 'BulkMobileMart',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        routerConfig: router,
        builder: (context, child) {
          return AuthHost(
            child: CartFeedbackOverlay(
              child: child ?? const SizedBox.shrink(),
            ),
          );
        },
      ),
    );
  }
}
