import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_decorations.dart';
import '../../config/contact.dart';
import '../../config/theme.dart';
import '../../core/utils/external_link.dart';
import '../../core/utils/product_search.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/home/home_providers.dart';
import '../../features/notifications/notifications_controller.dart';
import '../../features/wishlist/wishlist_controller.dart';
import '../../models/category.dart';
import '../../routes/app_router.dart';
import '../../routes/route_paths.dart';
import '../common/app_logo.dart';
import '../common/fly_target_anchor.dart';
import '../common/nav_icon_locator.dart';
import '../common/whatsapp_icon.dart';
import 'mobile_search_bar.dart';

class MobileHeader extends ConsumerStatefulWidget {
  const MobileHeader({
    super.key,
    this.isHomeTab = false,
  });

  final bool isHomeTab;

  @override
  ConsumerState<MobileHeader> createState() => _MobileHeaderState();
}

class _MobileHeaderState extends ConsumerState<MobileHeader> {
  final _searchFocusNode = FocusNode();
  bool _searchOpen = false;

  void _openMenu() {
    if (_searchOpen) {
      setState(() => _searchOpen = false);
      _searchFocusNode.unfocus();
    }
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

  void _toggleSearch() {
    setState(() => _searchOpen = !_searchOpen);
    if (_searchOpen) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _searchFocusNode.requestFocus();
      });
    } else {
      _searchFocusNode.unfocus();
    }
  }

  void _closeSearch() {
    if (!_searchOpen) return;
    setState(() => _searchOpen = false);
    _searchFocusNode.unfocus();
  }

  void _openWhatsAppOptions() {
    final rootContext = rootNavigatorKey.currentContext ?? context;
    showModalBottomSheet<void>(
      context: rootContext,
      useRootNavigator: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.borderLight,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'WhatsApp',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 14),
                ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFF25D366),
                    child: WhatsAppIcon(size: 20, color: Colors.white),
                  ),
                  title: const Text(
                    'WhatsApp',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: const Text('Chat with us on WhatsApp'),
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await openExternalUrl(
                      ContactConfig.contactWhatsAppUrl,
                      context: context,
                      errorMessage: 'Could not open WhatsApp.',
                    );
                  },
                ),
                ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFE8F8EF),
                    child: WhatsAppIcon(size: 20),
                  ),
                  title: const Text(
                    'WhatsApp Community',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: const Text('Join our community group'),
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await openExternalUrl(
                      ContactConfig.whatsAppGroupUrl,
                      context: context,
                      errorMessage: 'Could not open WhatsApp Community.',
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final wishlistCount = ref.watch(
      wishlistControllerProvider.select((s) => s.items.length),
    );
    final roundedHomeBottom = widget.isHomeTab && !_searchOpen;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius:
                roundedHomeBottom ? AppDecorations.homeShellBottomRadius : BorderRadius.zero,
            child: DecoratedBox(
              decoration: const BoxDecoration(color: Colors.white),
              child: Padding(
                padding: EdgeInsets.only(top: topInset),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(12, 6, 12, _searchOpen ? 8 : 10),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          _HeaderIconButton(
                            icon: Icons.menu_rounded,
                            onPressed: _openMenu,
                            light: false,
                          ),
                          const Expanded(
                            child: Center(
                              child: AppLogo(height: 42),
                            ),
                          ),
                          _HeaderIconButton(
                            icon: Icons.search_rounded,
                            onPressed: _toggleSearch,
                            light: false,
                            active: _searchOpen,
                          ),
                          const SizedBox(width: 4),
                          _HeaderIconButton(
                            onPressed: _openWhatsAppOptions,
                            light: false,
                            child: const WhatsAppIcon(size: 22),
                          ),
                          const SizedBox(width: 4),
                          _HeaderIconButton(
                            icon: Icons.notifications_none_rounded,
                            onPressed: () {
                              final isLoggedIn =
                                  ref.read(authControllerProvider).isLoggedIn;
                              if (!isLoggedIn) {
                                ref.read(authControllerProvider.notifier).openAuthModal();
                              } else {
                                context.push(RoutePaths.notifications);
                              }
                            },
                            light: false,
                            badgeCount: ref.watch(
                              notificationsControllerProvider.select((s) => s.unreadCount),
                            ),
                          ),
                          const SizedBox(width: 4),
                          FlyTargetAnchor(
                            onReport: NavIconLocator.reportWishlist,
                            onClear: NavIconLocator.clearWishlist,
                            child: _HeaderIconButton(
                              icon: Icons.favorite_border_rounded,
                              onPressed: () => context.push(RoutePaths.wishlist),
                              light: false,
                              badgeCount: wishlistCount,
                            ),
                          ),
                        ],
                      ),
                      if (_searchOpen) ...[
                        const SizedBox(height: 10),
                        MobileSearchBar(
                          focusNode: _searchFocusNode,
                          autoFocus: true,
                          onSubmitted: _closeSearch,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    this.icon,
    this.child,
    required this.onPressed,
    this.light = false,
    this.active = false,
    this.badgeCount = 0,
  }) : assert(icon != null || child != null);

  final IconData? icon;
  final Widget? child;
  final VoidCallback onPressed;
  final bool light;
  final bool active;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: light
          ? (active
              ? Colors.white.withValues(alpha: 0.45)
              : Colors.white.withValues(alpha: 0.28))
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
                    color: light
                        ? (active ? Colors.white : Colors.white)
                        : AppColors.textPrimary,
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
    final userContact = ref.watch(
      authControllerProvider.select((s) => s.user?.contactLabel ?? ''),
    );
    final width = MediaQuery.sizeOf(context).width * 0.82;

    // Full-screen routes on the root navigator — push so system back can pop.
    const rootOverlayPaths = <String>{
      RoutePaths.notifications,
      RoutePaths.wishlist,
      RoutePaths.support,
      RoutePaths.about,
      RoutePaths.contact,
      RoutePaths.blog,
      RoutePaths.privacyPolicy,
      RoutePaths.terms,
      RoutePaths.shippingDetails,
      RoutePaths.justArrived,
      RoutePaths.hotSelling,
      RoutePaths.checkout,
      RoutePaths.coupons,
    };

    void navigate(String path, {bool requiresAuth = false}) {
      if (requiresAuth && !isLoggedIn) {
        onClose();
        ref.read(authControllerProvider.notifier).openAuthModal();
        return;
      }
      onClose();
      if (rootOverlayPaths.contains(path)) {
        context.push(path);
      } else {
        context.go(path);
      }
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
                    subtitle: Text(userContact),
                  ),
                ),
              const Divider(height: 24),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  itemCount: _menuItemCount(categories.length, isLoggedIn),
                  itemBuilder: (context, index) => _buildMenuItem(
                    context,
                    index,
                    categories,
                    isLoggedIn,
                    navigate,
                    onClose,
                    ref,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

int _menuItemCount(int categoryCount, bool isLoggedIn) {
  var count = 8 + categoryCount;
  if (isLoggedIn) count += 2;
  return count;
}

Widget _buildMenuItem(
  BuildContext context,
  int index,
  List<Category> categories,
  bool isLoggedIn,
  void Function(String path, {bool requiresAuth}) navigate,
  VoidCallback onClose,
  WidgetRef ref,
) {
  final unreadNotifications = ref.watch(
    notificationsControllerProvider.select((s) => s.unreadCount),
  );
  final wishlistCount = ref.watch(
    wishlistControllerProvider.select((s) => s.items.length),
  );

  final fixedMenus = <({
    IconData icon,
    String label,
    String path,
    bool auth,
    int badgeCount,
  })>[
    (
      icon: Icons.home_outlined,
      label: 'Home',
      path: RoutePaths.home,
      auth: false,
      badgeCount: 0,
    ),
    (
      icon: Icons.grid_view_rounded,
      label: 'All Products',
      path: RoutePaths.product,
      auth: false,
      badgeCount: 0,
    ),
    (
      icon: Icons.notifications_none_rounded,
      label: 'Notifications',
      path: RoutePaths.notifications,
      auth: true,
      badgeCount: unreadNotifications,
    ),
    (
      icon: Icons.favorite_border,
      label: 'Wishlist',
      path: RoutePaths.wishlist,
      auth: true,
      badgeCount: wishlistCount,
    ),
    (
      icon: Icons.receipt_long_outlined,
      label: 'My Orders',
      path: RoutePaths.orders,
      auth: true,
      badgeCount: 0,
    ),
    (
      icon: Icons.person_outline,
      label: 'Account',
      path: RoutePaths.profile,
      auth: false,
      badgeCount: 0,
    ),
    (
      icon: Icons.support_agent_outlined,
      label: 'Support',
      path: RoutePaths.support,
      auth: false,
      badgeCount: 0,
    ),
  ];

  if (index < fixedMenus.length) {
    final item = fixedMenus[index];
    return _MenuTile(
      icon: item.icon,
      label: item.label,
      badgeCount: item.badgeCount,
      onTap: () => navigate(item.path, requiresAuth: item.auth),
    );
  }

  if (index == fixedMenus.length) {
    return const Padding(
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
    );
  }

  final categoryIndex = index - fixedMenus.length - 1;
  if (categoryIndex < categories.length) {
    final category = categories[categoryIndex];
    return _MenuTile(
      label: category.categoryName,
      onTap: () {
        onClose();
        context.go(
          ProductSearch.buildPath(categoryName: category.categoryName),
        );
      },
    );
  }

  if (!isLoggedIn) return const SizedBox.shrink();

  final logoutStart = fixedMenus.length + 1 + categories.length;
  if (index == logoutStart) return const Divider();
  return _MenuTile(
    icon: Icons.logout_rounded,
    label: 'Logout',
    onTap: () {
      onClose();
      ref.read(authControllerProvider.notifier).logout();
    },
  );
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.label,
    required this.onTap,
    this.icon,
    this.badgeCount = 0,
  });

  final String label;
  final VoidCallback onTap;
  final IconData? icon;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: icon != null
          ? Icon(icon, size: 20, color: AppColors.textSecondary)
          : null,
      title: Text(label),
      trailing: badgeCount > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.navBadge,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                badgeCount > 99 ? '99+' : '$badgeCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            )
          : null,
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    );
  }
}
