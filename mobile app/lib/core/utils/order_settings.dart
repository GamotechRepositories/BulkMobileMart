import 'package:intl/intl.dart';

import '../../models/store_settings.dart';

const _defaultMinimumOrderValue = 3000.0;
const _defaultMinimumShippingCharge = 280.0;

const _defaultShippingSlabs = [
  StoreShippingSlab(orderAmount: 3000, shippingCharge: 280),
  StoreShippingSlab(orderAmount: 5000, shippingCharge: 350),
  StoreShippingSlab(orderAmount: 8000, shippingCharge: 550),
  StoreShippingSlab(orderAmount: 12000, shippingCharge: 800),
];

const _defaultCartNoticeEn = [
  'Please Verify Your Address Before Placing Your Order.',
  'Minimum order value ₹{{minOrder}}',
  'Parcel opening video is must for return.',
  'Shipping depends on parcel weight minimum Rs {{minShipping}}.',
  'User have to pay shipping charges in advance.',
];

const _defaultCartNoticeHi = [
  'कृपया अपना पूरा पता ठीक से लिखें ऑर्डर करने से पहले। इसके बाद ऑर्डर करें।',
  'न्यूनतम ऑर्डर मूल्य {{minOrder}}.',
  'पार्सल वापसी के लिए पार्सल खोलने का वीडियो अनिवार्य है।',
  'शिपिंग पार्सल के वजन पर निर्भर करता है न्यूनतम {{minShipping}}/',
  'उपयोगकर्ता को शिपिंग शुल्क अग्रिम रूप से देना होगा।',
];

final _amountFormatter = NumberFormat.decimalPattern('en_IN');

List<StoreShippingSlab> normalizeShippingSlabs(List<StoreShippingSlab>? slabs) {
  final normalized = (slabs ?? const <StoreShippingSlab>[])
      .where(
        (slab) =>
            slab.orderAmount.isFinite &&
            slab.shippingCharge.isFinite &&
            slab.orderAmount >= 0 &&
            slab.shippingCharge >= 0,
      )
      .toList()
    ..sort((a, b) => a.orderAmount.compareTo(b.orderAmount));
  return normalized;
}

StoreSettings mergeStoreSettings(StoreSettings? settings) {
  final source = settings;
  final slabs = normalizeShippingSlabs(source?.shippingSlabs);
  return StoreSettings(
    minimumOrderValue: source?.minimumOrderValue ?? _defaultMinimumOrderValue,
    minimumShippingCharge:
        source?.minimumShippingCharge ?? _defaultMinimumShippingCharge,
    shippingSlabs: slabs.isNotEmpty ? slabs : _defaultShippingSlabs,
    merchantUpiId: source?.merchantUpiId ?? '',
    merchantUpiName: source?.merchantUpiName ?? 'BulkMobileMart',
    merchantUpiAccounts: source?.merchantUpiAccounts ?? const [],
    cartNoticeEn: source?.cartNoticeEn.isNotEmpty == true
        ? source!.cartNoticeEn
        : _defaultCartNoticeEn,
    cartNoticeHi: source?.cartNoticeHi.isNotEmpty == true
        ? source!.cartNoticeHi
        : _defaultCartNoticeHi,
    appUpdate: source?.appUpdate ?? const AppUpdateSettings(),
  );
}

/// Matches website/backend `calculateShippingCharge` (slab-based, not free).
double calculateShippingCharge(num subtotal, StoreSettings? settings) {
  final amount = subtotal.toDouble();
  final merged = mergeStoreSettings(settings);
  final minShipping = merged.minimumShippingCharge;
  final slabs = merged.shippingSlabs;

  if (slabs.isEmpty) return minShipping;

  var charge = minShipping;
  for (final slab in slabs) {
    if (amount >= slab.orderAmount) {
      charge = slab.shippingCharge;
    }
  }
  return charge;
}

String _formatAmount(num amount) {
  return _amountFormatter.format(amount);
}

String _interpolateNoticeLine(String line, StoreSettings settings) {
  return line
      .replaceAll('{{minOrder}}', _formatAmount(settings.minimumOrderValue))
      .replaceAll(
        '{{minShipping}}',
        _formatAmount(settings.minimumShippingCharge),
      );
}

List<String> buildCartNoticeBullets(StoreSettings? settings, {String language = 'en'}) {
  final merged = mergeStoreSettings(settings);
  final lines = language == 'hi' ? merged.cartNoticeHi : merged.cartNoticeEn;
  return lines.map((line) => _interpolateNoticeLine(line, merged)).toList();
}
