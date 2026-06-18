import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/product_pricing.dart';
import '../../core/utils/product_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../features/product/product_providers.dart';
import '../../models/product.dart';
import '../../models/product_pricing_models.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/app_network_image.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../../widgets/product/product_price_display.dart';
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
  int _quantity = defaultSingleMoq;
  String _activeTab = 'description';
  String _selectedVariant = '';
  String _selectedColor = '';
  String? _quantitySyncedKey;

  static const _tabs = [
    _DetailTab(id: 'description', label: 'Description'),
    _DetailTab(id: 'specifications', label: 'Specifications'),
    _DetailTab(id: 'reviews', label: 'Reviews'),
    _DetailTab(id: 'shipping', label: 'Shipping'),
  ];

  @override
  void didUpdateWidget(covariant ProductDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.productId != widget.productId) {
      _quantitySyncedKey = null;
      _selectedVariant = '';
      _selectedColor = '';
      _quantity = defaultSingleMoq;
      _activeTab = 'description';
    }
  }

  void _syncQuantityForProduct(
    Product product,
    String activeVariantName,
    int? cartLineQuantity,
  ) {
    final key =
        '${widget.productId}|$activeVariantName|$_selectedColor|${cartLineQuantity ?? 'local'}';
    if (_quantitySyncedKey == key) return;
    _quantitySyncedKey = key;

    final minOrderQuantity = getMinOrderQuantity(product, activeVariantName);
    final maxQuantity = getMaxOrderQuantity(product, activeVariantName);
    final nextQuantity = cartLineQuantity ?? minOrderQuantity;
    final clamped = nextQuantity.clamp(minOrderQuantity, maxQuantity);

    if (_quantity != clamped) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() => _quantity = clamped);
      });
    }
  }

  void _handleVariantChange(Product product, String variantName) {
    setState(() {
      _selectedVariant = variantName;
      _quantitySyncedKey = null;
      final minOrderQuantity = getMinOrderQuantity(product, variantName);
      _quantity = minOrderQuantity;
      final colors = getAvailableColors(product, variantName);
      _selectedColor = colors.isNotEmpty ? colors.first.name : '';
    });
  }

  void _initSelectionsForProduct(Product product) {
    if (!mounted) return;

    var changed = false;
    if (isMultiVariant(product) && _selectedVariant.isEmpty) {
      _selectedVariant = product.variants.first.name;
      changed = true;
    }

    final activeVariant =
        resolveActiveVariantName(product, _selectedVariant);
    final colors = getAvailableColors(product, activeVariant);
    if (_selectedColor.isEmpty && colors.isNotEmpty) {
      _selectedColor = colors.first.name;
      changed = true;
    }

    if (changed) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productDetailProvider(widget.productId));

    ref.listen(productDetailProvider(widget.productId), (previous, next) {
      next.whenData(_initSelectionsForProduct);
    });

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
        error: (_, _) => _ErrorView(onBack: () => context.go(RoutePaths.product)),
        data: (product) => _buildContent(context, product),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Product product) {
    final activeVariantName = resolveActiveVariantName(product, _selectedVariant);
    final cartLineQuantity = ref.watch(
      cartControllerProvider.select(
        (state) => findCartLine(
          state.items,
          product.id,
          activeVariantName,
          _selectedColor,
        )?.quantity,
      ),
    );
    _syncQuantityForProduct(product, activeVariantName, cartLineQuantity);

    final variantStock = getVariantStock(product, activeVariantName);
    final inStock = variantStock > 0;
    final minOrderQuantity = getMinOrderQuantity(product, activeVariantName);
    final maxQuantity = getMaxOrderQuantity(product, activeVariantName);
    final currentUnitPrice =
        getUnitPriceForQuantity(product, _quantity, activeVariantName);
    final bulkTiers = getBulkTierRows(product, activeVariantName);
    final showBulkSection = isBulkPricing(product, activeVariantName);
    final images = product.productImages
        .where((image) => image.trim().isNotEmpty)
        .toList();
    final rating = product.ratings > 0 ? product.ratings : 4.5;
    final availableColors = getAvailableColors(product, activeVariantName);
    final specifications = getResolvedSpecifications(product);
    final inCart = cartLineQuantity != null;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _ProductImageGallery(
                images: images,
                product: product,
              ),
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
              ProductPriceDisplay(
                product: product,
                variantName: activeVariantName,
                size: ProductPriceSize.lg,
              ),
              if (isMultiVariant(product)) ...[
                const SizedBox(height: 16),
                const Text(
                  'Select variant',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: product.variants.map((variant) {
                    final isActive = activeVariantName == variant.name;
                    return ChoiceChip(
                      label: Text(variant.name),
                      selected: isActive,
                      onSelected: (_) => _handleVariantChange(product, variant.name),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: isActive ? Colors.white : AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    );
                  }).toList(),
                ),
              ],
              if (availableColors.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Select color',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: availableColors
                      .map(
                        (color) => ChoiceChip(
                          label: Text(color.name),
                          selected: _selectedColor == color.name,
                          onSelected: (_) => setState(() {
                            _selectedColor = color.name;
                            _quantitySyncedKey = null;
                          }),
                          selectedColor: AppColors.primary.withValues(alpha: 0.12),
                          backgroundColor: AppColors.mobileSurface,
                          labelStyle: TextStyle(
                            color: _selectedColor == color.name
                                ? AppColors.primary
                                : AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                      .toList(),
                ),
              ],
              if (showBulkSection)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'Current selection: ${formatInr(currentUnitPrice, withDecimals: true)} / piece',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              if (showBulkSection || isMultiVariant(product))
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    [
                      if (showBulkSection) 'MOQ: $minOrderQuantity Pieces',
                      if (isMultiVariant(product)) 'Stock: $variantStock',
                    ].join(' · '),
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Quantity (Pieces)', style: TextStyle(fontWeight: FontWeight.w600)),
                  _QuantitySelector(
                    quantity: _quantity,
                    min: minOrderQuantity,
                    max: maxQuantity,
                    disabled: !inStock,
                    onDecrease: () => _handleQuantityDecrease(product, activeVariantName),
                    onIncrease: () => _handleQuantityIncrease(product, activeVariantName),
                  ),
                ],
              ),
              if (bulkTiers.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.borderLight),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Bulk Price (Per Piece)',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      ...bulkTiers.map(
                        (tier) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(child: Text(tier.qtyLabel)),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (tier.hasDiscount && tier.originalPrice != null) ...[
                                    Text(
                                      formatInr(tier.originalPrice!, withDecimals: true),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textMuted,
                                        decoration: TextDecoration.lineThrough,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  Text(
                                    formatInr(tier.price, withDecimals: true),
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              const Divider(height: 1, color: AppColors.borderLight),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _tabs.map((tab) {
                    final selected = _activeTab == tab.id;
                    final label = tab.id == 'reviews'
                        ? 'Reviews ($defaultReviewCount)'
                        : tab.label;
                    return Padding(
                      padding: const EdgeInsets.only(right: 20),
                      child: InkWell(
                        onTap: () => setState(() => _activeTab = tab.id),
                        child: Container(
                          padding: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: selected ? AppColors.primary : Colors.transparent,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            label,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),
              _buildTabContent(product, rating, specifications),
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
                child: Builder(
                  builder: (btnContext) => ElevatedButton(
                    onPressed: inStock
                        ? () {
                            if (inCart) {
                              context.go(RoutePaths.cart);
                              return;
                            }
                            _addToCart(product, activeVariantName, btnContext);
                          }
                        : null,
                    child: Text(inCart ? 'Go to Cart' : 'Add to Cart'),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: inStock ? () => _buyNow(product, activeVariantName) : null,
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

  Widget _buildTabContent(
    Product product,
    double rating,
    List<ProductSpecification> specifications,
  ) {
    switch (_activeTab) {
      case 'specifications':
        if (specifications.isEmpty) {
          return const Text(
            'No specifications added.',
            style: TextStyle(color: AppColors.textSecondary, height: 1.5),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: specifications
              .map(
                (spec) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        height: 1.5,
                        fontSize: 14,
                      ),
                      children: [
                        TextSpan(
                          text: '${spec.name}: ',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        TextSpan(text: spec.value),
                      ],
                    ),
                  ),
                ),
              )
              .toList(),
        );
      case 'reviews':
        return Text(
          'Rated ${rating.toStringAsFixed(1)} out of 5 based on $defaultReviewCount dealer reviews.',
          style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
        );
      case 'shipping':
        return const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pan-India delivery available for bulk orders.',
              style: TextStyle(color: AppColors.textPrimary, height: 1.5),
            ),
            SizedBox(height: 8),
            Text(
              'GST invoice provided with every order.',
              style: TextStyle(color: AppColors.textPrimary, height: 1.5),
            ),
            SizedBox(height: 8),
            Text(
              'Standard delivery: 3–7 business days across major cities.',
              style: TextStyle(color: AppColors.textPrimary, height: 1.5),
            ),
          ],
        );
      case 'description':
      default:
        final description = product.description.trim().isNotEmpty
            ? product.description
            : '${product.name} supports fast charging for all devices. Safe, reliable & high performance with premium build quality.';
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              description,
              style: const TextStyle(color: AppColors.textPrimary, height: 1.5),
            ),
            if (product.features.isNotEmpty) ...[
              const SizedBox(height: 12),
              ...product.features.map(
                (feature) => Padding(
                  padding: const EdgeInsets.only(bottom: 6, left: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontWeight: FontWeight.w700)),
                      Expanded(child: Text(feature)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        );
    }
  }

  Future<void> _handleQuantityDecrease(
    Product product,
    String activeVariantName,
  ) async {
    final minOrderQuantity = getMinOrderQuantity(product, activeVariantName);
    final line = findCartLine(
      ref.read(cartControllerProvider).items,
      product.id,
      activeVariantName,
      _selectedColor,
    );

    if (line != null) {
      final nextQty = getDecreasedCartQuantity(line.quantity, minOrderQuantity);
      if (nextQty <= 0) {
        await ref.read(cartControllerProvider.notifier).removeFromCartLine(
              productId: product.id,
              variantName: activeVariantName,
              colorName: _selectedColor,
            );
      } else {
        await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
              productId: product.id,
              quantity: nextQty,
              variantName: activeVariantName,
              colorName: _selectedColor,
            );
      }
      return;
    }

    setState(() {
      _quantity = (_quantity - minOrderQuantity).clamp(minOrderQuantity, _quantity);
    });
  }

  Future<void> _handleQuantityIncrease(
    Product product,
    String activeVariantName,
  ) async {
    final minOrderQuantity = getMinOrderQuantity(product, activeVariantName);
    final maxQuantity = getMaxOrderQuantity(product, activeVariantName);
    final line = findCartLine(
      ref.read(cartControllerProvider).items,
      product.id,
      activeVariantName,
      _selectedColor,
    );

    if (line != null) {
      final nextQty = (line.quantity + minOrderQuantity).clamp(minOrderQuantity, maxQuantity);
      await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
            productId: product.id,
            quantity: nextQty,
            variantName: activeVariantName,
            colorName: _selectedColor,
          );
      return;
    }

    setState(() {
      _quantity = (_quantity + minOrderQuantity).clamp(minOrderQuantity, maxQuantity);
    });
  }

  Future<void> _addToCart(
    Product product,
    String activeVariantName,
    BuildContext flySourceContext,
  ) async {
    final availableColors = getAvailableColors(product, activeVariantName);
    if (availableColors.isNotEmpty && _selectedColor.isEmpty) return;

    final result = await ref.read(cartControllerProvider.notifier).addToCart(
          product,
          _quantity,
          variantName: activeVariantName,
          colorName: _selectedColor,
          flySourceContext: flySourceContext,
        );
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }

  Future<void> _buyNow(Product product, String activeVariantName) async {
    final availableColors = getAvailableColors(product, activeVariantName);
    if (availableColors.isNotEmpty && _selectedColor.isEmpty) return;

    final result = await ref.read(cartControllerProvider.notifier).addToCart(
          product,
          _quantity,
          buyNow: true,
          variantName: activeVariantName,
          colorName: _selectedColor,
        );
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }
}

class _DetailTab {
  const _DetailTab({required this.id, required this.label});

  final String id;
  final String label;
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

class _ProductImageGallery extends StatefulWidget {
  const _ProductImageGallery({
    required this.images,
    required this.product,
  });

  final List<String> images;
  final Product product;

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
          Stack(
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
              Positioned(
                left: 8,
                top: 8,
                child: WishlistButton(product: widget.product, size: 40),
              ),
            ],
          ),
          if (images.length > 1) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: images.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
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
