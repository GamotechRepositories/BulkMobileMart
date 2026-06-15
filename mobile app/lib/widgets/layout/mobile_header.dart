import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/utils/product_search.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/home/home_providers.dart';
import '../../models/category.dart';
import '../../routes/route_paths.dart';
import '../common/app_logo.dart';
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
  final _searchFocusNode = FocusNode();

  void _openMenu() {
    ref.read(categoriesProvider.future).then((categories) {
      if (!mounted) return;
      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: 'Menu',
        barrierColor: Colors.black54,
        pageBuilder: (context, animation, secondaryAnimation) {
          return Align(
            alignment: Alignment.centerLeft,
            child: _MobileMenuDrawer(
              categories: categories,
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
    });
  }

  @override
  void dispose() {
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchBottomPadding = widget.showSearchBar ? 12.0 : 0.0;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.storefrontHeaderOverlay,
      child: Material(
        color: Colors.white,
        elevation: 0,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DecoratedBox(
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
              child: SafeArea(
                bottom: false,
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
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          _HeaderIconButton(
                            icon: Icons.notifications_none_rounded,
                            onPressed: () => context.go(RoutePaths.orders),
                            light: true,
                          ),
                          Positioned(
                            right: 4,
                            top: 4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 5,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.red.shade600,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: Colors.white,
                                  width: 1.5,
                                ),
                              ),
                              child: const Text(
                                '3',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  height: 1,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
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
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.onPressed,
    this.light = false,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final bool light;

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
          child: Icon(
            icon,
            size: 22,
            color: light ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _MobileMenuDrawer extends ConsumerWidget {
  const _MobileMenuDrawer({
    required this.categories,
    required this.onClose,
  });

  final List<Category> categories;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
