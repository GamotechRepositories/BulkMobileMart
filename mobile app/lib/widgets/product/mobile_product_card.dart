import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../models/product.dart';
import '../common/app_network_image.dart';
import 'product_price_display.dart';
import 'wishlist_button.dart';

class MobileProductCard extends StatelessWidget {
  const MobileProductCard({
    super.key,
    required this.product,
    required this.onAdd,
  });

  final Product product;
  final void Function(BuildContext context) onAdd;

  @override
  Widget build(BuildContext context) {
    final inStock = product.stock > 0;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Stack(
            children: [
              GestureDetector(
                onTap: () => context.push('/product/${product.id}'),
                child: Container(
                  width: 84,
                  height: 104,
                  decoration: BoxDecoration(
                    color: AppColors.mobileSurface,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: product.primaryImage != null
                      ? AppNetworkImage(
                          imageUrl: product.primaryImage!,
                          fit: BoxFit.contain,
                          width: 84,
                          height: 104,
                          cacheWidth: 168,
                          cacheHeight: 208,
                          errorIcon: Icons.image_outlined,
                        )
                      : const Icon(Icons.image_outlined, color: AppColors.textMuted),
                ),
              ),
              Positioned(
                right: 2,
                top: 2,
                child: WishlistButton(product: product, size: 28),
              ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => context.push('/product/${product.id}'),
                  child: Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                ProductPriceDisplay(product: product, size: ProductPriceSize.md),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      inStock ? 'In Stock' : 'Out of Stock',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: inStock ? Colors.green.shade700 : Colors.red,
                      ),
                    ),
                    const Spacer(),
                    Builder(
                      builder: (btnContext) => ElevatedButton(
                        onPressed: inStock ? () => onAdd(btnContext) : null,
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(72, 34),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          textStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: const Text('Add'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
