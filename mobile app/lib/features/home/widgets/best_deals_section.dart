import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../features/auth/auth_controller.dart';
import '../../../features/cart/cart_controller.dart';
import '../../../models/product.dart';
import '../../../widgets/common/section_header.dart';
import '../../../widgets/common/skeleton_loaders.dart';
import '../../../widgets/product/deal_product_card.dart';
import '../home_fallback_data.dart';
import '../home_providers.dart';
import 'deals_countdown_timer.dart';
import 'home_section_card.dart';

class BestDealsSection extends ConsumerWidget {
  const BestDealsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(homeDealsProvider);

    return productsAsync.when(
      loading: () => const HomeSectionCard(
        child: Column(
          children: [
            SkeletonBox(width: 220, height: 22, borderRadius: 6),
            SizedBox(height: 12),
            SkeletonDealRow(),
          ],
        ),
      ),
      error: (_, __) => _DealsContent(products: fallbackHomeProducts()),
      data: (products) {
        final display =
            products.isEmpty ? fallbackHomeProducts() : products.take(12).toList();
        return _DealsContent(products: display);
      },
    );
  }
}

class _DealsContent extends ConsumerWidget {
  const _DealsContent({required this.products});

  final List<Product> products;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return HomeSectionCard(
      margin: const EdgeInsets.fromLTRB(0, 4, 0, 4),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      showDivider: true,
      child: Column(
        children: [
          SectionHeader(
            title: 'Deals of the Day',
            subtitle: 'Limited-time wholesale prices',
            dense: true,
            trailing: const DealsCountdownTimer(),
          ),
          SizedBox(
            height: 272,
            child: ListView.separated(
              primary: false,
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              cacheExtent: 320,
              addAutomaticKeepAlives: false,
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final product = products[index];
                return DealProductCard(
                  product: product,
                  flat: true,
                  onAdd: () async {
                    if (isFallbackProductId(product.id)) return;
                    final result = await ref
                        .read(cartControllerProvider.notifier)
                        .addToCart(product, 1);
                    if (result == AddToCartResult.requiresLogin && context.mounted) {
                      ref.read(authControllerProvider.notifier).openAuthModal();
                    }
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
