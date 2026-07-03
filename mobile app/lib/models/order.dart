import 'address.dart';
import '../core/utils/json_parsers.dart';

class OrderShipment {
  const OrderShipment({
    this.provider = '',
    this.carrier = '',
    this.service = '',
    this.trackingNumber = '',
    this.trackUrl = '',
    this.labelUrl = '',
    this.status = '',
    this.statusMessage = '',
  });

  final String provider;
  final String carrier;
  final String service;
  final String trackingNumber;
  final String trackUrl;
  final String labelUrl;
  final String status;
  final String statusMessage;

  bool get hasTracking => trackingNumber.trim().isNotEmpty;

  String get displayStatus {
    final value = status.trim().isNotEmpty ? status.trim() : statusMessage.trim();
    return value.isNotEmpty ? value : 'Tracking in progress';
  }

  String? get carrierServiceLabel {
    final parts = [carrier, service].where((part) => part.trim().isNotEmpty).toList();
    if (parts.isEmpty) return null;
    return parts.join(' / ');
  }

  factory OrderShipment.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const OrderShipment();
    return OrderShipment(
      provider: json['provider']?.toString() ?? '',
      carrier: json['carrier']?.toString() ?? '',
      service: json['service']?.toString() ?? '',
      trackingNumber: json['trackingNumber']?.toString() ?? '',
      trackUrl: json['trackUrl']?.toString() ?? '',
      labelUrl: json['labelUrl']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      statusMessage: json['statusMessage']?.toString() ?? '',
    );
  }
}

class OrderItem {
  const OrderItem({
    required this.id,
    required this.productId,
    required this.name,
    required this.brandName,
    required this.price,
    required this.quantity,
    this.image = '',
    this.variantName = '',
    this.colorName = '',
  });

  final String id;
  final String productId;
  final String name;
  final String brandName;
  final double price;
  final int quantity;
  final String image;
  final String variantName;
  final String colorName;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    return OrderItem(
      id: parseJsonId(json),
      productId: parseNestedId(product) ?? '',
      name: json['name']?.toString() ?? '',
      brandName: json['brandName']?.toString() ?? '',
      price: _toDouble(json['price']),
      quantity: _toInt(json['quantity']),
      image: json['image']?.toString() ??
          json['productImage']?.toString() ??
          (product is Map<String, dynamic>
              ? (product['productImages'] as List<dynamic>? ?? []).firstOrNull
                  ?.toString() ??
              ''
              : ''),
      variantName: json['variantName']?.toString() ?? '',
      colorName: json['colorName']?.toString() ?? '',
    );
  }
}
class Order {
  const Order({
    required this.id,
    required this.orderNumber,
    required this.items,
    required this.deliveryAddress,
    required this.paymentMethod,
    required this.subtotal,
    required this.deliveryCharges,
    required this.total,
    required this.status,
    required this.paymentStatus,
    this.message = '',
    this.customerMessage = '',
    this.createdAt,
    this.codAdvancePaidAt,
    this.razorpayPaymentId = '',
    this.razorpayOrderId = '',
    this.paidAt,
    this.shipment = const OrderShipment(),
  });

  final String id;
  final String orderNumber;
  final List<OrderItem> items;
  final Address deliveryAddress;
  final String paymentMethod;
  final double subtotal;
  final double deliveryCharges;
  final double total;
  final String status;
  final String paymentStatus;
  final String message;
  final String customerMessage;
  final DateTime? createdAt;
  final DateTime? codAdvancePaidAt;
  final String razorpayPaymentId;
  final String razorpayOrderId;
  final DateTime? paidAt;
  final OrderShipment shipment;

  factory Order.fromJson(Map<String, dynamic> json) {
    final addressJson = json['deliveryAddress'];
    return Order(
      id: parseJsonId(json),
      orderNumber: json['orderNumber']?.toString() ?? '',
      items: (json['items'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(OrderItem.fromJson)
          .toList(),
      deliveryAddress: addressJson is Map<String, dynamic>
          ? Address.fromJson(addressJson)
          : const Address(
              id: '',
              fullName: '',
              number: '',
              email: '',
              shopNo: '',
              shopName: '',
              fullAddress: '',
              landmark: '',
              city: '',
              state: '',
              pincode: '',
            ),
      paymentMethod: json['paymentMethod']?.toString() ?? '',
      subtotal: _toDouble(json['subtotal']),
      deliveryCharges: _toDouble(json['deliveryCharges']),
      total: _toDouble(json['total']),
      status: json['status']?.toString() ?? '',
      paymentStatus: json['paymentStatus']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      customerMessage: (json['customerMessage'] ??
              json['customerNote'] ??
              json['message'])
          ?.toString() ??
          '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      codAdvancePaidAt: json['codAdvancePaidAt'] != null
          ? DateTime.tryParse(json['codAdvancePaidAt'].toString())
          : null,
      razorpayPaymentId: json['razorpayPaymentId']?.toString() ?? '',
      razorpayOrderId: json['razorpayOrderId']?.toString() ?? '',
      paidAt: json['paidAt'] != null
          ? DateTime.tryParse(json['paidAt'].toString())
          : null,
      shipment: json['shipment'] is Map<String, dynamic>
          ? OrderShipment.fromJson(json['shipment'] as Map<String, dynamic>)
          : const OrderShipment(),
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
