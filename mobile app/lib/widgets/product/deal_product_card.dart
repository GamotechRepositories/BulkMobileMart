import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_decorations.dart';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../common/app_network_image.dart';
import 'product_price_display.dart';
import 'wishlist_button.dart';

/// Fixed dimensions so every product card is identical in grids and carousels.
class DealProductCardDimensions {
  const DealProductCardDimensions._();

  static const double width = 152;
  static const double height = 258;
  static const double titleHeight = 29;
  static const double priceHeight = 14;
  static const double buttonHeight = 34;
  static const double contentPaddingVertical = 10;
  static const double bottomSectionHeight =
      contentPaddingVertical + titleHeight + 2 + priceHeight + 4 + buttonHeight;

  /// Use for `SliverGridDelegateWithFixedCrossAxisCount.childAspectRatio`.
  static const double gridChildAspectRatio = 0.61;
}

class DealProductCard extends StatelessWidget {
  const DealProductCard({
    super.key,
    required this.product,
    required this.onAdd,
    this.flat = false,
    this.fillCell = false,
    this.cartQuantity = 0,
    this.onIncrease,
    this.onDecrease,
  });

  final Product product;
  final void Function(BuildContext context) onAdd;
  final bool flat;
  final bool fillCell;
  final int cartQuantity;
  final VoidCallback? onIncrease;
  final VoidCallback? onDecrease;

  @override
  Widget build(BuildContext context) {
    final discount = product.discountedPercent > 0
        ? product.discountedPercent.round()
        : (product.price > 0
            ? (((product.price - product.discountedPrice) / product.price) * 100)
                .round()
            : 0);

    if (fillCell) {
      return LayoutBuilder(
        builder: (context, constraints) {
          return SizedBox(
            width: constraints.maxWidth,
            height: constraints.maxHeight,
            child: _buildCardShell(
              context,
              discount,
              borderRadius: AppDecorations.radiusMd,
              clipTopImage: true,
            ),
          );
        },
      );
    }

    return SizedBox(
      width: DealProductCardDimensions.width,
      height: DealProductCardDimensions.height,
      child: _buildCardShell(
        context,
        discount,
        borderRadius: flat ? AppDecorations.radiusSm : AppDecorations.radiusMd,
        clipTopImage: !flat,
        outerPadding: flat
            ? const EdgeInsets.symmetric(horizontal: 4, vertical: 4)
            : EdgeInsets.zero,
      ),
    );
  }

  Widget _buildCardShell(
    BuildContext context,
    int discount, {
    required double borderRadius,
    required bool clipTopImage,
    EdgeInsets outerPadding = EdgeInsets.zero,
  }) {
    final inStock = product.stock > 0;
    final card = DecoratedBox(
      decoration: BoxDecoration(
        color: AppDecorations.cardBackground,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: _buildImageSection(
              context,
              discount,
              clipTop: clipTopImage,
              borderRadius: borderRadius,
            ),
          ),
          SizedBox(
            height: DealProductCardDimensions.bottomSectionHeight,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 4, 10, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: DealProductCardDimensions.titleHeight,
                    child: Align(
                      alignment: Alignment.topLeft,
                      child: _buildTitle(context),
                    ),
                  ),
                  const SizedBox(height: 2),
                  SizedBox(
                    height: DealProductCardDimensions.priceHeight,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: ProductPriceDisplay(
                        product: product,
                        size: ProductPriceSize.sm,
                      ),
                    ),
                  ),
                  const Spacer(),
                  _buildCartAction(inStock),
                ],
              ),
            ),
          ),
        ],
      ),
    );

    if (outerPadding == EdgeInsets.zero) {
      return card;
    }

    return Padding(
      padding: outerPadding,
      child: card,
    );
  }

  Widget _buildTitle(BuildContext context) {
    return GestureDetector(
      onTap: product.id.length > 10
          ? () => context.push('/product/${product.id}')
          : null,
      child: Text(
        product.name,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 12,
          color: AppColors.textPrimary,
          height: 1.2,
        ),
      ),
    );
  }

  Widget _buildImageSection(
    BuildContext context,
    int discount, {
    required bool clipTop,
    required double borderRadius,
  }) {
    final image = Stack(
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
    );

    if (!clipTop) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: image,
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(borderRadius),
      ),
      child: image,
    );
  }

  Widget _buildCartAction(bool inStock) {
    if (cartQuantity > 0) {
      return SizedBox(
        height: DealProductCardDimensions.buttonHeight,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.borderLight),
            borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
            color: Colors.white,
          ),
          child: Row(
            children: [
              _qtyButton(
                onDecrease,
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
                inStock ? onIncrease : null,
                label: '+',
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: DealProductCardDimensions.buttonHeight,
      child: Builder(
        builder: (buttonContext) => ElevatedButton(
          onPressed: inStock ? () => onAdd(buttonContext) : null,
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
