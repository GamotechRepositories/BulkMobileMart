import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/app_bootstrap.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../routes/app_router.dart';
import '../../routes/route_paths.dart';
import 'cart/added_to_cart_toast.dart';
import 'common/app_splash.dart';
import 'common/offline_banner.dart';
import 'layout/flipkart_bottom_nav.dart';
import 'layout/mobile_header.dart';
import 'wishlist/wishlist_toast.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  static const _tabs = <FlipkartNavItem>[
    FlipkartNavItem(
      label: 'Home',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    FlipkartNavItem(
      label: 'Categories',
      icon: Icons.grid_view_outlined,
      activeIcon: Icons.grid_view_rounded,
    ),
    FlipkartNavItem(
      label: 'Orders',
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long_rounded,
    ),
    FlipkartNavItem(
      label: 'Account',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
    ),
    FlipkartNavItem(
      label: 'Cart',
      icon: Icons.shopping_cart_outlined,
      activeIcon: Icons.shopping_cart_rounded,
      showBadge: true,
    ),
  ];

  static const _authRequiredIndices = {2, 4};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeBootstrap());
  }

  void _maybeBootstrap() {
    bootstrapUserSession(ref);
  }

  void _onTap(int index) {
    final auth = ref.read(authControllerProvider);

    if (_authRequiredIndices.contains(index) && !auth.isLoggedIn) {
      ref.read(authControllerProvider.notifier).openAuthModal();
      return;
    }

    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authLoading = ref.watch(
      authControllerProvider.select((s) => s.loading),
    );
    final cartCount = ref.watch(
      cartControllerProvider.select((s) => s.cartCount),
    );

    if (authLoading) {
      return const AppSplash();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F5F7),
      body: OfflineBannerHost(
        child: Stack(
          children: [
            Column(
              children: [
                MobileHeader(
                  showSearchBar: widget.navigationShell.currentIndex != 0,
                ),
                Expanded(child: widget.navigationShell),
              ],
            ),
            const _ShellSideEffects(),
            const AddedToCartToast(),
            const WishlistToast(),
          ],
        ),
      ),
      bottomNavigationBar: FlipkartBottomNav(
        currentIndex: widget.navigationShell.currentIndex,
        items: _tabs,
        cartBadgeCount: cartCount,
        onTap: _onTap,
      ),
    );
  }
}

/// Side-effect listeners isolated so cart/auth updates don't rebuild the shell tree.
class _ShellSideEffects extends ConsumerWidget {
  const _ShellSideEffects();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen(authControllerProvider, (previous, next) {
      if (previous?.loading == true && !next.loading) {
        bootstrapUserSession(ref);
      } else if (previous?.isLoggedIn != true && next.isLoggedIn) {
        bootstrapUserSession(ref);
      }
    });

    ref.listen(cartControllerProvider, (previous, next) {
      if (next.navigateToCheckout) {
        ref.read(cartControllerProvider.notifier).clearCheckoutNavigation();
        ref.read(routerProvider).push(RoutePaths.checkout);
      }
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        final message = next.errorMessage!;
        ref.read(cartControllerProvider.notifier).clearError();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    });

    return const SizedBox.shrink();
  }
}
