import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/user.dart';
import '../../routes/app_router.dart';
import 'auth_controller.dart';

/// Closes auth UI and lands on the home tab after sign-in / sign-up.
void completeAuthAndGoHome({
  required WidgetRef ref,
  required BuildContext sheetContext,
  required User user,
  required bool isSignup,
}) {
  ref.read(authControllerProvider.notifier).closeAuthModal();
  _dismissAuthOverlays();

  ref.read(authControllerProvider.notifier).requestRedirectHomeAfterAuth();

  Future<void>.microtask(() {
    final greetingName =
        user.name.trim().isNotEmpty ? user.name.trim() : 'there';
    final message = isSignup
        ? 'Welcome to BulkMobileMart, $greetingName!'
        : 'Welcome back, $greetingName!';

    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future<void>.delayed(const Duration(milliseconds: 150), () {
        final ctx = rootNavigatorKey.currentContext;
        if (ctx == null || !ctx.mounted) return;

        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(
            content: Text(message),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      });
    });
  });
}

void _dismissAuthOverlays() {
  final rootNav = rootNavigatorKey.currentState;
  if (rootNav == null) return;

  rootNav.popUntil((route) => route is! PopupRoute);
}
