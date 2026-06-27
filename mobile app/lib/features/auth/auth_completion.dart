import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/user.dart';
import '../../routes/app_router.dart';
import '../../routes/route_paths.dart';
import 'auth_controller.dart';

/// Closes auth UI and lands on the home tab after sign-in / sign-up.
void completeAuthAndGoHome({
  required WidgetRef ref,
  required BuildContext sheetContext,
  required User user,
  required bool isSignup,
}) {
  ref.read(authControllerProvider.notifier).closeAuthModal();

  if (sheetContext.mounted) {
    Navigator.of(sheetContext).pop();
  }

  WidgetsBinding.instance.addPostFrameCallback((_) {
    final rootContext = rootNavigatorKey.currentContext;
    if (rootContext == null || !rootContext.mounted) return;

    GoRouter.of(rootContext).go(RoutePaths.home);

    final greetingName = user.name.trim().isNotEmpty ? user.name.trim() : 'there';
    ScaffoldMessenger.of(rootContext).showSnackBar(
      SnackBar(
        content: Text(
          isSignup
              ? 'Welcome to BulkMobileMart, $greetingName!'
              : 'Welcome back, $greetingName!',
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  });
}
