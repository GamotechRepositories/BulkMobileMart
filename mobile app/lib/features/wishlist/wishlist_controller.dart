import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../models/product.dart';
import '../auth/auth_controller.dart';

class WishlistState {
  const WishlistState({
    this.items = const [],
    this.loading = false,
    this.toastImage,
  });

  final List<Product> items;
  final bool loading;
  final String? toastImage;

  Set<String> get ids => items.map((item) => item.id).toSet();

  WishlistState copyWith({
    List<Product>? items,
    bool? loading,
    String? toastImage,
    bool clearToast = false,
  }) {
    return WishlistState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      toastImage: clearToast ? null : (toastImage ?? this.toastImage),
    );
  }
}

final wishlistControllerProvider =
    NotifierProvider<WishlistController, WishlistState>(WishlistController.new);

/// Shared wishlist id set — one listener for grids instead of per-card scans.
final wishlistIdsProvider = Provider<Set<String>>((ref) {
  return ref.watch(wishlistControllerProvider.select((s) => s.ids));
});

class WishlistController extends Notifier<WishlistState> {
  Product? _pendingToggle;

  @override
  WishlistState build() {
    ref.listen(authControllerProvider, (previous, next) {
      final wasLoggedOut = previous?.isLoggedIn != true;
      if (wasLoggedOut && next.isLoggedIn) {
        _handleLogin();
      } else if (!next.isLoggedIn && previous?.isLoggedIn == true) {
        state = const WishlistState();
        _pendingToggle = null;
      }
    });

    return const WishlistState();
  }

  Future<void> _handleLogin() async {
    await loadWishlist();
    final pending = _pendingToggle;
    if (pending == null) return;
    _pendingToggle = null;
    await toggleWishlist(pending);
  }

  bool isWishlisted(String productId) => state.ids.contains(productId);

  Future<void> loadWishlist() async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) {
      state = const WishlistState();
      return;
    }

    state = state.copyWith(loading: true);
    try {
      final items = await ref.read(apiServiceProvider).fetchWishlistProducts();
      state = state.copyWith(items: items, loading: false);
    } catch (_) {
      state = state.copyWith(items: const [], loading: false);
    }
  }

  Future<bool> toggleWishlist(Product product) async {
    if (product.id.length < 10) return false;

    final auth = ref.read(authControllerProvider);
    if (!auth.isLoggedIn) {
      _pendingToggle = product;
      ref.read(authControllerProvider.notifier).openAuthModal();
      return false;
    }

    final wasWishlisted = isWishlisted(product.id);
    final optimistic = wasWishlisted
        ? state.items.where((item) => item.id != product.id).toList()
        : [...state.items, product];
    state = state.copyWith(items: optimistic);

    try {
      final response =
          await ref.read(apiServiceProvider).toggleWishlistItem(product.id);
      final body = response.data;
      final added = body is Map<String, dynamic> && body['added'] == true;
      if (added) {
        state = state.copyWith(toastImage: product.primaryImage);
        Future.delayed(const Duration(milliseconds: 2600), () {
          if (ref.mounted) clearToast();
        });
      }
      return true;
    } catch (_) {
      await loadWishlist();
      return false;
    }
  }

  void clearToast() {
    state = state.copyWith(clearToast: true);
  }
}
