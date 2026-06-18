import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/product_pricing.dart';
import '../../../features/auth/auth_controller.dart';
import '../../../features/cart/cart_controller.dart';
import '../../../models/cart_item.dart';
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

  CartItem? _cartLine(List<CartItem> items, Product product) {
    final defaults = resolveCartDefaults(product);
    for (final item in items) {
      if (item.id != product.id) continue;
      if (item.variantName.trim() != defaults.variantName.trim()) continue;
      if (item.colorName.trim() != defaults.colorName.trim()) continue;
      return item;
    }
    return null;
  }

  Future<void> _handleAdd(WidgetRef ref, Product product, BuildContext context) async {
    if (isFallbackProductId(product.id)) return;
    final defaults = resolveCartDefaults(product);
    final result = await ref.read(cartControllerProvider.notifier).addToCart(
          product,
          defaults.quantity,
          variantName: defaults.variantName,
          colorName: defaults.colorName,
          flySourceContext: context,
        );
    if (result == AddToCartResult.requiresLogin) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }

  Future<void> _handleIncrease(WidgetRef ref, Product product) async {
    if (isFallbackProductId(product.id)) return;
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLine(cartItems, product);
    if (line == null) {
      final defaults = resolveCartDefaults(product);
      final result = await ref.read(cartControllerProvider.notifier).addToCart(
            product,
            defaults.quantity,
            variantName: defaults.variantName,
            colorName: defaults.colorName,
          );
      if (result == AddToCartResult.requiresLogin) {
        ref.read(authControllerProvider.notifier).openAuthModal();
      }
      return;
    }
    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: line.quantity + 1,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

  Future<void> _handleDecrease(WidgetRef ref, Product product) async {
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLine(cartItems, product);
    if (line == null) return;

    if (line.quantity <= 1) {
      await ref.read(cartControllerProvider.notifier).removeFromCartLine(
            productId: product.id,
            variantName: line.variantName,
            colorName: line.colorName,
          );
      return;
    }

    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: line.quantity - 1,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

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
            height: DealProductCardDimensions.height,
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
                return Align(
                  alignment: Alignment.topCenter,
                  child: _DealCardWithCart(
                    product: product,
                    onAdd: (context) => _handleAdd(ref, product, context),
                    onIncrease: () => _handleIncrease(ref, product),
                    onDecrease: () => _handleDecrease(ref, product),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _DealCardWithCart extends ConsumerWidget {
  const _DealCardWithCart({
    required this.product,
    required this.onAdd,
    required this.onIncrease,
    required this.onDecrease,
  });

  final Product product;
  final void Function(BuildContext context) onAdd;
  final VoidCallback onIncrease;
  final VoidCallback onDecrease;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final qty = ref.watch(cartProductQuantityProvider(product));

    return DealProductCard(
      product: product,
      cartQuantity: qty,
      onAdd: onAdd,
      onIncrease: onIncrease,
      onDecrease: onDecrease,
    );
  }
}
