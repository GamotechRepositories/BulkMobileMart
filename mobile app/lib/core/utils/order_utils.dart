import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/order.dart';

const orderStatusLabels = <String, String>{
  'attempted': 'Attempted',
  'confirm': 'Confirm',
  'processing': 'Processing',
  'shipping': 'Shipping',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
  'pending': 'Confirm',
  'confirmed': 'Confirm',
  'shipped': 'Shipping',
};

const paymentStatusLabels = <String, String>{
  'paid': 'Paid',
  'unpaid': 'Unpaid',
  'refundable': 'Refundable',
  'pending_verification': 'Payment verification pending',
};

const orderSteps = ['Confirm', 'Processing', 'Shipping', 'Delivered', 'Cancelled'];

const orderStatusStepIndex = <String, int>{
  'attempted': -1,
  'confirm': 0,
  'processing': 1,
  'shipping': 2,
  'delivered': 3,
  'cancelled': 4,
  'pending': 0,
  'confirmed': 0,
  'shipped': 2,
};

String getOrderStatusLabel(String status) {
  return orderStatusLabels[status] ?? status;
}

String getOrderPaymentStatus(Order order) {
  if (order.paymentMethod == 'cod' && order.codAdvancePaidAt != null) {
    return 'advance_paid';
  }
  return order.paymentStatus.isNotEmpty ? order.paymentStatus : 'unpaid';
}

String getOrderPaymentLabel(Order order) {
  final status = getOrderPaymentStatus(order);
  if (status == 'advance_paid') return 'COD advance paid';
  return paymentStatusLabels[status] ?? status;
}

bool showOrderPaymentBadge(Order order) {
  final status = getOrderPaymentStatus(order);
  return status != 'unpaid' || order.paymentStatus == 'pending_verification';
}

Color getOrderStatusColor(String status) {
  switch (status) {
    case 'attempted':
      return Colors.amber.shade700;
    case 'processing':
      return Colors.purple;
    case 'shipping':
    case 'shipped':
      return Colors.indigo;
    case 'delivered':
      return Colors.green;
    case 'cancelled':
      return Colors.red;
    default:
      return Colors.blue;
  }
}

Color getOrderPaymentColor(Order order) {
  final status = getOrderPaymentStatus(order);
  if (status == 'advance_paid' || status == 'paid') return Colors.green;
  if (status == 'refundable') return Colors.orange;
  if (status == 'pending_verification') return Colors.amber.shade800;
  return Colors.amber;
}

String formatOrderDate(DateTime? date) {
  if (date == null) return '—';
  return DateFormat('d MMM y').format(date);
}

String formatOrderDateTime(DateTime? date) {
  if (date == null) return '—';
  return DateFormat('d MMM y, hh:mm a').format(date);
}

String getOrderMessage(Order order) {
  final text = (order.customerMessage.isNotEmpty
          ? order.customerMessage
          : order.message)
      .trim();
  return text.isEmpty ? '—' : text;
}

String? getPrimaryProductId(Order order) {
  if (order.items.isEmpty) return null;
  final id = order.items.first.productId;
  return id.isEmpty ? null : id;
}
