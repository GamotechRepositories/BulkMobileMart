import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../features/wishlist/wishlist_controller.dart';

/// Loads user-specific data after login or on app resume.
void bootstrapUserSession(WidgetRef ref) {
  final auth = ref.read(authControllerProvider);
  if (!auth.isLoggedIn || auth.loading) return;

  ref.read(cartControllerProvider.notifier).loadCart();
  ref.read(wishlistControllerProvider.notifier).loadWishlist();
}
