import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/external_link.dart';
import '../../../core/utils/order_utils.dart';
import '../../../models/order.dart';
import '../../../routes/app_router.dart';
import '../../../widgets/common/product_3d_image.dart';
import '../delivery_rating_controller.dart';

const _actionPink = Color(0xFFE23744);

class BlinkitOrderCard extends ConsumerWidget {
  const BlinkitOrderCard({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deliveryRating = ref.watch(deliveryRatingProvider(order.id));
    final isDelivered = order.status == 'delivered';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => context.push('/orders/${order.id}'),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 12, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _OrderHeader(
                    order: order,
                    onMenuTap: () => _showOrderMenu(context, order),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatPlacedAtLabel(order.createdAt),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                      height: 1.3,
                    ),
                  ),
                  if (order.shipment.trackingNumber.trim().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Tracking: ${order.shipment.trackingNumber}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navSelected,
                        height: 1.3,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  _ProductThumbnailRow(items: order.items),
                  if (isDelivered && deliveryRating != null) ...[
                    const SizedBox(height: 14),
                    _DeliveryRatingRow(rating: deliveryRating),
                  ],
                ],
              ),
            ),
          ),
          if (order.shipment.canOpenTracking)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => openExternalUrl(
                    order.shipment.trackUrl,
                    context: context,
                    errorMessage: 'Could not open tracking link.',
                  ),
                  icon: const Icon(Icons.local_shipping_outlined, size: 18),
                  label: const Text('Track order'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navSelected,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 14),
          const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
          _FooterAction(
            label: 'View details',
            onTap: () => context.push('/orders/${order.id}'),
          ),
        ],
      ),
    );
  }

  void _showOrderMenu(BuildContext context, Order order) {
    final rootContext = rootNavigatorKey.currentContext ?? context;
    showDialog<void>(
      context: rootContext,
      builder: (dialogContext) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.receipt_long_outlined),
                title: const Text('View order details'),
                onTap: () {
                  Navigator.pop(dialogContext);
                  context.push('/orders/${order.id}');
                },
              ),
              if (order.shipment.canOpenTracking) ...[
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.local_shipping_outlined),
                  title: const Text('Track order'),
                  onTap: () {
                    Navigator.pop(dialogContext);
                    openExternalUrl(
                      order.shipment.trackUrl,
                      context: context,
                      errorMessage: 'Could not open tracking link.',
                    );
                  },
                ),
              ],
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.description_outlined),
                title: const Text('Download invoice'),
                onTap: () {
                  Navigator.pop(dialogContext);
                  context.push('/orders/${order.id}/invoice');
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _OrderHeader extends StatelessWidget {
  const _OrderHeader({required this.order, required this.onMenuTap});

  final Order order;
  final VoidCallback onMenuTap;

  @override
  Widget build(BuildContext context) {
    final isDelivered = order.status == 'delivered';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Row(
            children: [
              Flexible(
                child: Text(
                  getBlinkitStatusLabel(order.status),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
              ),
              if (isDelivered) ...[
                const SizedBox(width: 6),
                Container(
                  width: 18,
                  height: 18,
                  decoration: const BoxDecoration(
                    color: Color(0xFF2E7D32),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check, size: 12, color: Colors.white),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          formatInr(order.total, withDecimals: false),
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 4),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onMenuTap,
            borderRadius: BorderRadius.circular(20),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderLight),
              ),
              child: const Icon(
                Icons.more_vert,
                size: 18,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProductThumbnailRow extends StatelessWidget {
  const _ProductThumbnailRow({required this.items});

  final List<OrderItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 61,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        cacheExtent: 120,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = items[index];
          return Product3DImage(imageUrl: item.image, size: 56);
        },
      ),
    );
  }
}

class _DeliveryRatingRow extends StatelessWidget {
  const _DeliveryRatingRow({required this.rating});

  final int rating;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Flexible(
          child: Text(
            'Your delivery experience rating:',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(5, (index) {
            return Icon(
              index < rating ? Icons.star_rounded : Icons.star_outline_rounded,
              size: 16,
              color: _actionPink,
            );
          }),
        ),
      ],
    );
  }
}

class _FooterAction extends StatelessWidget {
  const _FooterAction({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Center(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: _actionPink,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
