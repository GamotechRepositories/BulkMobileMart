import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'upi_payment.dart';

class UpiAppOption {
  const UpiAppOption({
    required this.id,
    required this.label,
    required this.shortLabel,
    required this.color,
    required this.uriPrefix,
  });

  final String id;
  final String label;
  final String shortLabel;
  final Color color;
  final String uriPrefix;

  String buildUri(String query) => '$uriPrefix$query';
}

class UpiAppLauncher {
  UpiAppLauncher._();

  static const options = <UpiAppOption>[
    UpiAppOption(
      id: 'gpay',
      label: 'Google Pay',
      shortLabel: 'GPay',
      color: Color(0xFF4285F4),
      uriPrefix: 'tez://upi/pay?',
    ),
    UpiAppOption(
      id: 'phonepe',
      label: 'PhonePe',
      shortLabel: 'Pe',
      color: Color(0xFF5F259F),
      uriPrefix: 'phonepe://pay?',
    ),
    UpiAppOption(
      id: 'paytm',
      label: 'Paytm',
      shortLabel: 'Tm',
      color: Color(0xFF00BAF2),
      uriPrefix: 'paytmmp://pay?',
    ),
    UpiAppOption(
      id: 'bhim',
      label: 'BHIM UPI',
      shortLabel: 'BHIM',
      color: Color(0xFF0984E3),
      uriPrefix: 'bhim://pay?',
    ),
    UpiAppOption(
      id: 'generic',
      label: 'Other UPI',
      shortLabel: 'UPI',
      color: Color(0xFF6366F1),
      uriPrefix: 'upi://pay?',
    ),
  ];

  static Future<List<UpiAppOption>> detectInstalledApps() async {
    final available = <UpiAppOption>[];
    final primaryApps = options.where((option) => option.id != 'generic');

    for (final option in primaryApps) {
      final canOpen = await canLaunchUrl(Uri.parse('${option.uriPrefix}pa=test@upi'));
      if (canOpen) available.add(option);
    }

    if (available.isNotEmpty) return available;

    // Fallback: show popular UPI apps — installed ones open on tap.
    return primaryApps.toList();
  }

  static Future<bool> launchApp({
    required UpiAppOption app,
    required double amount,
    required String note,
    String? merchantUpiId,
    String? merchantUpiName,
  }) async {
    final query = UpiPayment.buildPaymentQuery(
      amount,
      note,
      merchantUpiId: merchantUpiId,
      merchantUpiName: merchantUpiName,
    );
    if (query.isEmpty) return false;

    final uri = Uri.parse(app.buildUri(query));
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
