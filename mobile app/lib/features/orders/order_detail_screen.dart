import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/providers/app_providers.dart';
import '../../core/utils/address_utils.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/order_number.dart';
import '../../core/utils/order_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/orders/orders_controller.dart';
import '../../models/order.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/app_network_image.dart';
import '../../widgets/common/skeleton_loaders.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  Order? _order;
  bool _loading = true;
  bool _cancelling = false;
  String? _error;
  String? _cancelError;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadOrder);
  }

  Future<void> _loadOrder() async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) {
      setState(() {
        _loading = false;
        _error = null;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final order = await ref.read(apiServiceProvider).fetchOrderById(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
      ref.read(ordersControllerProvider.notifier).upsertOrder(order);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _order = null;
        _loading = false;
        _error = 'Order not found';
      });
    }
  }

  Future<void> _cancelOrder() async {
    final order = _order;
    if (order == null || _cancelling || order.status != 'confirm') return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel order?'),
        content: const Text(
          'Are you sure you want to cancel this order? This action cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Yes, cancel', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _cancelling = true;
      _cancelError = null;
    });

    try {
      final updated = await ref.read(apiServiceProvider).cancelOrderById(order.id);
      if (!mounted) return;
      setState(() {
        _order = updated;
        _cancelling = false;
      });
      ref.read(ordersControllerProvider.notifier).upsertOrder(updated);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _cancelling = false;
        _cancelError = 'Failed to cancel order';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);

    if (!auth.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Details')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Please login to view order details.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => ref.read(authControllerProvider.notifier).openAuthModal(),
                  child: const Text('Login / Sign Up'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Details'),
      ),
      body: _loading
          ? const SkeletonOrderDetail()
          : _error != null || _order == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_error ?? 'Order not found'),
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: () => context.go(RoutePaths.orders),
                          child: const Text('← Back to My Orders'),
                        ),
                      ],
                    ),
                  ),
                )
              : _OrderDetailBody(
                  order: _order!,
                  cancelling: _cancelling,
                  cancelError: _cancelError,
                  onCancel: _cancelOrder,
                  onInvoice: () => context.push('/orders/${_order!.id}/invoice'),
                ),
    );
  }
}

class _OrderDetailBody extends StatelessWidget {
  const _OrderDetailBody({
    required this.order,
    required this.cancelling,
    required this.cancelError,
    required this.onCancel,
    required this.onInvoice,
  });

  final Order order;
  final bool cancelling;
  final String? cancelError;
  final VoidCallback onCancel;
  final VoidCallback onInvoice;

  @override
  Widget build(BuildContext context) {
    final addr = order.deliveryAddress;
    final activeIndex = orderStatusStepIndex[order.status] ?? 0;
    final isCancelled = order.status == 'cancelled';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          getOrderNumber(order),
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _labelValue('STATUS', getOrderStatusLabel(order.status)),
                        const SizedBox(height: 8),
                        _labelValue('PAYMENT', getOrderPaymentLabel(order)),
                        if (order.paymentMethod == 'online' &&
                            (order.razorpayPaymentId.isNotEmpty ||
                                order.razorpayOrderId.isNotEmpty)) ...[
                          const SizedBox(height: 8),
                          _labelValue(
                            'TRANSACTION ID',
                            order.razorpayPaymentId.isNotEmpty
                                ? order.razorpayPaymentId
                                : order.razorpayOrderId,
                          ),
                          const SizedBox(height: 8),
                          _labelValue(
                            'PAYMENT TIME',
                            formatOrderDateTime(order.paidAt ?? order.createdAt),
                          ),
                        ],
                        if (cancelError != null) ...[
                          const SizedBox(height: 8),
                          Text(cancelError!, style: TextStyle(color: Colors.red.shade700, fontSize: 12)),
                        ],
                      ],
                    ),
                  ),
                  if (order.status == 'confirm')
                    TextButton(
                      onPressed: cancelling ? null : onCancel,
                      child: Text(cancelling ? 'Cancelling...' : 'Cancel Order'),
                    ),
                ],
              ),
              const Divider(height: 24),
              ...List.generate(orderSteps.length, (index) {
                final label = orderSteps[index];
                final isComplete = !isCancelled && index <= activeIndex;
                final isCancelledStep = isCancelled && index == 4;
                final isLast = index == orderSteps.length - 1;

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isComplete || isCancelledStep
                                ? (isCancelledStep ? Colors.red : AppColors.primary)
                                : Colors.white,
                            border: Border.all(
                              color: isComplete || isCancelledStep
                                  ? (isCancelledStep ? Colors.red : AppColors.primary)
                                  : AppColors.borderLight,
                              width: 2,
                            ),
                          ),
                          child: Icon(
                            isComplete || isCancelledStep ? Icons.check : null,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                        if (!isLast)
                          Container(
                            width: 2,
                            height: 28,
                            color: !isCancelled && index < activeIndex
                                ? AppColors.primary
                                : AppColors.borderLight,
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              label,
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: isComplete || isCancelledStep
                                    ? AppColors.textPrimary
                                    : AppColors.textSecondary,
                              ),
                            ),
                            if (index == 0 && isComplete)
                              Text(
                                formatOrderDateTime(order.createdAt),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _section(
          title: 'YOUR MESSAGE',
          child: Text(
            getOrderMessage(order),
            style: const TextStyle(color: AppColors.textSecondary, height: 1.4),
          ),
        ),
        const SizedBox(height: 12),
        _section(
          title: 'ADDRESS',
          child: Text(
            '${getAddressFullName(addr)}\n'
            '${formatAddressLine(addr)}\n'
            '${addr.email.isNotEmpty ? '${addr.email}\n' : ''}'
            '+91 ${addr.number}',
            style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
          ),
        ),
        const SizedBox(height: 12),
        _section(
          title: 'BILLING SUMMARY',
          child: Column(
            children: [
              _summaryRow('Subtotal', formatInr(order.subtotal)),
              const SizedBox(height: 6),
              _summaryRow(
                'Delivery',
                order.deliveryCharges == 0 ? 'Free' : formatInr(order.deliveryCharges),
              ),
              const Divider(height: 20),
              _summaryRow('Total', formatInr(order.total), bold: true),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _section(
          title: 'ORDER ITEMS',
          child: Column(
            children: [
              ...order.items.map((item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.borderLight),
                          color: AppColors.mobileSurface,
                        ),
                        child: item.image.isNotEmpty
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: AppNetworkImage(
                                  imageUrl: item.image,
                                  fit: BoxFit.contain,
                                  errorIcon: Icons.image_outlined,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('x${item.quantity}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Text(formatInr(item.price * item.quantity)),
                        ],
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: onInvoice,
                child: const Text('Bill Invoice'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _section({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _labelValue(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _summaryRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500)),
        Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500)),
      ],
    );
  }
}
