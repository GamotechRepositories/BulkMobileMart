import 'dart:convert';

import 'package:facebook_app_events/facebook_app_events.dart';
import 'package:flutter/foundation.dart';

import '../core/utils/product_pricing.dart';
import '../models/cart_item.dart';
import '../models/product.dart';
import '../models/user.dart';

/// Facebook App Events analytics — shared instance and e-commerce helpers.
class FacebookAppEventsService {
  FacebookAppEventsService._();

  static final FacebookAppEventsService instance = FacebookAppEventsService._();

  final FacebookAppEvents facebookAppEvents = FacebookAppEvents();

  static const _currency = 'INR';
  static const _contentType = 'product';

  bool _initialized = false;
  final Set<String> _viewedProductIds = <String>{};

  Future<void> initialize() async {
    if (_initialized) return;

    if (kDebugMode) {
      debugPrint('FacebookAppEventsService: initialized');
    }

    _initialized = true;
  }

  Future<void> logViewProduct(Product product, {double? unitPrice}) async {
    if (product.id.isEmpty) return;
    if (!_viewedProductIds.add(product.id)) return;

    final price = unitPrice ??
        (product.discountedPrice > 0 ? product.discountedPrice : product.price);

    await _safeCall(
      () => facebookAppEvents.logViewContent(
        id: product.id,
        type: _contentType,
        currency: _currency,
        price: price,
        content: {
          'id': product.id,
          'quantity': 1,
          'item_price': price,
        },
        parameters: {
          'fb_content_name': product.name,
        },
      ),
      'ViewContent',
    );
  }

  Future<void> logAddProductToCart(
    Product product,
    int quantity, {
    String variantName = '',
  }) async {
    if (product.id.isEmpty || quantity < 1) return;

    final unitPrice = getUnitPriceForQuantity(product, quantity, variantName);
    final lineTotal = unitPrice * quantity;

    await _safeCall(
      () => facebookAppEvents.logAddToCart(
        id: product.id,
        type: _contentType,
        currency: _currency,
        price: lineTotal,
        content: {
          'id': product.id,
          'quantity': quantity,
          'item_price': unitPrice,
        },
        parameters: {
          'fb_content_name': product.name,
        },
      ),
      'AddToCart',
    );
  }

  Future<void> logInitiatedCheckout({
    required List<CartItem> items,
    required double total,
    required int numItems,
  }) async {
    if (items.isEmpty || total <= 0) return;

    await _safeCall(
      () => facebookAppEvents.logInitiatedCheckout(
        totalPrice: total,
        currency: _currency,
        contentType: _contentType,
        numItems: numItems,
        paymentInfoAvailable: true,
        parameters: {
          'fb_content': jsonEncode(_cartContents(items)),
        },
      ),
      'InitiatedCheckout',
    );
  }

  Future<void> logPurchase({
    required double amount,
    required int numItems,
    String? orderId,
    List<CartItem> items = const [],
  }) async {
    if (amount <= 0) return;

    await _safeCall(
      () => facebookAppEvents.logPurchase(
        amount: amount,
        currency: _currency,
        parameters: {
          if (orderId != null && orderId.isNotEmpty)
            FacebookAppEvents.paramNameOrderId: orderId,
          if (numItems > 0) FacebookAppEvents.paramNameNumItems: numItems,
          if (items.isNotEmpty) 'fb_content': jsonEncode(_cartContents(items)),
        },
      ),
      'Purchase',
    );
  }

  Future<void> logLogin({String method = 'phone_otp'}) async {
    await _safeCall(
      () => facebookAppEvents.logEvent(
        name: 'Login',
        parameters: {'method': method},
      ),
      'Login',
    );
  }

  Future<void> logCompletedRegistration({String method = 'phone_otp'}) async {
    await _safeCall(
      () => facebookAppEvents.logCompletedRegistration(
        registrationMethod: method,
      ),
      'CompleteRegistration',
    );
  }

  Future<void> identifyUser(User user) async {
    if (user.id.isEmpty) return;

    await _safeCall(
      () => facebookAppEvents.setUserID(user.id),
      'setUserID',
    );

    await _safeCall(
      () => facebookAppEvents.setUserData(
        email: user.email.trim().isNotEmpty ? user.email.trim() : null,
        phone: user.phone.trim().isNotEmpty ? user.phone.trim() : null,
        firstName: user.name.trim().isNotEmpty ? user.name.trim() : null,
        externalId: user.id,
      ),
      'setUserData',
    );
  }

  Future<void> clearUserIdentity() async {
    await _safeCall(() => facebookAppEvents.clearUserID(), 'clearUserID');
    await _safeCall(() => facebookAppEvents.clearUserData(), 'clearUserData');
  }

  List<Map<String, dynamic>> _cartContents(List<CartItem> items) {
    return items
        .map(
          (item) => {
            'id': item.id,
            'quantity': item.quantity,
            'item_price': item.unitPrice,
          },
        )
        .toList();
  }

  Future<void> _safeCall(Future<void> Function() action, String label) async {
    try {
      await action();
      if (kDebugMode) {
        debugPrint('FacebookAppEventsService: $label logged');
      }
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('FacebookAppEventsService: $label failed — $error');
        debugPrint('$stackTrace');
      }
    }
  }
}
