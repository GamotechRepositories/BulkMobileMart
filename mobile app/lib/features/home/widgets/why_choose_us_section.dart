import 'package:flutter/material.dart';

import '../../../config/theme.dart';

class WhyChooseUsSection extends StatelessWidget {
  const WhyChooseUsSection({super.key});

  static const _features = [
    _WhyChooseFeature(
      line1: 'Lowest wholesale rates',
      line2: 'on all accessories',
      color: Color(0xFFF97316),
      iconBg: Color(0xFFFFEDD5),
      icon: Icons.sell_outlined,
    ),
    _WhyChooseFeature(
      line1: 'Genuine products only',
      line2: 'Quality you can trust',
      color: Color(0xFF059669),
      iconBg: Color(0xFFD1FAE5),
      icon: Icons.verified_user_outlined,
    ),
    _WhyChooseFeature(
      line1: 'Buy more, save more',
      line2: 'Extra bulk discounts',
      color: Color(0xFFD97706),
      iconBg: Color(0xFFFEF3C7),
      icon: Icons.inventory_2_outlined,
    ),
    _WhyChooseFeature(
      line1: 'Pan India delivery',
      line2: 'Safe & on-time shipping',
      color: Color(0xFF0284C7),
      iconBg: Color(0xFFE0F2FE),
      icon: Icons.local_shipping_outlined,
    ),
    _WhyChooseFeature(
      line1: '7-day return policy',
      line2: 'Simple & hassle-free',
      color: Color(0xFF7C3AED),
      iconBg: Color(0xFFEDE9FE),
      icon: Icons.replay_outlined,
    ),
    _WhyChooseFeature(
      line1: 'Always here to help',
      line2: 'Quick expert support',
      color: Color(0xFFE11D48),
      iconBg: Color(0xFFFFE4E6),
      icon: Icons.support_agent_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 28, 16, 28),
        child: Column(
          children: [
            Text(
              '— Why Choose Us —',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2.4,
                    fontSize: 11,
                  ),
            ),
            const SizedBox(height: 12),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      fontSize: 22,
                    ),
                children: const [
                  TextSpan(text: 'Why Choose '),
                  TextSpan(
                    text: 'BulkMobileMart?',
                    style: TextStyle(color: AppColors.primary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'We are committed to providing the best quality mobile accessories '
              'at wholesale prices with a seamless shopping experience.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    height: 1.45,
                  ),
            ),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _features.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 1.85,
              ),
              itemBuilder: (context, index) {
                return _WhyChooseCard(feature: _features[index]);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _WhyChooseFeature {
  const _WhyChooseFeature({
    required this.line1,
    required this.line2,
    required this.color,
    required this.iconBg,
    required this.icon,
  });

  final String line1;
  final String line2;
  final Color color;
  final Color iconBg;
  final IconData icon;
}

class _WhyChooseCard extends StatelessWidget {
  const _WhyChooseCard({required this.feature});

  final _WhyChooseFeature feature;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: feature.iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(feature.icon, color: feature.color, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  feature.line1,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  feature.line2,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    height: 1.2,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 20,
                  height: 2,
                  decoration: BoxDecoration(
                    color: feature.color,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
