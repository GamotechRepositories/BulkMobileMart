import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import 'notification_navigator.dart';
import 'notification_repository.dart';
import 'notifications_controller.dart';
import '../../models/push_notification_payload.dart';
import '../../routes/app_router.dart';
import '../../services/notification_service.dart';

class NotificationBootstrap extends ConsumerStatefulWidget {
  const NotificationBootstrap({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<NotificationBootstrap> createState() =>
      _NotificationBootstrapState();
}

class _NotificationBootstrapState extends ConsumerState<NotificationBootstrap>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _wireHandlers());
  }

  void _wireHandlers() {
    final service = NotificationService.instance;
    service.tokenSyncHandler = _syncToken;
    service.onNotificationOpened = _onNotificationOpened;
    service.onForegroundMessage = _onForegroundMessage;

    if (ref.read(authControllerProvider).isLoggedIn) {
      unawaited(NotificationService.instance.registerToken());
      unawaited(
        ref.read(notificationsControllerProvider.notifier).refreshIfLoggedIn(),
      );
    }

    unawaited(NotificationNavigator.flushPending(context, ref));
  }

  Future<void> _syncToken(String token) async {
    if (!ref.read(authControllerProvider).isLoggedIn) return;

    try {
      await ref.read(notificationRepositoryProvider).registerToken(token);
    } catch (_) {
      // Token sync is retried on refresh and login.
    }
  }

  void _onForegroundMessage(PushNotificationPayload payload) {
    ref.read(notificationsControllerProvider.notifier).notifyIncomingPush();
  }

  Future<void> _onNotificationOpened(PushNotificationPayload payload) async {
    ref.read(notificationsControllerProvider.notifier).notifyIncomingPush();

    if (!ref.read(authControllerProvider).isLoggedIn) {
      NotificationPendingNavigation.store(payload);
      ref.read(authControllerProvider.notifier).openAuthModal();
      return;
    }

    final rootContext = rootNavigatorKey.currentContext ?? context;
    if (!rootContext.mounted) {
      NotificationPendingNavigation.store(payload);
      return;
    }

    await NotificationNavigator.openFromPayload(
      rootContext,
      ref,
      payload,
      notificationId: payload.notificationId,
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;

    unawaited(
      ref
          .read(notificationsControllerProvider.notifier)
          .refreshIfLoggedIn(force: true),
    );
    unawaited(NotificationNavigator.flushPending(context, ref));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final service = NotificationService.instance;
    service.tokenSyncHandler = null;
    service.onNotificationOpened = null;
    service.onForegroundMessage = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authControllerProvider, (previous, next) {
      if (previous?.isLoggedIn != true && next.isLoggedIn) {
        unawaited(NotificationService.instance.registerToken());
        unawaited(
          ref
              .read(notificationsControllerProvider.notifier)
              .refreshIfLoggedIn(force: true),
        );
        unawaited(NotificationNavigator.flushPending(context, ref));
      }
    });

    return widget.child;
  }
}
