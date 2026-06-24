import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app.dart';
import 'config/env.dart';
import 'core/providers/app_providers.dart';
import 'core/storage/auth_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Keep decoded images bounded on low-RAM devices.
  PaintingBinding.instance.imageCache.maximumSize = 80;
  PaintingBinding.instance.imageCache.maximumSizeBytes = 48 << 20;

  await Env.load();

  // Prefetch app font so first frames don't hitch on network font download.
  await GoogleFonts.pendingFonts([GoogleFonts.plusJakartaSans()]);

  if (kDebugMode) {
    for (final issue in Env.validate()) {
      debugPrint('Env warning: $issue');
    }
  }

  final authStorage = await AuthStorage.create();

  runApp(
    ProviderScope(
      overrides: [
        authStorageProvider.overrideWithValue(authStorage),
      ],
      child: const BulkMobileMartApp(),
    ),
  );
}
