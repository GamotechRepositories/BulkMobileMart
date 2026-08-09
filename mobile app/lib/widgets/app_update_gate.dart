import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/env.dart';
import '../config/theme.dart';
import '../core/providers/package_info_provider.dart';
import '../core/utils/external_link.dart';
import '../core/utils/version_utils.dart';
import '../features/settings/store_settings_provider.dart';
import '../models/store_settings.dart';
import '../routes/app_router.dart';

/// Shows a blocking/soft update dialog when the installed app is behind
/// [StoreSettings.appUpdate] from the backend.
class AppUpdateGate extends ConsumerStatefulWidget {
  const AppUpdateGate({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppUpdateGate> createState() => _AppUpdateGateState();
}

class _AppUpdateGateState extends ConsumerState<AppUpdateGate> {
  var _dialogVisible = false;
  String? _checkedForVersion;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_check());
    });
  }

  Future<void> _check() async {
    final settings = ref.read(storeSettingsProvider).value;
    if (settings != null) {
      await _maybeShowUpdateDialog(settings.appUpdate);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(storeSettingsProvider, (previous, next) {
      final settings = next.asData?.value;
      if (settings == null) return;
      unawaited(_maybeShowUpdateDialog(settings.appUpdate));
    });

    return widget.child;
  }

  Future<void> _maybeShowUpdateDialog(AppUpdateSettings update) async {
    if (!mounted || _dialogVisible) return;

    final info = await ref.read(packageInfoProvider.future);
    if (!mounted) return;

    final current = info.version.trim();
    if (current.isEmpty) return;

    final decision = resolveAppUpdateDecision(
      currentVersion: current,
      update: update,
    );
    if (decision == AppUpdateDecision.none) return;

    final checkKey = '$current|${update.latestVersion}|${decision.name}';
    if (_checkedForVersion == checkKey) return;
    _checkedForVersion = checkKey;

    final storeUrl = defaultTargetPlatform == TargetPlatform.iOS
        ? (update.iosStoreUrl.trim().isNotEmpty
            ? update.iosStoreUrl.trim()
            : Env.playStoreAppUrl)
        : (update.androidStoreUrl.trim().isNotEmpty
            ? update.androidStoreUrl.trim()
            : Env.playStoreAppUrl);

    final rootContext = rootNavigatorKey.currentContext;
    if (rootContext == null || !rootContext.mounted) {
      _checkedForVersion = null;
      return;
    }

    _dialogVisible = true;
    final force = decision == AppUpdateDecision.force;
    await showDialog<void>(
      context: rootContext,
      barrierDismissible: !force,
      builder: (dialogContext) {
        return PopScope(
          canPop: !force,
          child: AlertDialog(
            title: const Text('Update available'),
            content: Text(
              update.message.trim().isNotEmpty
                  ? update.message.trim()
                  : 'A new version of BulkMobileMart is available. Please update the app.',
            ),
            actions: [
              if (!force)
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Later'),
                ),
              FilledButton(
                onPressed: () {
                  openExternalUrl(
                    storeUrl,
                    context: dialogContext,
                    errorMessage: 'Could not open Play Store.',
                  );
                  if (!force && dialogContext.mounted) {
                    Navigator.of(dialogContext).pop();
                  }
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navSelected,
                ),
                child: const Text('Update now'),
              ),
            ],
          ),
        );
      },
    );

    if (!mounted) return;
    _dialogVisible = false;
    if (force) {
      _checkedForVersion = null;
      unawaited(_maybeShowUpdateDialog(update));
    }
  }
}
