import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../core/utils/product_search.dart';
import '../../core/utils/external_link.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/home/home_providers.dart';
import '../../features/wishlist/wishlist_controller.dart';
import '../../models/category.dart';
import '../../routes/route_paths.dart';
import '../common/app_logo.dart';
import '../common/fly_target_anchor.dart';
import '../common/nav_icon_locator.dart';
import '../common/whatsapp_icon.dart';
import 'mobile_search_bar.dart';

class MobileHeader extends ConsumerStatefulWidget {
  const MobileHeader({
    super.key,
    this.showSearchBar = true,
  });

  /// When false, search bar is rendered inside the home scroll view instead.
  final bool showSearchBar;

  @override
  ConsumerState<MobileHeader> createState() => _MobileHeaderState();
}

class _MobileHeaderState extends ConsumerState<MobileHeader> {
  static const _homeBottomRadius = 22.0;

  final _searchFocusNode = FocusNode();

  void _openMenu() {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Menu',
      barrierColor: Colors.black54,
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.centerLeft,
          child: _MobileMenuDrawer(
            onClose: () => Navigator.of(context).pop(),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(-1, 0),
            end: Offset.zero,
          ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)),
          child: child,
        );
      },
    );
  }

  Future<void> _openWhatsAppGroup() async {
    await openExternalUrl(
      AppConstants.whatsAppGroupUrl,
      context: context,
      errorMessage: 'Could not open WhatsApp.',
    );
  }

  @override
  void dispose() {
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchBottomPadding = widget.showSearchBar ? 12.0 : 0.0;
    final topInset = MediaQuery.paddingOf(context).top;
    final wishlistCount = ref.watch(
      wishlistControllerProvider.select((s) => s.items.length),
    );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.storefrontHeaderOverlay,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius: widget.showSearchBar
                ? BorderRadius.zero
                : const BorderRadius.only(
                    bottomLeft: Radius.circular(_homeBottomRadius),
                    bottomRight: Radius.circular(_homeBottomRadius),
                  ),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.headerPrimary,
                    AppColors.headerPrimaryLight,
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Padding(
                padding: EdgeInsets.only(top: topInset),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
                  child: Row(
                    children: [
                      _HeaderIconButton(
                        icon: Icons.menu_rounded,
                        onPressed: _openMenu,
                        light: true,
                      ),
                      const Expanded(
                        child: Center(
                          child: AppLogo(height: 42),
                        ),
                      ),
                      _HeaderIconButton(
                        onPressed: _openWhatsAppGroup,
                        light: true,
                        child: const WhatsAppIcon(size: 22),
                      ),
                      const SizedBox(width: 4),
                      FlyTargetAnchor(
                        onReport: NavIconLocator.reportWishlist,
                        onClear: NavIconLocator.clearWishlist,
                        child: _HeaderIconButton(
                          icon: Icons.favorite_border_rounded,
                          onPressed: () => context.go(RoutePaths.wishlist),
                          light: true,
                          badgeCount: wishlistCount,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (widget.showSearchBar)
            ColoredBox(
              color: AppColors.headerSearchBg,
              child: Padding(
                padding: EdgeInsets.fromLTRB(12, 8, 12, searchBottomPadding),
                child: MobileSearchBar(focusNode: _searchFocusNode),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    super.key,
    this.icon,
    this.child,
    required this.onPressed,
    this.light = false,
    this.badgeCount = 0,
  }) : assert(icon != null || child != null);

  final IconData? icon;
  final Widget? child;
  final VoidCallback onPressed;
  final bool light;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: light
          ? Colors.white.withValues(alpha: 0.28)
          : const Color(0xFFF5F5F5),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              child ??
                  Icon(
                    icon,
                    size: 22,
                    color: light ? Colors.white : AppColors.textPrimary,
                  ),
              if (badgeCount > 0)
                Positioned(
                  right: 0,
                  top: 0,
                  child: _HeaderBadge(count: badgeCount),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderBadge extends StatelessWidget {
  const _HeaderBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : '$count';
    final minWidth = count > 9 ? 18.0 : 16.0;

    return Container(
      constraints: BoxConstraints(minWidth: minWidth, minHeight: 16),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: AppColors.navBadge,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white, width: 1.2),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          height: 1,
        ),
      ),
    );
  }
}

class _MobileMenuDrawer extends ConsumerWidget {
  const _MobileMenuDrawer({
    required this.onClose,
  });

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final categories = categoriesAsync.value ?? const <Category>[];
    final isLoggedIn = ref.watch(
      authControllerProvider.select((s) => s.isLoggedIn),
    );
    final userName = ref.watch(
      authControllerProvider.select((s) => s.user?.name ?? ''),
    );
    final userEmail = ref.watch(
      authControllerProvider.select((s) => s.user?.email ?? ''),
    );
    final width = MediaQuery.sizeOf(context).width * 0.82;

    void navigate(String path, {bool requiresAuth = false}) {
      if (requiresAuth && !isLoggedIn) {
        onClose();
        ref.read(authControllerProvider.notifier).openAuthModal();
        return;
      }
      onClose();
      context.go(path);
    }

    return Material(
      color: Colors.white,
      child: SizedBox(
        width: width.clamp(0, 320),
        height: double.infinity,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const AppLogo(height: 36),
                    const Spacer(),
                    IconButton(
                      onPressed: onClose,
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              if (!isLoggedIn)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: FilledButton(
                    onPressed: () {
                      onClose();
                      ref.read(authControllerProvider.notifier).openAuthModal();
                    },
                    child: const Text('Login / Register'),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                      child: Text(
                        userName.isNotEmpty ? userName[0].toUpperCase() : '?',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    title: Text(
                      userName,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(userEmail),
                  ),
                ),
              const Divider(height: 24),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  children: [
                    _MenuTile(
                      icon: Icons.home_outlined,
                      label: 'Home',
                      onTap: () => navigate(RoutePaths.home),
                    ),
                    _MenuTile(
                      icon: Icons.grid_view_rounded,
                      label: 'All Products',
                      onTap: () => navigate(RoutePaths.product),
                    ),
                    _MenuTile(
                      icon: Icons.favorite_border,
                      label: 'Wishlist',
                      onTap: () =>
                          navigate(RoutePaths.wishlist, requiresAuth: true),
                    ),
                    _MenuTile(
                      icon: Icons.receipt_long_outlined,
                      label: 'My Orders',
                      onTap: () =>
                          navigate(RoutePaths.orders, requiresAuth: true),
                    ),
                    _MenuTile(
                      icon: Icons.person_outline,
                      label: 'Account',
                      onTap: () => navigate(RoutePaths.profile),
                    ),
                    _MenuTile(
                      icon: Icons.support_agent_outlined,
                      label: 'Support',
                      onTap: () => navigate(RoutePaths.support),
                    ),
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Text(
                        'CATEGORIES',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    ...categories.map(
                      (category) => _MenuTile(
                        label: category.categoryName,
                        onTap: () {
                          onClose();
                          context.go(
                            ProductSearch.buildPath(
                              categoryName: category.categoryName,
                            ),
                          );
                        },
                      ),
                    ),
                    if (isLoggedIn) ...[
                      const Divider(),
                      _MenuTile(
                        icon: Icons.logout_rounded,
                        label: 'Logout',
                        onTap: () {
                          onClose();
                          ref.read(authControllerProvider.notifier).logout();
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.label,
    required this.onTap,
    this.icon,
  });

  final String label;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: icon != null
          ? Icon(icon, size: 20, color: AppColors.textSecondary)
          : null,
      title: Text(label),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    );
  }
}
