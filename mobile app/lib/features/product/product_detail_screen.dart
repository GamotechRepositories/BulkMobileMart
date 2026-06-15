import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/product_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../features/product/product_providers.dart';
import '../../models/product.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/app_network_image.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../../widgets/product/product_share_sheet.dart';
import '../../widgets/product/wishlist_button.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _quantity = AppConstants.moq;
  String _activeTab = 'description';

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productDetailProvider(widget.productId));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go(RoutePaths.home),
        ),
        title: const Text('Product Details'),
      ),
      body: productAsync.when(
        loading: () => const SkeletonProductDetail(),
        error: (_, __) => _ErrorView(onBack: () => context.go(RoutePaths.product)),
        data: (product) => _buildContent(context, product),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Product product) {
    final inStock = product.stock > 0;
    final maxQuantity =
        inStock ? (product.stock > AppConstants.moq ? product.stock : AppConstants.moq) : AppConstants.moq;
    final images = product.productImages;
    final bulkTiers = getBulkTiers(product.discountedPrice);
    final category = product.categories.isNotEmpty ? product.categories.first : 'Products';
    final rating = product.ratings > 0 ? product.ratings : 4.5;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _ProductImageGallery(images: images),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          productSku(product),
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  WishlistButton(product: product, size: 40),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => showProductShareSheet(context, product),
                    icon: const Icon(Icons.share_outlined),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  ...List.generate(5, (index) => Icon(
                        index < rating.floor() ? Icons.star : Icons.star_border,
                        color: AppColors.primary,
                        size: 18,
                      )),
                  const SizedBox(width: 8),
                  Text(
                    '${rating.toStringAsFixed(1)} ($defaultReviewCount)',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                formatInr(product.discountedPrice, withDecimals: true),
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              if (product.price > product.discountedPrice)
                Text(
                  formatInr(product.price, withDecimals: true),
                  style: const TextStyle(
                    decoration: TextDecoration.lineThrough,
                    color: AppColors.textMuted,
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                inStock ? 'In Stock (${product.stock} available)' : 'Out of Stock',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: inStock ? Colors.green.shade700 : Colors.red,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Pan-India delivery available for bulk orders.',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.mobileSurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bulk pricing', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    ...bulkTiers.map(
                      (tier) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(tier.qtyLabel),
                            Text(
                              formatInr(tier.price, withDecimals: true),
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Quantity (Pieces)', style: TextStyle(fontWeight: FontWeight.w600)),
                  _QuantitySelector(
                    quantity: _quantity,
                    min: AppConstants.moq,
                    max: maxQuantity,
                    disabled: !inStock,
                    onDecrease: () => setState(() {
                      if (_quantity > AppConstants.moq) _quantity--;
                    }),
                    onIncrease: () => setState(() {
                      if (_quantity < maxQuantity) _quantity++;
                    }),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  _TabChip(
                    label: 'Description',
                    selected: _activeTab == 'description',
                    onTap: () => setState(() => _activeTab = 'description'),
                  ),
                  _TabChip(
                    label: 'Specifications',
                    selected: _activeTab == 'specifications',
                    onTap: () => setState(() => _activeTab = 'specifications'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_activeTab == 'description')
                Text(
                  product.description.isNotEmpty
                      ? product.description
                      : 'No description available.',
                  style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _specRow('Brand', product.brandName),
                    _specRow('Category', category),
                    _specRow('Subcategory', product.subcategory),
                    if (product.warranty.isNotEmpty) _specRow('Warranty', product.warranty),
                    ...product.features.map((f) => _specRow('Feature', f)),
                  ],
                ),
              const SizedBox(height: 100),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.borderLight)),
          ),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: inStock ? () => _addToCart(product) : null,
                  child: const Text('Add to Cart'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: inStock ? () => _buyNow(product) : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Buy Now', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _specRow(String label, String value) {
    if (value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: const TextStyle(color: AppColors.textMuted)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Future<void> _addToCart(Product product) async {
    final result = await ref
        .read(cartControllerProvider.notifier)
        .addToCart(product, _quantity);
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }

  Future<void> _buyNow(Product product) async {
    final result = await ref.read(cartControllerProvider.notifier).addToCart(
          product,
          _quantity,
          buyNow: true,
        );
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }
}

class _QuantitySelector extends StatelessWidget {
  const _QuantitySelector({
    required this.quantity,
    required this.min,
    required this.max,
    required this.disabled,
    required this.onDecrease,
    required this.onIncrease,
  });

  final int quantity;
  final int min;
  final int max;
  final bool disabled;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.borderLight),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _qtyButton(onDecrease, disabled || quantity <= min, '−'),
          Container(
            width: 40,
            alignment: Alignment.center,
            child: Text('$quantity', style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          _qtyButton(onIncrease, disabled || quantity >= max, '+'),
        ],
      ),
    );
  }

  Widget _qtyButton(VoidCallback onTap, bool disabled, String label) {
    return InkWell(
      onTap: disabled ? null : onTap,
      child: SizedBox(
        width: 36,
        height: 36,
        child: Center(child: Text(label, style: const TextStyle(fontSize: 18))),
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.primary.withValues(alpha: 0.15),
      checkmarkColor: AppColors.primary,
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Product not found.'),
          const SizedBox(height: 12),
          TextButton(onPressed: onBack, child: const Text('Back to products')),
        ],
      ),
    );
  }
}

class _ProductImageGallery extends StatefulWidget {
  const _ProductImageGallery({required this.images});

  final List<String> images;

  @override
  State<_ProductImageGallery> createState() => _ProductImageGalleryState();
}

class _ProductImageGalleryState extends State<_ProductImageGallery> {
  int _activeImage = 0;

  @override
  Widget build(BuildContext context) {
    final images = widget.images;

    return RepaintBoundary(
      child: Column(
        children: [
          Container(
            height: 280,
            decoration: BoxDecoration(
              color: AppColors.mobileSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: images.isNotEmpty
                ? AppNetworkImage(
                    imageUrl: images[_activeImage.clamp(0, images.length - 1)],
                    fit: BoxFit.contain,
                    cacheWidth: 560,
                    cacheHeight: 560,
                    errorIcon: Icons.image_outlined,
                    errorIconSize: 64,
                  )
                : const Icon(Icons.image_outlined, size: 64, color: AppColors.textMuted),
          ),
          if (images.length > 1) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: images.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final selected = index == _activeImage;
                  return GestureDetector(
                    onTap: () => setState(() => _activeImage = index),
                    child: Container(
                      width: 64,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: selected ? AppColors.primary : AppColors.borderLight,
                          width: selected ? 2 : 1,
                        ),
                      ),
                      child: AppNetworkImage(
                        imageUrl: images[index],
                        fit: BoxFit.contain,
                        width: 64,
                        height: 64,
                        cacheWidth: 128,
                        cacheHeight: 128,
                        errorIcon: Icons.image_outlined,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
