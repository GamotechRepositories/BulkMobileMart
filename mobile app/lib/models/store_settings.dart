class MerchantUpiAccount {
  const MerchantUpiAccount({
    required this.upiId,
    required this.label,
    this.enabled = true,
  });

  final String upiId;
  final String label;
  final bool enabled;

  factory MerchantUpiAccount.fromJson(Map<String, dynamic> json) {
    return MerchantUpiAccount(
      upiId: (json['upiId'] as String? ?? '').trim(),
      label: (json['label'] as String? ?? 'BulkMobileMart').trim(),
      enabled: json['enabled'] != false,
    );
  }
}

class AppUpdateSettings {
  const AppUpdateSettings({
    this.latestVersion = '',
    this.minVersion = '',
    this.forceUpdate = false,
    this.message =
        'A new version of BulkMobileMart is available. Please update the app to continue.',
    this.androidStoreUrl =
        'https://play.google.com/store/apps/details?id=com.bulkmobilemart.app',
    this.iosStoreUrl = '',
  });

  final String latestVersion;
  final String minVersion;
  final bool forceUpdate;
  final String message;
  final String androidStoreUrl;
  final String iosStoreUrl;

  factory AppUpdateSettings.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AppUpdateSettings();
    return AppUpdateSettings(
      latestVersion: (json['latestVersion'] as String? ?? '').trim(),
      minVersion: (json['minVersion'] as String? ?? '').trim(),
      forceUpdate: json['forceUpdate'] == true,
      message: (json['message'] as String? ??
              'A new version of BulkMobileMart is available. Please update the app to continue.')
          .trim(),
      androidStoreUrl: (json['androidStoreUrl'] as String? ??
              'https://play.google.com/store/apps/details?id=com.bulkmobilemart.app')
          .trim(),
      iosStoreUrl: (json['iosStoreUrl'] as String? ?? '').trim(),
    );
  }
}

class StoreSettings {
  const StoreSettings({
    required this.minimumOrderValue,
    required this.minimumShippingCharge,
    required this.shippingSlabs,
    required this.merchantUpiId,
    required this.merchantUpiName,
    required this.merchantUpiAccounts,
    this.cartNoticeEn = const [],
    this.cartNoticeHi = const [],
    this.appUpdate = const AppUpdateSettings(),
  });

  final double minimumOrderValue;
  final double minimumShippingCharge;
  final List<StoreShippingSlab> shippingSlabs;
  final String merchantUpiId;
  final String merchantUpiName;
  final List<MerchantUpiAccount> merchantUpiAccounts;
  final List<String> cartNoticeEn;
  final List<String> cartNoticeHi;
  final AppUpdateSettings appUpdate;

  List<MerchantUpiAccount> get enabledMerchantUpiAccounts => merchantUpiAccounts
      .where((account) => account.enabled && account.upiId.isNotEmpty)
      .toList();

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    final slabs = (json['shippingSlabs'] as List<dynamic>? ?? [])
        .map((item) => StoreShippingSlab.fromJson(item as Map<String, dynamic>))
        .toList();

    final accounts = (json['merchantUpiAccounts'] as List<dynamic>? ?? [])
        .map((item) => MerchantUpiAccount.fromJson(item as Map<String, dynamic>))
        .where((account) => account.upiId.isNotEmpty)
        .toList();

    final legacyUpiId = (json['merchantUpiId'] as String? ?? '').trim();
    final legacyUpiName =
        (json['merchantUpiName'] as String? ?? 'BulkMobileMart').trim();

    final resolvedAccounts = accounts.isNotEmpty
        ? accounts
        : legacyUpiId.isNotEmpty
            ? [
                MerchantUpiAccount(
                  upiId: legacyUpiId,
                  label: legacyUpiName,
                  enabled: true,
                ),
              ]
            : <MerchantUpiAccount>[];

    final appUpdateJson = json['appUpdate'];
    return StoreSettings(
      minimumOrderValue: (json['minimumOrderValue'] as num?)?.toDouble() ?? 3000,
      minimumShippingCharge:
          (json['minimumShippingCharge'] as num?)?.toDouble() ?? 280,
      shippingSlabs: slabs,
      merchantUpiId: legacyUpiId,
      merchantUpiName: legacyUpiName,
      merchantUpiAccounts: resolvedAccounts,
      cartNoticeEn: (json['cartNoticeEn'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      cartNoticeHi: (json['cartNoticeHi'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      appUpdate: AppUpdateSettings.fromJson(
        appUpdateJson is Map<String, dynamic> ? appUpdateJson : null,
      ),
    );
  }
}

class StoreShippingSlab {
  const StoreShippingSlab({
    required this.orderAmount,
    required this.shippingCharge,
  });

  final double orderAmount;
  final double shippingCharge;

  factory StoreShippingSlab.fromJson(Map<String, dynamic> json) {
    return StoreShippingSlab(
      orderAmount: (json['orderAmount'] as num?)?.toDouble() ?? 0,
      shippingCharge: (json['shippingCharge'] as num?)?.toDouble() ?? 0,
    );
  }
}
