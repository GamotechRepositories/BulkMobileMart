import 'package:flutter/material.dart';

import '../../../config/theme.dart';

class WhyChooseUsSection extends StatelessWidget {
  const WhyChooseUsSection({super.key});

  static const _features = [
    (
      title: 'Best Wholesale Prices',
      line1: 'Lowest wholesale rates',
      line2: 'on all accessories',
      color: Color(0xFFFF7A00),
      icon: Icons.sell_outlined,
    ),
    (
      title: '100% Original Products',
      line1: 'Genuine products only',
      line2: 'Quality you can trust',
      color: Color(0xFF10B981),
      icon: Icons.verified_user_outlined,
    ),
    (
      title: 'Bulk Orders, Bigger Savings',
      line1: 'Buy more, save more',
      line2: 'Extra bulk discounts',
      color: Color(0xFFF59E0B),
      icon: Icons.inventory_2_outlined,
    ),
    (
      title: 'Fast & Safe Delivery',
      line1: 'Pan India delivery',
      line2: 'Safe & on-time shipping',
      color: Color(0xFF0EA5E9),
      icon: Icons.local_shipping_outlined,
    ),
    (
      title: 'Easy Returns',
      line1: '7-day return policy',
      line2: 'Simple & hassle-free',
      color: Color(0xFF8B5CF6),
      icon: Icons.replay_outlined,
    ),
    (
      title: 'Dedicated Support',
      line1: 'Always here to help',
      line2: 'Quick expert support',
      color: Color(0xFFF43F5E),
      icon: Icons.support_agent_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
      child: Column(
        children: [
          Text(
            '— Why Choose Us —',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2,
                ),
          ),
          const SizedBox(height: 12),
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
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
            'We are committed to providing the best quality mobile accessories at wholesale prices with a seamless shopping experience.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          const SizedBox(height: 20),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _features.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.15,
            ),
            itemBuilder: (context, index) {
              final feature = _features[index];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      backgroundColor: feature.color.withValues(alpha: 0.12),
                      child: Icon(feature.icon, color: feature.color, size: 20),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      feature.line1,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      feature.line2,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
