import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_decorations.dart';
import '../../config/theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/product.dart';
import '../common/app_network_image.dart';
import 'wishlist_button.dart';

class DealProductCard extends StatelessWidget {
  const DealProductCard({
    super.key,
    required this.product,
    required this.onAdd,
    this.flat = false,
    this.cartQuantity = 0,
    this.onIncrease,
    this.onDecrease,
  });

  final Product product;
  final VoidCallback onAdd;
  final bool flat;
  final int cartQuantity;
  final VoidCallback? onIncrease;
  final VoidCallback? onDecrease;

  @override
  Widget build(BuildContext context) {
    final inStock = product.stock > 0;
    final discount = product.discountedPercent > 0
        ? product.discountedPercent.round()
        : (product.price > 0
            ? (((product.price - product.discountedPrice) / product.price) * 100)
                .round()
            : 0);

    if (flat) {
      return Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildImageSection(context, discount, compact: true, minimal: true),
              const SizedBox(height: 8),
              _buildProductDetails(context, discount, compact: true),
              const SizedBox(height: 8),
              _buildCartAction(inStock),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      width: 152,
      child: DecoratedBox(
        decoration: AppDecorations.card(radius: AppDecorations.radiusMd),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildImageSection(context, discount, scrollCard: true),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildProductDetails(context, discount),
                  const SizedBox(height: 6),
                  _buildCartAction(inStock),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection(
    BuildContext context,
    int discount, {
    bool compact = false,
    bool minimal = false,
    bool scrollCard = false,
  }) {
    if (scrollCard) {
      return ClipRRect(
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppDecorations.radiusMd),
        ),
        child: AspectRatio(
          aspectRatio: 1,
          child: Stack(
            fit: StackFit.expand,
            children: [
              GestureDetector(
                onTap: product.id.length > 10
                    ? () => context.push('/product/${product.id}')
                    : null,
                child: ColoredBox(
                  color: AppColors.mobileSurface,
                  child: product.primaryImage != null
                      ? Padding(
                          padding: const EdgeInsets.all(10),
                          child: AppNetworkImage(
                            imageUrl: product.primaryImage!,
                            width: double.infinity,
                            height: double.infinity,
                            fit: BoxFit.contain,
                            cacheWidth: 152,
                            cacheHeight: 152,
                            errorIcon: Icons.image_outlined,
                          ),
                        )
                      : const Center(
                          child: Icon(
                            Icons.image_outlined,
                            color: AppColors.textMuted,
                            size: 36,
                          ),
                        ),
                ),
              ),
              if (discount > 0)
                Positioned(
                  left: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '-$discount%',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              Positioned(
                right: 6,
                top: 6,
                child: WishlistButton(product: product, size: 26),
              ),
            ],
          ),
        ),
      );
    }

    final imageHeight = compact ? 100.0 : 110.0;
    final imageBg = minimal ? AppColors.mobileSurface : Colors.white;
    return SizedBox(
      height: imageHeight,
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          GestureDetector(
            onTap: product.id.length > 10
                ? () => context.push('/product/${product.id}')
                : null,
            child: Container(
              height: imageHeight,
              width: double.infinity,
              decoration: BoxDecoration(
                color: imageBg,
                borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
              ),
              child: product.primaryImage != null
                  ? Padding(
                      padding: const EdgeInsets.all(8),
                      child: AppNetworkImage(
                        imageUrl: product.primaryImage!,
                        width: double.infinity,
                        height: double.infinity,
                        fit: BoxFit.contain,
                        cacheWidth: 168,
                        cacheHeight: (imageHeight - 16).round(),
                        errorIcon: Icons.image_outlined,
                      ),
                    )
                  : const Center(
                      child: Icon(
                        Icons.image_outlined,
                        color: AppColors.textMuted,
                        size: 40,
                      ),
                    ),
            ),
          ),
          if (discount > 0)
            Positioned(
              left: 0,
              top: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '-$discount%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          Positioned(
            right: 0,
            top: 0,
            child: WishlistButton(product: product, size: 26),
          ),
        ],
      ),
    );
  }

  Widget _buildProductDetails(
    BuildContext context,
    int discount, {
    bool compact = false,
  }) {
    return GestureDetector(
      onTap: product.id.length > 10
          ? () => context.push('/product/${product.id}')
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            product.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: compact ? 11 : 12,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
          SizedBox(height: compact ? 4 : 3),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  formatInr(
                    product.discountedPrice,
                    withDecimals: true,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: compact ? 13 : 14,
                  ),
                ),
              ),
              if (product.price > product.discountedPrice) ...[
                const SizedBox(width: 4),
                Text(
                  formatInr(product.price, withDecimals: true),
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 9,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCartAction(bool inStock) {
    if (cartQuantity > 0) {
      return SizedBox(
        height: 34,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.borderLight),
            borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
            color: Colors.white,
          ),
          child: Row(
            children: [
              _qtyButton(
                onDecrease ?? onAdd,
                label: '−',
              ),
              Expanded(
                child: Center(
                  child: Text(
                    '$cartQuantity',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              _qtyButton(
                inStock ? (onIncrease ?? onAdd) : null,
                label: '+',
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: 34,
      child: ElevatedButton(
        onPressed: inStock ? (onIncrease ?? onAdd) : null,
        style: ElevatedButton.styleFrom(
          elevation: 0,
          padding: EdgeInsets.zero,
          disabledBackgroundColor: AppColors.borderLight,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
          ),
          textStyle: const TextStyle(
            inherit: false,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.4,
          ),
        ),
        child: Text(inStock ? 'ADD' : 'OUT OF STOCK'),
      ),
    );
  }

  Widget _qtyButton(VoidCallback? onTap, {required String label}) {
    return SizedBox(
      width: 36,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
          child: Center(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
