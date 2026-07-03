import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme.dart';
import '../../../core/utils/address_utils.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/external_link.dart';
import '../../../core/utils/order_number.dart';
import '../../../core/utils/order_utils.dart';
import '../../../models/order.dart';
import '../../../widgets/common/product_3d_image.dart';
import '../delivery_rating_controller.dart';

const blinkitPink = Color(0xFFE23744);
const _invoiceBg = Color(0xFFF3EEFF);
const _invoiceText = Color(0xFF5B4FCF);
const _ratingBg = Color(0xFFFFF0F2);
const _billBg = Color(0xFFF8F8F8);
const _tabSelectedBg = Color(0xFFEEF0F4);

List<List<OrderItem>> splitOrderShipments(List<OrderItem> items) {
  if (items.length <= 6) return [items];
  final mid = (items.length / 2).ceil();
  return [items.sublist(0, mid), items.sublist(mid)];
}

String getOrderDisplayCode(Order order) {
  final number = order.orderNumber.trim();
  if (number.isNotEmpty) return number;
  return getOrderNumber(order);
}

class BlinkitOrderDetailBody extends ConsumerStatefulWidget {
  const BlinkitOrderDetailBody({
    super.key,
    required this.order,
    required this.onInvoice,
    required this.onOrderAgain,
  });

  final Order order;
  final VoidCallback onInvoice;
  final VoidCallback onOrderAgain;

  @override
  ConsumerState<BlinkitOrderDetailBody> createState() =>
      _BlinkitOrderDetailBodyState();
}

class _BlinkitOrderDetailBodyState extends ConsumerState<BlinkitOrderDetailBody> {
  int _selectedShipment = 0;

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final shipments = splitOrderShipments(order.items);
    final shipmentItems = shipments[_selectedShipment.clamp(0, shipments.length - 1)];
    final deliveryRating = ref.watch(deliveryRatingProvider(order.id));
    final orderCode = getOrderDisplayCode(order);
    final totalItems = order.items.fold<int>(0, (sum, item) => sum + item.quantity);
    final statusLabel = getBlinkitShipmentStatusLabel(
      order.status,
      shipmentStatus: order.shipment.displayStatus,
      hasTracking: order.shipment.hasTracking,
    );

    return Column(
      children: [
        _DetailHeader(
          orderCode: orderCode,
          itemCount: totalItems,
          onBack: () => context.pop(),
        ),
        if (shipments.length > 1)
          _ShipmentTabs(
            count: shipments.length,
            selected: _selectedShipment,
            onSelected: (index) => setState(() => _selectedShipment = index),
          ),
        Expanded(
          child: ColoredBox(
            color: Colors.white,
            child: ListView(
              padding: const EdgeInsets.only(bottom: 16),
              children: [
                if (order.status == 'delivered' && deliveryRating != null)
                  _RatingBanner(rating: deliveryRating),
                _ShipmentStatusBlock(
                  shipmentNumber: _selectedShipment + 1,
                  statusLabel: statusLabel,
                  isDelivered: order.status == 'delivered',
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                  child: Text(
                    '${shipmentItems.length} item${shipmentItems.length == 1 ? '' : 's'} in shipment',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                ...shipmentItems.map(
                  (item) => _ShipmentItemRow(item: item),
                ),
                if (order.shipment.hasTracking) ...[
                  const SizedBox(height: 8),
                  _EnviaTrackingCard(shipment: order.shipment),
                ],
                const SizedBox(height: 8),
                _BillSummary(order: order),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _DownloadInvoiceButton(onTap: widget.onInvoice),
                ),
                const SizedBox(height: 24),
                _OrderDetailsSection(order: order, orderCode: orderCode),
              ],
            ),
          ),
        ),
        _BottomOrderAgain(onTap: widget.onOrderAgain),
      ],
    );
  }
}

class _DetailHeader extends StatelessWidget {
  const _DetailHeader({
    required this.orderCode,
    required this.itemCount,
    required this.onBack,
  });

