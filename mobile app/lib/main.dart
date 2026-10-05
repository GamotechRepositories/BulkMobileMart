import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app.dart';
import 'config/env.dart';
import 'core/bootstrap/photo_picker_bootstrap.dart';
import 'core/providers/app_providers.dart';
import 'core/storage/auth_storage.dart';
import 'services/notification_service.dart';
import 'services/facebook_app_events_service.dart';
import 'widgets/app_back_binding.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    WidgetsFlutterBinding.ensureInitialized();
    await NotificationService.handleBackgroundMessage(message);
  } catch (error, stackTrace) {
    if (kDebugMode) {
      debugPrint('FCM background message handler error: $error\n$stackTrace');
    }
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Global Flutter and platform error shield — prevent uncaught exceptions from killing the app.
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    if (kDebugMode) {
      debugPrint('FlutterError: ${details.exceptionAsString()}');
    }
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    if (kDebugMode) {
      debugPrint('PlatformDispatcher error: $error\n$stack');
    }
    return true; // Handled, do not crash process
  };

  // Register before runApp so we receive Android back before the app exits.
  try {
    AppBackBinding.instance.install();
  } catch (e) {
    debugPrint('AppBackBinding install failed: $e');
  }

  // Keep decoded images bounded on low-RAM devices (3–6 GB class hardware).
  try {
    PaintingBinding.instance.imageCache.maximumSize = 60;
    PaintingBinding.instance.imageCache.maximumSizeBytes = 32 << 20;
  } catch (_) {}

  // Gallery picks use the system Photo Picker — no READ_MEDIA_* permissions.
  try {
    configureAndroidPhotoPicker();
  } catch (e) {
    debugPrint('configureAndroidPhotoPicker failed: $e');
  }

  try {
    await Env.load();
  } catch (e) {
    debugPrint('Env.load error: $e');
  }

  if (kDebugMode) {
    for (final issue in Env.validate()) {
      debugPrint('Env warning: $issue');
    }
  }

  // Firebase initialization — wrapped so missing config/services does not block app launch.
  try {
    await NotificationService.ensureFirebaseReady();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    await NotificationService.instance.initialize();
  } catch (e, st) {
    debugPrint('Firebase/Notification initialization skipped or failed: $e\n$st');
  }

  // Facebook App Events SDK initialization — safe call.
  try {
    await FacebookAppEventsService.instance.initialize();
  } catch (e, st) {
    debugPrint('FacebookAppEventsService initialization failed: $e\n$st');
  }

  AuthStorage? authStorage;
  try {
    authStorage = await AuthStorage.create();
  } catch (e, st) {
    debugPrint('AuthStorage.create failed: $e\n$st');
  }

  runApp(
    ProviderScope(
      overrides: [
        if (authStorage != null)
          authStorageProvider.overrideWithValue(authStorage),
      ],
      child: const BulkMobileMartApp(),
    ),
  );

  // Font fetch after first frame — never block runApp.
  WidgetsBinding.instance.addPostFrameCallback((_) {
    try {
      GoogleFonts.pendingFonts([GoogleFonts.plusJakartaSans()]);
    } catch (_) {}
  });
}
