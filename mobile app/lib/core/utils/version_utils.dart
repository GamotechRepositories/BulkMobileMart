import '../../models/store_settings.dart';

/// Compare dotted version strings like `1.0.4` / `1.0.5+7` (build ignored).
int compareAppVersions(String a, String b) {
  List<int> parse(String value) {
    final core = value.trim().split('+').first;
    return core
        .split('.')
        .map((part) => int.tryParse(part.trim()) ?? 0)
        .toList();
  }

  final left = parse(a);
  final right = parse(b);
  final length = left.length > right.length ? left.length : right.length;
  for (var i = 0; i < length; i++) {
    final x = i < left.length ? left[i] : 0;
    final y = i < right.length ? right[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}

enum AppUpdateDecision { none, soft, force }

AppUpdateDecision resolveAppUpdateDecision({
  required String currentVersion,
  required AppUpdateSettings update,
}) {
  final current = currentVersion.trim();
  final latest = update.latestVersion.trim();
  final min = update.minVersion.trim();

  if (current.isEmpty) return AppUpdateDecision.none;

  final belowMin =
      min.isNotEmpty && compareAppVersions(current, min) < 0;
  if (belowMin && update.forceUpdate) {
    return AppUpdateDecision.force;
  }

  if (latest.isNotEmpty && compareAppVersions(current, latest) < 0) {
    return belowMin ? AppUpdateDecision.force : AppUpdateDecision.soft;
  }

  if (belowMin) {
    return AppUpdateDecision.force;
  }

  return AppUpdateDecision.none;
}
