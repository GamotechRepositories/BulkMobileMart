import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/order_settings.dart';
import '../../settings/store_settings_provider.dart';

class HomeTrustStrip extends ConsumerWidget {
  const HomeTrustStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = mergeStoreSettings(ref.watch(storeSettingsProvider).value);
    final minShipping = formatInr(settings.minimumShippingCharge);

    final items = [
      (
        icon: Icons.local_shipping_outlined,
        title: 'Shipping',
        subtitle: 'From $minShipping',
      ),
      (
        icon: Icons.replay_outlined,
        title: '7-Day Returns',
        subtitle: 'Easy returns',
      ),
      (
        icon: Icons.verified_user_outlined,
        title: 'Secure Pay',
        subtitle: '100% safe',
      ),
      (
        icon: Icons.headset_mic_outlined,
        title: '24/7 Support',
        subtitle: 'We help you',
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              Container(
                width: 1,
                height: 32,
                color: AppColors.borderLight,
              ),
            Expanded(child: _TrustItem(item: items[i])),
          ],
        ],
      ),
    );
  }
}

class _TrustItem extends StatelessWidget {
  const _TrustItem({required this.item});

  final ({IconData icon, String title, String subtitle}) item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          Icon(item.icon, color: AppColors.primary, size: 22),
          const SizedBox(height: 6),
          Text(
            item.title,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          Text(
            item.subtitle,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
