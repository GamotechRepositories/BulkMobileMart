import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/orders/order_checkout_resume.dart';
import '../../models/order.dart';
import 'order_utils.dart';

void navigateOrderAgain({
  required BuildContext context,
  required WidgetRef ref,
  required Order order,
}) {
  if (order.status == 'attempted') {
    resumeAttemptedOrderCheckout(ref: ref, context: context, order: order);
    return;
  }

  final productId = getPrimaryProductId(order);
  if (order.items.length > 1) {
    context.push('/orders/${order.id}');
    return;
  }
  if (productId != null) {
    context.push('/product/$productId');
    return;
  }
  context.push('/orders/${order.id}');
}
