import '../../config/constants.dart';
import '../../config/env.dart';

class UpiPayment {
  UpiPayment._();

  static double getPayableAmount(double orderTotal, String paymentMethod) {
    if (paymentMethod == 'cod') {
      return (orderTotal * AppConstants.codAdvancePercent * 100).round() / 100;
    }
    return (orderTotal * 100).round() / 100;
  }

  static String buildUpiUri(double amount, {String note = 'Order'}) {
    return 'upi://pay?${_buildUpiQuery(amount, note)}';
  }

  static String getQrCodeImageUrl(double amount, {String note = 'Order'}) {
    final uri = buildUpiUri(amount, note: note);
    return 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${Uri.encodeComponent(uri)}';
  }

  static String buildAndroidIntent(double amount, {String note = 'Order'}) {
    final query = _buildUpiQuery(amount, note);
    return 'intent://pay?$query#Intent;scheme=upi;end';
  }

  static String _buildUpiQuery(double amount, String note) {
    final upiId = Env.merchantUpiId.trim();
    final parts = <String>[
      'pa=${Uri.encodeComponent(upiId)}',
      'am=${Uri.encodeComponent(amount.toStringAsFixed(2))}',
      'cu=INR',
    ];

    final merchantName = Env.merchantUpiName.trim();
    if (merchantName.isNotEmpty) {
      parts.insert(1, 'pn=${Uri.encodeComponent(merchantName)}');
    }

    final safeNote = _sanitizeNote(note);
    if (safeNote.isNotEmpty) {
      parts.add('tn=${Uri.encodeComponent(safeNote)}');
    }

    return parts.join('&');
  }

  static String _sanitizeNote(String note) {
    final cleaned = note
        .replaceAll('%', '')
        .replaceAll(RegExp(r'[^\w\s.-]'), '')
        .trim();
    if (cleaned.length <= 40) return cleaned;
    return cleaned.substring(0, 40);
  }

  static bool isValidUpiId(String value) {
    return RegExp(r'^[\w.-]+@[\w.-]+$').hasMatch(value.trim());
  }
}
