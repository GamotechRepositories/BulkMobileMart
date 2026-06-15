import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../features/home/home_fallback_data.dart';
import '../../models/cart_item.dart';
import '../../models/product.dart';
import '../auth/auth_controller.dart';

enum AddToCartResult { success, requiresLogin, failed }

class PendingCartAction {
  const PendingCartAction({
    required this.product,
    required this.quantity,
    this.buyNow = false,
  });

  final Product product;
  final int quantity;
  final bool buyNow;
}

class CartState {
  const CartState({
    this.items = const [],
    this.loading = false,
    this.toastImage,
    this.navigateToCheckout = false,
    this.errorMessage,
  });

  final List<CartItem> items;
  final bool loading;
  final String? toastImage;
  final bool navigateToCheckout;
  final String? errorMessage;

  int get cartCount => items.fold(0, (sum, item) => sum + item.quantity);

  CartState copyWith({
    List<CartItem>? items,
    bool? loading,
    String? toastImage,
    bool clearToast = false,
    bool navigateToCheckout = false,
    bool clearCheckoutNav = false,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CartState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      toastImage: clearToast ? null : (toastImage ?? this.toastImage),
      navigateToCheckout: clearCheckoutNav
          ? false
          : (navigateToCheckout || this.navigateToCheckout),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final cartControllerProvider =
    NotifierProvider<CartController, CartState>(CartController.new);

class CartController extends Notifier<CartState> {
  PendingCartAction? _pending;

  @override
  CartState build() {
    ref.listen(authControllerProvider, (previous, next) {
      final wasLoggedOut = previous?.isLoggedIn != true;
      if (wasLoggedOut && next.isLoggedIn) {
        _handleLogin();
      } else if (!next.isLoggedIn && previous?.isLoggedIn == true) {
        state = const CartState();
        _pending = null;
      }
    });

    return const CartState();
  }

  Future<void> _handleLogin() async {
    await loadCart();
    final pending = _pending;
    if (pending == null) return;
    _pending = null;

    final result = await addToCart(
      pending.product,
      pending.quantity,
      buyNow: pending.buyNow,
    );

    if (result == AddToCartResult.success && pending.buyNow) {
      clearToast();
      state = state.copyWith(navigateToCheckout: true);
    }
  }

  Future<void> loadCart({bool silent = false}) async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) {
      state = const CartState();
      return;
    }

    if (!silent) {
      state = state.copyWith(loading: true);
    }
    try {
      final items = await ref.read(apiServiceProvider).fetchCartItems();
      state = state.copyWith(items: items, loading: false);
    } catch (_) {
      state = state.copyWith(items: const [], loading: false);
    }
  }

  Future<AddToCartResult> addToCart(
    Product product,
    int quantity, {
    bool buyNow = false,
  }) async {
    if (quantity < 1) return AddToCartResult.failed;

    if (product.id.isEmpty || isFallbackProductId(product.id)) {
      state = state.copyWith(
        errorMessage: 'This product is not available to order right now.',
      );
      return AddToCartResult.failed;
    }

    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) {
      _pending = PendingCartAction(
        product: product,
        quantity: quantity,
        buyNow: buyNow,
      );
      ref.read(authControllerProvider.notifier).openAuthModal();
      return AddToCartResult.requiresLogin;
    }

    try {
      await ref.read(apiServiceProvider).addToCartItem({
        'productId': product.id,
        'quantity': quantity,
      });
      await loadCart(silent: true);

      if (!buyNow) {
        state = state.copyWith(toastImage: product.primaryImage, clearError: true);
        Future.delayed(const Duration(milliseconds: 2600), () {
          if (ref.mounted) clearToast();
        });
      } else {
        state = state.copyWith(navigateToCheckout: true, clearError: true);
      }

      return AddToCartResult.success;
    } catch (error) {
      state = state.copyWith(errorMessage: authErrorMessage(error));
      return AddToCartResult.failed;
    }
  }

  void clearToast() {
    state = state.copyWith(clearToast: true);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void clearCheckoutNavigation() {
    state = state.copyWith(clearCheckoutNav: true);
  }

  Future<void> removeFromCart(String productId) async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) return;

    final previous = state.items;
    state = state.copyWith(
      items: previous.where((item) => item.id != productId).toList(),
    );

    try {
      await ref.read(apiServiceProvider).removeFromCartItem(productId);
    } catch (_) {
      state = state.copyWith(items: previous);
    }
  }

  Future<void> updateQuantity(String productId, int quantity) async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) return;

    if (quantity < 1) {
      await removeFromCart(productId);
      return;
    }

    final previous = state.items;
    state = state.copyWith(
      items: previous
          .map(
            (item) => item.id == productId ? item.copyWith(quantity: quantity) : item,
          )
          .toList(),
    );

    try {
      await ref.read(apiServiceProvider).updateCartItemQty(productId, quantity);
    } catch (_) {
      state = state.copyWith(items: previous);
    }
  }

  Future<void> clearCart() async {
    final items = List<CartItem>.from(state.items);
    if (items.isEmpty) return;

    final previous = state.items;
    state = state.copyWith(items: const []);

    try {
      await Future.wait(
        items.map(
          (item) => ref.read(apiServiceProvider).removeFromCartItem(item.id),
        ),
      );
    } catch (_) {
      await loadCart(silent: true);
      if (state.items.isEmpty) {
        state = state.copyWith(items: previous);
      }
    }
  }
}
