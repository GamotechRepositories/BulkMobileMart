import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
        backgroundColor: AppColors.pageBackground,
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
      backgroundColor: AppColors.pageBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: Text(
          _order != null ? '#${getOrderNumber(_order!)}' : 'Order Details',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        actions: [
          if (_order != null)
            IconButton(
              tooltip: 'Copy order ID',
              onPressed: () {
                final id = getOrderNumber(_order!);
                Clipboard.setData(ClipboardData(text: id));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Order ID copied'),
                    duration: Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              icon: const Icon(Icons.copy_outlined, size: 20),
            ),
        ],
      ),
      body: _loading
          ? const SkeletonOrderDetail()
          : _error != null || _order == null
              ? _OrderNotFound(onBack: () => context.go(RoutePaths.orders))
              : _OrderDetailBody(
                  order: _order!,
                  cancelling: _cancelling,
                  cancelError: _cancelError,
                  onCancel: _cancelOrder,
                  onInvoice: () => context.push('/orders/${_order!.id}/invoice'),
                  onBuyAgain: (productId) => context.push('/product/$productId'),
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

class _OrderDetailBody extends StatelessWidget {
  const _OrderDetailBody({
    required this.order,
    required this.cancelling,
    required this.cancelError,
    required this.onCancel,
    required this.onInvoice,
    required this.onBuyAgain,
  });

  final Order order;
  final bool cancelling;
  final String? cancelError;
  final VoidCallback onCancel;
  final VoidCallback onInvoice;
  final ValueChanged<String> onBuyAgain;

  @override
  Widget build(BuildContext context) {
    final addr = order.deliveryAddress;
    final activeIndex = orderStatusStepIndex[order.status] ?? 0;
    final isCancelled = order.status == 'cancelled';
    final statusColor = getOrderStatusColor(order.status);
    final heroColor = _statusHeroColor(order.status);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 16),
            children: [
              _StatusHero(
                order: order,
                heroColor: heroColor,
                statusColor: statusColor,
              ),
              const SizedBox(height: 8),
              _FlipkartCard(
                child: _HorizontalOrderTracker(
                  activeIndex: activeIndex,
                  isCancelled: isCancelled,
                  placedAt: order.createdAt,
                ),
              ),
              const SizedBox(height: 8),
              _FlipkartCard(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle(
                      title: 'Items in this order',
                      icon: Icons.shopping_bag_outlined,
                    ),
                    const SizedBox(height: 8),
                    ...order.items.map(
                      (item) => _OrderProductTile(
                        item: item,
                        statusLabel: getOrderStatusLabel(order.status),
                        statusColor: statusColor,
                        onBuyAgain: item.productId.isNotEmpty
                            ? () => onBuyAgain(item.productId)
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              _FlipkartCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle(
                      title: 'Shipping details',
                      icon: Icons.location_on_outlined,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      getAddressFullName(addr),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatAddressLine(addr),
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        height: 1.45,
                        fontSize: 13,
                      ),
                    ),
                    if (addr.number.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        '+91 ${addr.number}',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                    if (addr.email.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        addr.email,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 8),
              _FlipkartCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle(
                      title: 'Price details',
                      icon: Icons.receipt_outlined,
                    ),
                    const SizedBox(height: 12),
                    _PriceRow(label: 'Listing price', value: formatInr(order.subtotal)),
                    const SizedBox(height: 8),
                    _PriceRow(
                      label: 'Delivery charges',
                      value: order.deliveryCharges == 0
                          ? 'FREE'
                          : formatInr(order.deliveryCharges),
                      valueColor: order.deliveryCharges == 0 ? Colors.green.shade700 : null,
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Divider(height: 1, color: AppColors.borderLight),
                    ),
                    _PriceRow(
                      label: 'Total amount',
                      value: formatInr(order.total, withDecimals: true),
                      bold: true,
                      valueColor: AppColors.textPrimary,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              _FlipkartCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle(
                      title: 'Order details',
                      icon: Icons.info_outline,
                    ),
                    const SizedBox(height: 12),
                    _InfoRow(label: 'Order ID', value: getOrderNumber(order)),
                    _InfoRow(
                      label: 'Order placed',
                      value: formatOrderDateTime(order.createdAt),
                    ),
                    _InfoRow(
                      label: 'Order status',
                      value: getOrderStatusLabel(order.status),
                    ),
                    _InfoRow(
                      label: 'Payment',
                      value: getOrderPaymentLabel(order),
                    ),
                    _InfoRow(
                      label: 'Payment mode',
                      value: order.paymentMethod == 'cod' ? 'Cash on Delivery' : 'Online',
                    ),
                    if (order.paymentMethod == 'online' &&
                        (order.razorpayPaymentId.isNotEmpty ||
                            order.razorpayOrderId.isNotEmpty)) ...[
                      _InfoRow(
                        label: 'Transaction ID',
                        value: order.razorpayPaymentId.isNotEmpty
                            ? order.razorpayPaymentId
                            : order.razorpayOrderId,
                      ),
                      _InfoRow(
                        label: 'Paid on',
                        value: formatOrderDateTime(order.paidAt ?? order.createdAt),
                      ),
                    ],
                    if (getOrderMessage(order) != '—') ...[
                      const SizedBox(height: 4),
                      _InfoRow(label: 'Your note', value: getOrderMessage(order)),
                    ],
                    if (cancelError != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        cancelError!,
                        style: TextStyle(color: Colors.red.shade700, fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        _BottomActions(
          order: order,
          cancelling: cancelling,
          onCancel: onCancel,
          onInvoice: onInvoice,
        ),
      ],
    );
  }
}

class _StatusHero extends StatelessWidget {
  const _StatusHero({
    required this.order,
    required this.heroColor,
    required this.statusColor,
  });

  final Order order;
  final Color heroColor;
  final Color statusColor;

  @override
  Widget build(BuildContext context) {
    final headline = _statusHeadline(order);
    final subtitle = _statusSubtitle(order);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            heroColor,
            Color.lerp(heroColor, Colors.black, 0.12)!,
          ],
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(_statusIcon(order.status), color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  headline,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.92),
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _HeroChip(
                      label: getOrderStatusLabel(order.status),
                      filled: true,
                    ),
                    if (showOrderPaymentBadge(order))
                      _HeroChip(
                        label: getOrderPaymentLabel(order),
                        filled: false,
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

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label, required this.filled});

  final String label;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: filled ? Colors.white.withValues(alpha: 0.22) : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.55)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _HorizontalOrderTracker extends StatelessWidget {
  const _HorizontalOrderTracker({
    required this.activeIndex,
    required this.isCancelled,
    required this.placedAt,
  });

  final int activeIndex;
  final bool isCancelled;
  final DateTime? placedAt;

  static const _steps = ['Placed', 'Packed', 'Shipped', 'Delivered'];

  @override
  Widget build(BuildContext context) {
    if (isCancelled) {
      return Row(
        children: [
          Icon(Icons.cancel_outlined, color: Colors.red.shade600, size: 20),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'This order was cancelled',
              style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
        ],
      );
    }

    final displayIndex = activeIndex.clamp(0, _steps.length - 1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(_steps.length * 2 - 1, (index) {
            if (index.isOdd) {
              final stepIndex = index ~/ 2;
              final lineActive = stepIndex < displayIndex;
              return Expanded(
                child: Container(
                  height: 3,
                  margin: const EdgeInsets.only(bottom: 22),
                  color: lineActive ? AppColors.navSelected : AppColors.borderLight,
                ),
              );
            }

            final stepIndex = index ~/ 2;
            final isComplete = stepIndex <= displayIndex;
            final isCurrent = stepIndex == displayIndex;

            return Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isComplete ? AppColors.navSelected : Colors.white,
                    border: Border.all(
                      color: isComplete ? AppColors.navSelected : AppColors.borderLight,
                      width: 2,
                    ),
                  ),
                  child: isComplete
                      ? const Icon(Icons.check, size: 14, color: Colors.white)
                      : Center(
                          child: Text(
                            '${stepIndex + 1}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isCurrent
                                  ? AppColors.navSelected
                                  : AppColors.textMuted,
                            ),
                          ),
                        ),
                ),
                const SizedBox(height: 6),
                SizedBox(
                  width: 58,
                  child: Text(
                    _steps[stepIndex],
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                      color: isComplete
                          ? AppColors.navSelected
                          : AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            );
          }),
        ),
        if (placedAt != null) ...[
          const SizedBox(height: 4),
          Text(
            'Placed on ${formatOrderDateTime(placedAt)}',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }
}

class _OrderProductTile extends StatelessWidget {
  const _OrderProductTile({
    required this.item,
    required this.statusLabel,
    required this.statusColor,
    this.onBuyAgain,
  });

  final OrderItem item;
  final String statusLabel;
  final Color statusColor;
  final VoidCallback? onBuyAgain;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.mobileSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: item.image.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: AppNetworkImage(
                          imageUrl: item.image,
                          fit: BoxFit.contain,
                          width: 72,
                          height: 72,
                          cacheWidth: 144,
                          cacheHeight: 144,
                          errorIcon: Icons.image_outlined,
                        ),
                      )
                    : const Icon(Icons.image_outlined, color: AppColors.textMuted),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        height: 1.3,
                      ),
                    ),
                    if (item.brandName.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.brandName,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      'Qty: ${item.quantity}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatInr(item.price * item.quantity, withDecimals: true),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: statusColor,
                  ),
                ),
              ),
              const Spacer(),
              if (onBuyAgain != null)
                TextButton.icon(
                  onPressed: onBuyAgain,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.navSelected,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  icon: const Icon(Icons.shopping_cart_outlined, size: 16),
                  label: const Text('Buy Again', style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BottomActions extends StatelessWidget {
  const _BottomActions({
    required this.order,
    required this.cancelling,
    required this.onCancel,
    required this.onInvoice,
  });

  final Order order;
  final bool cancelling;
  final VoidCallback onCancel;
  final VoidCallback onInvoice;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.borderLight)),
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 8,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            if (order.status == 'confirm')
              Expanded(
                child: OutlinedButton(
                  onPressed: cancelling ? null : onCancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red.shade700,
                    side: BorderSide(color: Colors.red.shade300),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(cancelling ? 'Cancelling...' : 'Cancel Order'),
                ),
              ),
            if (order.status == 'confirm') const SizedBox(width: 10),
            Expanded(
              flex: order.status == 'confirm' ? 1 : 2,
              child: ElevatedButton.icon(
                onPressed: onInvoice,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navSelected,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                icon: const Icon(Icons.description_outlined, size: 18),
                label: const Text('Download Invoice'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FlipkartCard extends StatelessWidget {
  const _FlipkartCard({required this.child, this.padding = const EdgeInsets.all(16)});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 2,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.navSelected),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });

  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
      fontSize: bold ? 15 : 13,
      color: valueColor ?? AppColors.textSecondary,
    );

    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: bold ? AppColors.textPrimary : AppColors.textSecondary,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
        Text(value, style: style),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

Color _statusHeroColor(String status) {
  switch (status) {
    case 'delivered':
      return const Color(0xFF26A541);
    case 'shipping':
    case 'shipped':
      return AppColors.navSelected;
    case 'processing':
      return const Color(0xFF7B1FA2);
    case 'cancelled':
      return const Color(0xFFE53935);
    default:
      return const Color(0xFF1A73E8);
  }
}

String _statusHeadline(Order order) {
  switch (order.status) {
    case 'delivered':
      return 'Delivered successfully';
    case 'shipping':
    case 'shipped':
      return 'Your order is on the way';
    case 'processing':
      return 'Order is being prepared';
    case 'cancelled':
      return 'Order cancelled';
    default:
      return 'Order placed successfully';
  }
}

String _statusSubtitle(Order order) {
  switch (order.status) {
    case 'delivered':
      return 'Delivered on ${formatOrderDate(order.createdAt)}';
    case 'shipping':
    case 'shipped':
      return 'Delivery expected in 3–7 business days';
    case 'processing':
      return 'We are packing your wholesale order';
    case 'cancelled':
      return 'This order will not be delivered';
    default:
      return 'Placed on ${formatOrderDateTime(order.createdAt)}';
  }
}

IconData _statusIcon(String status) {
  switch (status) {
    case 'delivered':
      return Icons.check_circle_outline;
    case 'shipping':
    case 'shipped':
      return Icons.local_shipping_outlined;
    case 'processing':
      return Icons.inventory_2_outlined;
    case 'cancelled':
      return Icons.cancel_outlined;
    default:
      return Icons.verified_outlined;
  }
}
