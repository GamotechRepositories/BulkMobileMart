import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/utils/product_pricing.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../features/wishlist/wishlist_controller.dart';
import '../../models/product.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/refreshable_body.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../../widgets/product/deal_product_card.dart';

class WishlistScreen extends ConsumerStatefulWidget {
  const WishlistScreen({super.key});

  @override
  ConsumerState<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends ConsumerState<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(wishlistControllerProvider.notifier).loadWishlist());
  }

  Future<void> _handleAdd(Product product, BuildContext context) async {
    final defaults = resolveCartDefaults(product);
    final result = await ref.read(cartControllerProvider.notifier).addToCart(
          product,
          defaults.quantity,
          variantName: defaults.variantName,
          colorName: defaults.colorName,
          flySourceContext: context,
        );
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }

  Future<void> _loadWishlist() async {
    await ref.read(wishlistControllerProvider.notifier).loadWishlist();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final wishlist = ref.watch(wishlistControllerProvider);

    Widget body;
    if (!auth.isLoggedIn) {
      body = RefreshableBody(
        onRefresh: _loadWishlist,
        child: _LoginPrompt(
          onLogin: () => ref.read(authControllerProvider.notifier).openAuthModal(),
        ),
      );
    } else if (wishlist.loading) {
      body = const SkeletonWishlistList();
    } else if (wishlist.items.isEmpty) {
      body = RefreshableBody(
        onRefresh: _loadWishlist,
        child: _EmptyWishlist(onBrowse: () => context.go(RoutePaths.product)),
      );
    } else {
      body = RefreshIndicator(
        onRefresh: _loadWishlist,
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          itemCount: wishlist.items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final product = wishlist.items[index];
            return SizedBox(
              width: DealProductCardDimensions.width,
              height: DealProductCardDimensions.height,
              child: DealProductCard(
                product: product,
                onAdd: (context) => _handleAdd(product, context),
              ),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go(RoutePaths.home),
        ),
        title: const Text('My Wishlist'),
      ),
      body: body,
    );
  }
}

class _LoginPrompt extends StatelessWidget {
  const _LoginPrompt({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'My Wishlist',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Please login to save and view your favourite products.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: onLogin,
              child: const Text('Login / Sign Up'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyWishlist extends StatelessWidget {
  const _EmptyWishlist({required this.onBrowse});

  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Your wishlist is empty',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tap the heart on any product to save it here.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: onBrowse, child: const Text('Browse Products')),
          ],
        ),
      ),
    );
  }
}
