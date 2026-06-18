import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/order_number.dart';
import '../../core/utils/order_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/orders/orders_controller.dart';
import '../../models/order.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/app_network_image.dart';
import '../../widgets/common/refreshable_body.dart';
import '../../widgets/common/skeleton_loaders.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  _OrderFilter _filter = _OrderFilter.all;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOrders());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    await ref.read(ordersControllerProvider.notifier).loadOrders();
  }

  List<Order> _filteredOrders(List<Order> orders) {
    final query = _searchController.text.trim().toLowerCase();
    return orders.where((order) {
      if (!_filter.matches(order)) return false;
      if (query.isEmpty) return true;
      final id = getOrderNumber(order).toLowerCase();
      final names = order.items.map((i) => i.name.toLowerCase()).join(' ');
      return id.contains(query) || names.contains(query);
    }).toList();
  }

  _OrdersSummary _buildSummary(List<Order> orders) {
    var spent = 0.0;
    var active = 0;
    var delivered = 0;
    for (final order in orders) {
      spent += order.total;
      if (order.status == 'delivered') {
        delivered++;
      } else if (order.status != 'cancelled') {
        active++;
      }
    }
    return _OrdersSummary(
      total: orders.length,
      spent: spent,
      active: active,
      delivered: delivered,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ref.watch(authControllerProvider.select((s) => s.isLoggedIn));
    final orders = ref.watch(ordersControllerProvider.select((s) => s.orders));
    final loading = ref.watch(ordersControllerProvider.select((s) => s.loading));
    final hasLoaded = ref.watch(ordersControllerProvider.select((s) => s.hasLoaded));
    final error = ref.watch(ordersControllerProvider.select((s) => s.error));

    ref.listen(authControllerProvider.select((s) => s.isLoggedIn), (previous, next) {
      if (next) _loadOrders();
    });

    return ColoredBox(
      color: AppColors.pageBackground,
      child: _buildBody(
        context,
        isLoggedIn: isLoggedIn,
        orders: orders,
        loading: loading,
        hasLoaded: hasLoaded,
        error: error,
      ),
    );
  }

  Widget _buildBody(
    BuildContext context, {
    required bool isLoggedIn,
    required List<Order> orders,
    required bool loading,
    required bool hasLoaded,
    required String? error,
  }) {
    if (!isLoggedIn) {
      return RefreshableBody(
        onRefresh: _loadOrders,
        child: _LoginPrompt(
          onLogin: () => ref.read(authControllerProvider.notifier).openAuthModal(),
        ),
      );
    }

    if (loading || !hasLoaded) {
      return const SkeletonOrderList();
    }

    if (error != null && orders.isEmpty) {
      return RefreshableBody(
        onRefresh: _loadOrders,
        child: _OrdersError(
          message: error,
          onRetry: _loadOrders,
        ),
      );
    }

    if (orders.isEmpty) {
      return RefreshableBody(
        onRefresh: _loadOrders,
        child: _EmptyOrders(onBrowse: () => context.go(RoutePaths.product)),
      );
    }

    final filtered = _filteredOrders(orders);
    final summary = _buildSummary(orders);

    return RefreshIndicator(
      onRefresh: _loadOrders,
      color: AppColors.primary,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 100),
        itemCount: filtered.isEmpty ? 2 : filtered.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _OrdersHeader(
              summary: summary,
              filter: _filter,
              searchController: _searchController,
              onFilterChanged: (value) => setState(() => _filter = value),
              onSearchChanged: () => setState(() {}),
            );
          }

          if (filtered.isEmpty) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 48, horizontal: 16),
              child: _NoFilterResults(),
            );
          }

          final order = filtered[index - 1];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0D000000),
                  blurRadius: 3,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: RepaintBoundary(
              child: _FlipkartOrderCard(order: order),
            ),
          );
        },
      ),
    );
  }
}

enum _OrderFilter { all, active, delivered, cancelled }

extension on _OrderFilter {
  String get label {
    switch (this) {
      case _OrderFilter.all:
        return 'All';
      case _OrderFilter.active:
        return 'Active';
      case _OrderFilter.delivered:
        return 'Delivered';
      case _OrderFilter.cancelled:
        return 'Cancelled';
    }
  }

  bool matches(Order order) {
    switch (this) {
      case _OrderFilter.all:
        return true;
      case _OrderFilter.active:
        return order.status != 'delivered' && order.status != 'cancelled';
      case _OrderFilter.delivered:
        return order.status == 'delivered';
      case _OrderFilter.cancelled:
        return order.status == 'cancelled';
    }
  }
}

class _OrdersSummary {
  const _OrdersSummary({
    required this.total,
    required this.spent,
    required this.active,
    required this.delivered,
  });

  final int total;
  final double spent;
  final int active;
  final int delivered;
}

class _OrdersHeader extends StatelessWidget {
  const _OrdersHeader({
    required this.summary,
    required this.filter,
    required this.searchController,
    required this.onFilterChanged,
    required this.onSearchChanged,
  });

