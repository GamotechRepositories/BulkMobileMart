import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/providers/app_providers.dart';
import '../../core/utils/order_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/orders/orders_controller.dart';
import '../../features/orders/widgets/blinkit_order_detail_body.dart';
import '../../models/order.dart';
import '../../routes/route_paths.dart';
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

  void _handleOrderAgain(Order order) {
    final productId = getPrimaryProductId(order);
    if (productId != null) {
      context.push('/product/$productId');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);

    if (!auth.isLoggedIn) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          title: const Text('Order Details'),
        ),
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

    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: SkeletonOrderDetail(),
      );
    }

    if (_error != null || _order == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          title: const Text('Order Details'),
        ),
        body: _OrderNotFound(onBack: () => context.go(RoutePaths.orders)),
      );
    }

    final order = _order!;

    return Scaffold(
      backgroundColor: Colors.white,
      body: BlinkitOrderDetailBody(
        order: order,
        cancelling: _cancelling,
        cancelError: _cancelError,
        onCancel: _cancelOrder,
        onInvoice: () => context.push('/orders/${order.id}/invoice'),
        onOrderAgain: () => _handleOrderAgain(order),
      ),
    );
  }
}

class _OrderNotFound extends StatelessWidget {
  const _OrderNotFound({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text('Order not found', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onBack, child: const Text('Back to My Orders')),
          ],
        ),
      ),
    );
  }
}
