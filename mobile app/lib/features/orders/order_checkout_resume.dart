import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/app_providers.dart';
import '../../features/cart/cart_controller.dart';
import '../../models/order.dart';
import '../../routes/route_paths.dart';

/// Opens checkout to finish an abandoned [attempted] order.
Future<void> resumeAttemptedOrderCheckout({
  required WidgetRef ref,
  required BuildContext context,
  required Order order,
}) async {
  if (order.status != 'attempted') return;

  await ref.read(cartControllerProvider.notifier).loadCart(silent: true);
  if (!context.mounted) return;

  final cartItems = ref.read(cartControllerProvider).items;
  if (cartItems.isEmpty && order.items.isNotEmpty) {
    final api = ref.read(apiServiceProvider);
    for (final item in order.items) {
      if (item.productId.isEmpty) continue;
      try {
        await api.addToCartItem({
          'productId': item.productId,
          'quantity': item.quantity,
          'variantName': item.variantName,
          'colorName': item.colorName,
        });
      } catch (_) {
        // Best effort — checkout screen will show empty-cart guidance if needed.
      }
    }
    await ref.read(cartControllerProvider.notifier).loadCart(silent: true);
    if (!context.mounted) return;
  }

  final coupon = order.couponCode.trim();
  final params = <String, String>{
    'attemptedOrderId': order.id,
    if (coupon.isNotEmpty) 'coupon': coupon,
  };
  final uri = Uri(path: RoutePaths.checkout, queryParameters: params);
  context.push(uri.toString());
}