  final _OrdersSummary summary;
  final _OrderFilter filter;
  final TextEditingController searchController;
  final ValueChanged<_OrderFilter> onFilterChanged;
  final VoidCallback onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'My Orders',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text(
            'Track, manage and reorder your wholesale purchases',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2874F0), Color(0xFF1A5DC9)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navSelected.withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: _SummaryTile(
                    label: 'Total orders',
                    value: '${summary.total}',
                  ),
                ),
                _summaryDivider(),
                Expanded(
                  child: _SummaryTile(
                    label: 'In progress',
                    value: '${summary.active}',
                  ),
                ),
                _summaryDivider(),
                Expanded(
                  child: _SummaryTile(
                    label: 'Total spent',
                    value: formatInr(summary.spent, withDecimals: false),
                    compact: true,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: searchController,
            onChanged: (_) => onSearchChanged(),
            style: const TextStyle(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Search by order ID or product name',
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
              prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textMuted),
              suffixIcon: searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () {
                        searchController.clear();
                        onSearchChanged();
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.borderLight),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.borderLight),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.navSelected, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _OrderFilter.values.map((value) {
                final selected = filter == value;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(value.label),
                    selected: selected,
                    onSelected: (_) => onFilterChanged(value),
                    showCheckmark: false,
                    selectedColor: AppColors.navSelected.withValues(alpha: 0.12),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: selected ? AppColors.navSelected : AppColors.borderLight,
                    ),
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: selected ? AppColors.navSelected : AppColors.textSecondary,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryDivider() {
    return Container(
      width: 1,
      height: 36,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      color: Colors.white.withValues(alpha: 0.25),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({
    required this.label,
    required this.value,
    this.compact = false,
  });

  final String label;
  final String value;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: compact ? 13 : 18,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.85),
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _NoFilterResults extends StatelessWidget {
  const _NoFilterResults();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(Icons.search_off, size: 48, color: Colors.grey.shade400),
        const SizedBox(height: 12),
        const Text(
          'No orders match your search',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        const Text(
          'Try a different filter or search term',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
      ],
    );
  }
}

class _FlipkartOrderCard extends StatelessWidget {
  const _FlipkartOrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final orderId = getOrderNumber(order);
    final statusColor = getOrderStatusColor(order.status);
    final statusLabel = getOrderStatusLabel(order.status);
    final primaryItem = order.items.isNotEmpty ? order.items.first : null;
    final extraItems = order.items.length > 1 ? order.items.length - 1 : 0;
    final totalQty = order.items.fold<int>(0, (sum, item) => sum + item.quantity);
    final productId = getPrimaryProductId(order);
    final paymentMode =
        order.paymentMethod == 'cod' ? 'Cash on Delivery' : 'Online Payment';
    final activeIndex = (orderStatusStepIndex[order.status] ?? 0).clamp(0, 3);
    final isCancelled = order.status == 'cancelled';
    final city = order.deliveryAddress.city.trim();
    final placedLabel = _relativePlacedLabel(order.createdAt);

    return Material(
      color: Colors.white,
      elevation: 0,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => context.push('/orders/${order.id}'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        statusColor.withValues(alpha: 0.14),
                        statusColor.withValues(alpha: 0.04),
                      ],
                    ),
                    border: Border(
                      left: BorderSide(color: statusColor, width: 4),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(_statusIcon(order.status), size: 18, color: statusColor),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _orderStatusHeadline(order),
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: statusColor,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$placedLabel · Order #$orderId',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            if (city.isNotEmpty)
                              Text(
                                'Deliver to $city',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textMuted,
                                ),
                              ),
                          ],
                        ),
                      ),
                      _StatusChip(label: statusLabel, color: statusColor),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${order.items.length} item${order.items.length == 1 ? '' : 's'} · $totalQty pcs',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            if (order.deliveryCharges == 0)
                              const Text(
                                'You saved on delivery',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.green,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'Order total',
                            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                          Text(
                            formatInr(order.total, withDecimals: true),
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (!isCancelled)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
                    child: _MiniOrderTracker(activeIndex: activeIndex),
                  ),
                if (primaryItem != null) ...[
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _ProductPreview(
                          items: order.items,
                          primary: primaryItem,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                primaryItem.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                  height: 1.3,
                                ),
                              ),
                              if (primaryItem.brandName.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  primaryItem.brandName,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 6),
                              Text(
                                extraItems > 0
                                    ? 'Qty ${primaryItem.quantity} · +$extraItems more'
                                    : 'Quantity: ${primaryItem.quantity}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                formatInr(primaryItem.price * primaryItem.quantity, withDecimals: true),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _MetaChip(icon: Icons.payments_outlined, label: paymentMode),
                      if (showOrderPaymentBadge(order))
                        _MetaChip(
                          icon: Icons.verified_outlined,
                          label: getOrderPaymentLabel(order),
                          color: getOrderPaymentColor(order),
                        ),
                      if (order.deliveryCharges == 0)
                        const _MetaChip(
                          icon: Icons.local_shipping_outlined,
                          label: 'Free delivery',
                          color: Colors.green,
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.borderLight),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
            child: Row(
              children: [
                Expanded(
                  child: _ActionPill(
                    icon: Icons.visibility_outlined,
                    label: 'Details',
                    color: AppColors.navSelected,
                    filled: true,
                    onTap: () => context.push('/orders/${order.id}'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _ActionPill(
                    icon: Icons.description_outlined,
                    label: 'Invoice',
                    onTap: () => context.push('/orders/${order.id}/invoice'),
                  ),
                ),
                if (productId != null) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ActionPill(
                      icon: Icons.shopping_cart_outlined,
                      label: 'Reorder',
                      color: AppColors.primary,
                      onTap: () => context.push('/product/$productId'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductPreview extends StatelessWidget {
  const _ProductPreview({required this.items, required this.primary});

  final List<OrderItem> items;
  final OrderItem primary;

  @override
  Widget build(BuildContext context) {
    if (items.length == 1) {
      return _previewImage(primary.image, 72);
    }

    return SizedBox(
      width: 84,
      height: 72,
      child: Stack(
        children: [
          for (var i = 0; i < items.length && i < 3; i++)
            Positioned(
              left: i * 18.0,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1A000000),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                child: _previewImage(items[i].image, 56),
              ),
            ),
          if (items.length > 3)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.navSelected,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '+${items.length - 3}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _previewImage(String url, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: url.isNotEmpty
          ? ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AppNetworkImage(
                imageUrl: url,
                fit: BoxFit.contain,
                width: size,
                height: size,
                cacheWidth: (size * 2).toInt(),
                cacheHeight: (size * 2).toInt(),
                errorIcon: Icons.image_outlined,
              ),
            )
          : const Icon(Icons.image_outlined, color: AppColors.textMuted, size: 20),
    );
  }
}

class _ActionPill extends StatelessWidget {
  const _ActionPill({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
    this.filled = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final accent = color ?? AppColors.textSecondary;
    return Material(
      color: filled ? accent.withValues(alpha: 0.1) : AppColors.mobileSurface,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: filled ? accent.withValues(alpha: 0.35) : AppColors.borderLight,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: accent),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: accent,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniOrderTracker extends StatelessWidget {
  const _MiniOrderTracker({required this.activeIndex});

  final int activeIndex;

  static const _labels = ['Placed', 'Packed', 'Shipped', 'Delivered'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_labels.length * 2 - 1, (index) {
        if (index.isOdd) {
          final step = index ~/ 2;
          return Expanded(
            child: Container(
              height: 2,
              margin: const EdgeInsets.only(bottom: 14),
              color: step < activeIndex
                  ? AppColors.navSelected
                  : AppColors.borderLight,
            ),
          );
        }

        final step = index ~/ 2;
        final done = step <= activeIndex;
        return Column(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done ? AppColors.navSelected : Colors.white,
                border: Border.all(
                  color: done ? AppColors.navSelected : AppColors.borderLight,
                  width: 1.5,
                ),
              ),
              child: done
                  ? const Icon(Icons.check, size: 10, color: Colors.white)
                  : null,
            ),
            const SizedBox(height: 4),
            Text(
              _labels[step],
              style: TextStyle(
                fontSize: 8,
                fontWeight: step == activeIndex ? FontWeight.w700 : FontWeight.w500,
                color: done ? AppColors.navSelected : AppColors.textMuted,
              ),
            ),
          ],
        );
      }),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
    this.color,
  });

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? AppColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.mobileSurface,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: chipColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: chipColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginPrompt extends StatelessWidget {
  const _LoginPrompt({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _StateCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.lock_outline, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              const Text(
                'Login to view your orders',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Track wholesale orders, download invoices, and reorder in one tap.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onLogin,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.navSelected,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Login / Sign Up'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrdersError extends StatelessWidget {
  const _OrdersError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _StateCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off_outlined, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(onPressed: onRetry, child: const Text('Retry')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders({required this.onBrowse});

  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _StateCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.receipt_long_outlined, color: AppColors.primary, size: 36),
              ),
              const SizedBox(height: 16),
              const Text(
                'No orders yet',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                "You haven't placed any wholesale orders. Browse products and checkout to see orders here.",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onBrowse,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Browse Products'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StateCard extends StatelessWidget {
  const _StateCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: child,
    );
  }
}

String _relativePlacedLabel(DateTime? date) {
  if (date == null) return 'Placed recently';
  final now = DateTime.now();
  final diff = now.difference(date);
  if (diff.inDays == 0) return 'Placed today';
  if (diff.inDays == 1) return 'Placed yesterday';
  if (diff.inDays < 7) return 'Placed ${diff.inDays} days ago';
  return 'Placed on ${formatOrderDate(date)}';
}

String _orderStatusHeadline(Order order) {
  switch (order.status) {
    case 'delivered':
      return 'Delivered successfully';
    case 'shipping':
    case 'shipped':
      return 'On the way to you';
    case 'processing':
      return 'Being prepared for dispatch';
    case 'cancelled':
      return 'Order was cancelled';
    default:
      return 'Order confirmed';
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
