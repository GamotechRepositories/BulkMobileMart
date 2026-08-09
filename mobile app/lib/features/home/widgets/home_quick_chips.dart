import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_decorations.dart';
import '../../../config/constants.dart';
import '../../../config/theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/order_settings.dart';
import '../../settings/store_settings_provider.dart';

class HomeQuickChips extends ConsumerWidget {
  const HomeQuickChips({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = mergeStoreSettings(ref.watch(storeSettingsProvider).value);
    final minShipping = formatInr(settings.minimumShippingCharge);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: SingleChildScrollView(
        primary: false,
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _Chip(
              icon: Icons.inventory_2_outlined,
              label: 'MOQ ${AppConstants.moq} pcs',
            ),
            const SizedBox(width: 8),
            _Chip(
              icon: Icons.local_shipping_outlined,
              label: 'Ship from $minShipping',
            ),
            const SizedBox(width: 8),
            const _Chip(
              icon: Icons.verified_outlined,
              label: '100% Genuine',
            ),
            const SizedBox(width: 8),
            const _Chip(
              icon: Icons.storefront_outlined,
              label: 'Wholesale Rates',
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: AppDecorations.pill(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
