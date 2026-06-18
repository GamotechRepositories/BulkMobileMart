class StoreSettings {
  const StoreSettings({
    required this.minimumOrderValue,
    required this.minimumShippingCharge,
    required this.shippingSlabs,
    required this.merchantUpiId,
    required this.merchantUpiName,
    this.cartNoticeEn = const [],
    this.cartNoticeHi = const [],
  });

  final double minimumOrderValue;
  final double minimumShippingCharge;
  final List<StoreShippingSlab> shippingSlabs;
  final String merchantUpiId;
  final String merchantUpiName;
  final List<String> cartNoticeEn;
  final List<String> cartNoticeHi;

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    final slabs = (json['shippingSlabs'] as List<dynamic>? ?? [])
        .map((item) => StoreShippingSlab.fromJson(item as Map<String, dynamic>))
        .toList();

    return StoreSettings(
      minimumOrderValue: (json['minimumOrderValue'] as num?)?.toDouble() ?? 3000,
      minimumShippingCharge:
          (json['minimumShippingCharge'] as num?)?.toDouble() ?? 280,
      shippingSlabs: slabs,
      merchantUpiId: (json['merchantUpiId'] as String? ?? '').trim(),
      merchantUpiName:
          (json['merchantUpiName'] as String? ?? 'BulkMobileMart').trim(),
      cartNoticeEn: (json['cartNoticeEn'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      cartNoticeHi: (json['cartNoticeHi'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
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
