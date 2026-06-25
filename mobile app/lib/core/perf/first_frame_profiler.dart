import 'dart:developer';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Records durations paired with [Timeline.startSync] / [Timeline.finishSync].
/// Durations use [Timeline.now] (microseconds) — same clock as the VM timeline.
class FirstFrameProfiler {
  FirstFrameProfiler._();

  static final Map<String, int> _buildMicros = {};
  static final Map<String, int> _eventMicros = {};
  static String? _firstProviderName;
  static int? _appStartUs;
  static bool _reportWritten = false;
  static bool _imageDecodeDone = false;
  static bool _firstNetworkImageDone = false;
  static bool _firstProviderDone = false;
  static bool _firstFrameClosed = false;

  static const widgetKeys = [
    'HomeScreen',
    'MobileSearchBar',
    'HeroBannerCarousel',
    'CategoryNavSection',
    'AppShell',
    'TabSwipeShell',
    'Banner paint',
    'Provider rebuild',
  ];

  static const eventKeys = [
    'Image decode',
    'First network image completion',
    'First provider completion',
  ];

  static void markAppStart() {
    _appStartUs ??= Timeline.now;
  }

  static void markFirstFrame() {
    _firstFrameClosed = true;
  }

  /// Wrap a widget [build] during the first Flutter frame.
  static T traceBuild<T>(String name, T Function() body) {
    Timeline.startSync(name);
    final startUs = Timeline.now;
    try {
      return body();
    } finally {
      final elapsed = Timeline.now - startUs;
      if (!_firstFrameClosed) {
        _buildMicros[name] = (_buildMicros[name] ?? 0) + elapsed;
      }
      Timeline.finishSync();
    }
  }

  /// Record the first post-frame build of a widget (e.g. provider-driven rebuild).
  static T traceBuildFirst<T>(String name, T Function() body) {
    Timeline.startSync(name);
    final startUs = Timeline.now;
    try {
      return body();
    } finally {
      final elapsed = Timeline.now - startUs;
      _buildMicros.putIfAbsent(name, () => elapsed);
      Timeline.finishSync();
    }
  }

  /// Record a one-shot async/event duration (also emits a timeline slice).
  static void traceEvent(String name, int elapsedMicros) {
    if (_eventMicros.containsKey(name)) return;
    Timeline.startSync(name);
    _eventMicros[name] = elapsedMicros;
    Timeline.finishSync();
  }

  static void recordProviderCompletion(String providerName, int elapsedMicros) {
    if (_firstProviderDone) return;
    _firstProviderDone = true;
    _firstProviderName = providerName;
    traceEvent('First provider completion', elapsedMicros);
  }

  static void traceImageDecode(ImageProvider provider, ImageConfiguration config) {
    if (_imageDecodeDone) return;
    Timeline.startSync('Image decode');
    final startUs = Timeline.now;
    final stream = provider.resolve(config);
    late ImageStreamListener listener;
    listener = ImageStreamListener(
      (ImageInfo info, bool syncCall) {
        if (!_imageDecodeDone) {
          _imageDecodeDone = true;
          final elapsed = Timeline.now - startUs;
          _eventMicros['Image decode'] = elapsed;
          Timeline.finishSync();
          if (!_firstNetworkImageDone) {
            _firstNetworkImageDone = true;
            final sinceStart = _appStartUs == null ? elapsed : Timeline.now - _appStartUs!;
            traceEvent('First network image completion', sinceStart);
          }
        }
        stream.removeListener(listener);
      },
      onError: (Object error, StackTrace? stackTrace) {
        if (!_imageDecodeDone) {
          Timeline.finishSync();
        }
        stream.removeListener(listener);
      },
    );
    stream.addListener(listener);
  }

  static String generateReport() {
    String row(String label, int? micros) {
      final ms = micros == null ? 'n/a' : (micros / 1000).toStringAsFixed(0);
      final padded = label.padRight(30, '.');
      return '$padded$ms ms';
    }

    final buffer = StringBuffer()
      ..writeln('# First Frame Profile')
      ..writeln()
      ..writeln('Captured with `Timeline.startSync()` / `Timeline.finishSync()` and `Timeline.now`.')
      ..writeln('Mode: ${kProfileMode ? "profile" : kDebugMode ? "debug" : "release"}');
    if (_firstProviderName != null) {
      buffer.writeln('First provider: $_firstProviderName');
    }
    buffer.writeln();

    for (final key in widgetKeys) {
      buffer.writeln(row(key, _buildMicros[key]));
    }
    buffer.writeln();
    for (final key in eventKeys) {
      buffer.writeln(row(key, _eventMicros[key]));
    }

    buffer
      ..writeln()
      ..writeln('## Ranked (slowest widget builds)')
      ..writeln();

    final ranked = _buildMicros.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    for (var i = 0; i < ranked.length; i++) {
      final e = ranked[i];
      buffer.writeln('${i + 1}. ${e.key} — ${(e.value / 1000).toStringAsFixed(0)} ms');
    }

    if (ranked.isEmpty) {
      buffer.writeln('_No widget build samples recorded._');
    }

    return buffer.toString();
  }

  static Future<void> writeReport({String? path}) async {
    if (_reportWritten) return;
    _reportWritten = true;
    final content = generateReport();
    debugPrint('===FIRST_FRAME_PROFILE_START===');
    debugPrint(content);
    debugPrint('===FIRST_FRAME_PROFILE_END===');

    final target = path ?? _defaultReportPath();
    if (target != null) {
      try {
        await File(target).writeAsString(content);
        debugPrint('FIRST_FRAME_PROFILE written to $target');
      } catch (e) {
        debugPrint('FIRST_FRAME_PROFILE write failed: $e');
      }
    }
  }

  static String? _defaultReportPath() {
    // `flutter test` runs with CWD = package root (`mobile app/`).
    try {
      return 'FIRST_FRAME_PROFILE.md';
    } catch (_) {
      return null;
    }
  }

  @visibleForTesting
  static void reset() {
    _buildMicros.clear();
    _eventMicros.clear();
    _appStartUs = null;
    _reportWritten = false;
    _imageDecodeDone = false;
    _firstNetworkImageDone = false;
    _firstProviderDone = false;
    _firstProviderName = null;
    _firstFrameClosed = false;
  }
}