  final String orderCode;
  final int itemCount;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(8, 4, 12, 12),
        child: Row(
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onBack,
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: const Icon(Icons.chevron_left, size: 26),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order #$orderCode',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$itemCount item${itemCount == 1 ? '' : 's'}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShipmentTabs extends StatelessWidget {
  const _ShipmentTabs({
    required this.count,
    required this.selected,
    required this.onSelected,
  });

  final int count;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Row(
        children: List.generate(count, (index) {
          final isSelected = selected == index;
          return Padding(
            padding: EdgeInsets.only(right: index < count - 1 ? 10 : 0),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onSelected(index),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? _tabSelectedBg : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Shipment ${index + 1}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _RatingBanner extends StatelessWidget {
  const _RatingBanner({required this.rating});

  final int rating;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _ratingBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFFD6DC)),
      ),
      child: Row(
        children: [
          const Text(
            'You rated:',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 8),
          Row(
            children: List.generate(5, (index) {
              return Icon(
                index < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                size: 18,
                color: blinkitPink,
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _ShipmentStatusBlock extends StatelessWidget {
  const _ShipmentStatusBlock({
    required this.shipmentNumber,
    required this.statusLabel,
    required this.isDelivered,
  });

  final int shipmentNumber;
  final String statusLabel;
  final bool isDelivered;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: isDelivered ? const Color(0xFF2E7D32) : AppColors.navSelected,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              isDelivered ? Icons.check : Icons.local_shipping_outlined,
              size: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SHIPMENT $shipmentNumber >',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  statusLabel,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ShipmentItemRow extends StatelessWidget {
  const _ShipmentItemRow({required this.item});

  final OrderItem item;

  @override
  Widget build(BuildContext context) {
    final lineTotal = item.price * item.quantity;
    final unitLabel = item.quantity == 1 ? '1 unit' : '${item.quantity} units';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Product3DImage(imageUrl: item.image, size: 56),
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
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.quantity} item${item.quantity == 1 ? '' : 's'} · $unitLabel',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            formatInr(lineTotal, withDecimals: true),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _BillSummary extends StatelessWidget {
  const _BillSummary({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final deliveryFree = order.deliveryCharges == 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _billBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.receipt_long_outlined, size: 18, color: AppColors.textPrimary),
              SizedBox(width: 8),
              Text(
                'Bill Summary',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _BillRow(
            label: 'Item total',
            value: formatInr(order.subtotal, withDecimals: true),
          ),
          const SizedBox(height: 10),
          _BillRow(
            label: 'Delivery fee',
            value: deliveryFree ? 'FREE' : formatInr(order.deliveryCharges, withDecimals: true),
            valueColor: deliveryFree ? const Color(0xFF2E7D32) : null,
            strikeValue: deliveryFree ? '₹30' : null,
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1, color: AppColors.borderLight),
          ),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Total Bill',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Text(
                formatInr(order.total, withDecimals: false),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BillRow extends StatelessWidget {
  const _BillRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.strikeValue,
  });

  final String label;
  final String value;
  final Color? valueColor;
  final String? strikeValue;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        if (strikeValue != null) ...[
          Text(
            strikeValue!,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              decoration: TextDecoration.lineThrough,
            ),
          ),
          const SizedBox(width: 8),
        ],
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _DownloadInvoiceButton extends StatelessWidget {
  const _DownloadInvoiceButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _invoiceBg,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Center(
            child: Text(
              'Download Invoice / Credit Note',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: _invoiceText,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderDetailsSection extends StatelessWidget {
  const _OrderDetailsSection({
    required this.order,
    required this.orderCode,
  });

  final Order order;
  final String orderCode;

  @override
  Widget build(BuildContext context) {
    final addr = order.deliveryAddress;
    final receiverName = getAddressFullName(addr);
    final phone = addr.number.trim().isNotEmpty ? '+91 ${addr.number.trim()}' : '';
    final shipments = splitOrderShipments(order.items);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Order Details',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _DetailField(
            label: 'Order ID',
            value: orderCode,
            trailing: IconButton(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: orderCode));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Order ID copied'),
                    behavior: SnackBarBehavior.floating,
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              icon: const Icon(Icons.copy_outlined, size: 18),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ),
          if (receiverName.isNotEmpty || phone.isNotEmpty)
            _DetailField(
              label: 'Receiver details',
              value: [receiverName, phone].where((v) => v.isNotEmpty).join(', '),
            ),
          _DetailField(
            label: 'Delivery Address',
            value: formatAddressLine(addr),
          ),
          _DetailField(
            label: 'Order placed at',
            value: formatOrderDateTime(order.createdAt),
          ),
          if (order.shipment.hasTracking) ...[
            _DetailField(
              label: 'Tracking number',
              value: order.shipment.trackingNumber,
              trailing: IconButton(
                onPressed: () {
                  Clipboard.setData(
                    ClipboardData(text: order.shipment.trackingNumber),
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Tracking number copied'),
                      behavior: SnackBarBehavior.floating,
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                icon: const Icon(Icons.copy_outlined, size: 18),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ),
            _DetailField(
              label: 'Shipment status',
              value: order.shipment.displayStatus,
            ),
            if (order.shipment.carrierServiceLabel != null)
              _DetailField(
                label: 'Carrier / Service',
                value: order.shipment.carrierServiceLabel!,
              ),
            if (order.shipment.trackUrl.trim().isNotEmpty)
              _DetailField(
                label: 'Track package',
                value: 'Open live tracking',
                onTap: () => openExternalUrl(
                  order.shipment.trackUrl,
                  context: context,
                  errorMessage: 'Could not open tracking link.',
                ),
                valueColor: AppColors.navSelected,
              ),
          ],
          if (order.status == 'delivered')
            for (var i = 0; i < shipments.length; i++)
              _DetailField(
                label: 'Shipment ${i + 1} arrived at',
                value: formatOrderDateTime(order.createdAt),
              ),
          _DetailField(
            label: 'Payment mode',
            value: order.paymentMethod == 'cod' ? 'Cash on Delivery' : 'Online',
          ),
          _DetailField(
            label: 'Payment status',
            value: getOrderPaymentLabel(order),
          ),
        ],
      ),
    );
  }
}

class _EnviaTrackingCard extends StatelessWidget {
  const _EnviaTrackingCard({required this.shipment});

  final OrderShipment shipment;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F8FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFD6E6FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.local_shipping_outlined, size: 18, color: AppColors.navSelected),
              SizedBox(width: 8),
              Text(
                'Shipment Tracking',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            shipment.trackingNumber,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            shipment.displayStatus,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          if (shipment.carrierServiceLabel != null) ...[
            const SizedBox(height: 4),
            Text(
              shipment.carrierServiceLabel!,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ],
          if (shipment.trackUrl.trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: () => openExternalUrl(
                shipment.trackUrl,
                context: context,
                errorMessage: 'Could not open tracking link.',
              ),
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: const Text('Open live tracking'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.navSelected,
                side: const BorderSide(color: Color(0xFFB8D4FF)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailField extends StatelessWidget {
  const _DetailField({
    required this.label,
    required this.value,
    this.trailing,
    this.onTap,
    this.valueColor,
  });

  final String label;
  final String value;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final valueWidget = Text(
      value,
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: valueColor ?? AppColors.textPrimary,
        height: 1.35,
        decoration: onTap != null ? TextDecoration.underline : null,
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: onTap == null
                    ? valueWidget
                    : InkWell(
                        onTap: onTap,
                        child: valueWidget,
                      ),
              ),
              ?trailing,
            ],
          ),
        ],
      ),
    );
  }
}

class _BottomOrderAgain extends StatelessWidget {
  const _BottomOrderAgain({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.borderLight)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton(
            onPressed: onTap,
            style: FilledButton.styleFrom(
              backgroundColor: blinkitPink,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Order Again',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String getBlinkitShipmentStatusLabel(
  String status, {
  String shipmentStatus = '',
  bool hasTracking = false,
}) {
  if (hasTracking && shipmentStatus.trim().isNotEmpty) {
    return shipmentStatus.trim();
  }

  switch (status) {
    case 'delivered':
      return 'Delivered';
    case 'shipping':
    case 'shipped':
      return 'On the way';
    case 'processing':
      return 'Preparing';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Confirmed';
  }
}
