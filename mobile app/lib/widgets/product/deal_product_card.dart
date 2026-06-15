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
  });

  final Product product;
  final VoidCallback onAdd;
  final bool flat;

  @override
  Widget build(BuildContext context) {
    final inStock = product.stock > 0;
    final discount = product.discountedPercent > 0
        ? product.discountedPercent.round()
        : (product.price > 0
            ? (((product.price - product.discountedPrice) / product.price) * 100)
                .round()
            : 0);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.max,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            GestureDetector(
              onTap: product.id.length > 10
                  ? () => context.push('/product/${product.id}')
                  : null,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 118,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius:
                          BorderRadius.circular(AppDecorations.radiusMd),
                    ),
                    alignment: Alignment.center,
                    child: product.primaryImage != null
                        ? AppNetworkImage(
                            imageUrl: product.primaryImage!,
                            height: 106,
                            fit: BoxFit.contain,
                            cacheWidth: 168,
                            cacheHeight: 106,
                            errorIcon: Icons.image_outlined,
                          )
                        : const Icon(
                            Icons.image_outlined,
                            color: AppColors.textMuted,
                            size: 40,
                          ),
                  ),
                  const SizedBox(height: 10),
                  Text(
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
                  const SizedBox(height: 4),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        formatInr(
                          product.discountedPrice,
                          withDecimals: true,
                        ),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(width: 5),
                      if (product.price > product.discountedPrice)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 1),
                          child: Text(
                            formatInr(product.price, withDecimals: true),
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (discount > 0) ...[
                    const SizedBox(height: 2),
                    Text(
                      '$discount% OFF',
                      style: TextStyle(
                        color: Colors.green.shade700,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (discount > 0)
              Positioned(
                left: 0,
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 3,
                  ),
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
              right: -2,
              top: -2,
              child: WishlistButton(product: product, size: 28),
            ),
          ],
        ),
        if (!flat) const Spacer(),
        if (flat) const SizedBox(height: 10),
        SizedBox(
          height: 36,
          child: ElevatedButton(
            onPressed: inStock ? onAdd : null,
            style: ElevatedButton.styleFrom(
              elevation: 0,
              padding: EdgeInsets.zero,
              disabledBackgroundColor: AppColors.borderLight,
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(AppDecorations.radiusSm),
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
      ],
    );

    return SizedBox(
      width: 168,
      child: flat
          ? content
          : DecoratedBox(
              decoration: AppDecorations.card(radius: AppDecorations.radiusMd),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: content,
              ),
            ),
    );
  }
}
