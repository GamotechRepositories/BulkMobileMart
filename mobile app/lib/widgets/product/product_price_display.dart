import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/product_pricing.dart';
import '../../models/product.dart';

enum ProductPriceSize { sm, md, lg }

class ProductPriceDisplay extends StatelessWidget {
  const ProductPriceDisplay({
    super.key,
    required this.product,
    this.variantName = '',
    this.size = ProductPriceSize.md,
  });

  final Product product;
  final String variantName;
  final ProductPriceSize size;

  @override
  Widget build(BuildContext context) {
    final info = getProductListPriceInfo(product, variantName);
    if (info.salePrice <= 0) {
      return const SizedBox.shrink();
    }

    final originalStyle = switch (size) {
      ProductPriceSize.sm => const TextStyle(
          fontSize: 11,
          color: AppColors.textMuted,
          decoration: TextDecoration.lineThrough,
          height: 1.1,
        ),
      ProductPriceSize.md => const TextStyle(
          fontSize: 12,
          color: AppColors.textMuted,
          decoration: TextDecoration.lineThrough,
          height: 1.1,
        ),
      ProductPriceSize.lg => const TextStyle(
          fontSize: 14,
          color: AppColors.textMuted,
          decoration: TextDecoration.lineThrough,
          height: 1.1,
        ),
    };

    final saleStyle = switch (size) {
      ProductPriceSize.sm => const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
          height: 1.1,
        ),
      ProductPriceSize.md => const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
          height: 1.1,
        ),
      ProductPriceSize.lg => const TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
          height: 1.1,
        ),
    };

    final saleLabel = formatInr(info.salePrice, withDecimals: true);

    if (size == ProductPriceSize.sm) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (info.hasDiscount) ...[
            Flexible(
              child: Text(
                formatInr(info.originalPrice, withDecimals: true),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: originalStyle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              saleLabel,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: saleStyle,
            ),
          ),
        ],
      );
    }

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 2,
      children: [
        if (info.hasDiscount)
          Text(
            formatInr(info.originalPrice, withDecimals: true),
            style: originalStyle,
          ),
        Text(saleLabel, style: saleStyle),
      ],
    );
  }
}
