import 'dart:io';

import 'package:bulk_mobile_mart/app.dart';
import 'package:bulk_mobile_mart/config/env.dart';
import 'package:bulk_mobile_mart/core/perf/first_frame_profiler.dart';
import 'package:bulk_mobile_mart/core/providers/app_providers.dart';
import 'package:bulk_mobile_mart/core/storage/auth_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Drives the home route and writes [FIRST_FRAME_PROFILE.md] from Timeline samples.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('capture first frame profile', (tester) async {
    FirstFrameProfiler.reset();
    FirstFrameProfiler.markAppStart();

    await Env.load();
    final authStorage = await AuthStorage.create();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStorageProvider.overrideWithValue(authStorage),
        ],
        child: const BulkMobileMartApp(),
      ),
    );

    await tester.pump();
    await tester.pump();
    FirstFrameProfiler.markFirstFrame();

    // Advance fake clock for async providers / first image decode.
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    final reportPath = '${Directory.current.path}${Platform.pathSeparator}FIRST_FRAME_PROFILE.md';

    await FirstFrameProfiler.writeReport(path: reportPath);

    final report = File(reportPath);
    expect(report.existsSync(), isTrue);
    expect(report.readAsStringSync(), contains('HomeScreen'));
  });
}
