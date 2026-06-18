import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/app_bootstrap.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
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
      label: 'Cart',
      icon: Icons.shopping_cart_outlined,
      activeIcon: Icons.shopping_cart_rounded,
      showBadge: true,
    ),
    FlipkartNavItem(
      label: 'Account',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
    ),
  ];

  static const _authRequiredIndices = {2, 3};

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
    final cartCount = ref.watch(
      cartControllerProvider.select((s) => s.cartCount),
    );

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
      if (previous?.isLoggedIn != true && next.isLoggedIn) {
        bootstrapUserSession(ref);
      }
    });

    return const SizedBox.shrink();
  }
}
