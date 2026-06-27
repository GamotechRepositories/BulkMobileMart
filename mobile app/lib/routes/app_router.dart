import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/cart/cart_screen.dart';
import '../features/categories/categories_screen.dart';
import '../features/checkout/checkout_screen.dart';
import '../features/home/home_providers.dart';
import '../features/home/home_screen.dart';
import '../features/product/featured_products_screen.dart';
import '../features/product/product_detail_screen.dart';
import '../features/product/product_list_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/wishlist/wishlist_screen.dart';
import '../features/orders/order_detail_screen.dart';
import '../features/orders/order_invoice_screen.dart';
import '../features/orders/orders_screen.dart';
import '../features/static/info_page_screen.dart';
import '../features/static/static_content.dart';
import '../features/static/static_screens.dart';
import '../features/support/support_screen.dart';
import '../screens/notification_detail_screen.dart';
import '../screens/notification_screen.dart';
import '../widgets/app_shell.dart';
import '../widgets/layout/tab_swipe_shell.dart';
import 'route_paths.dart';

/// Root navigator for full-screen routes and global overlays (auth sheet, etc.).
final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorHomeKey = GlobalKey<NavigatorState>(debugLabel: 'home');
final _shellNavigatorProductKey = GlobalKey<NavigatorState>(debugLabel: 'product');
final _shellNavigatorOrdersKey = GlobalKey<NavigatorState>(debugLabel: 'orders');
final _shellNavigatorCartKey = GlobalKey<NavigatorState>(debugLabel: 'cart');
final _shellNavigatorProfileKey = GlobalKey<NavigatorState>(debugLabel: 'profile');

final shellBranchNavigatorKeys = <GlobalKey<NavigatorState>>[
  _shellNavigatorHomeKey,
  _shellNavigatorProductKey,
  _shellNavigatorOrdersKey,
  _shellNavigatorCartKey,
  _shellNavigatorProfileKey,
];

final shellBranchNavigatorObservers = List.generate(
  5,
  (_) => ShellBranchNavigatorObserver(),
);

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: RoutePaths.home,
    routes: [
      StatefulShellRoute(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        navigatorContainerBuilder: (context, navigationShell, children) {
          return TabSwipeShell(
            navigationShell: navigationShell,
            branchNavigatorKeys: shellBranchNavigatorKeys,
            children: children,
          );
        },
        branches: [
          StatefulShellBranch(
            observers: [shellBranchNavigatorObservers[0]],
            navigatorKey: _shellNavigatorHomeKey,
            routes: [
              GoRoute(
                path: RoutePaths.home,
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            observers: [shellBranchNavigatorObservers[1]],
            navigatorKey: _shellNavigatorProductKey,
            routes: [
              GoRoute(
                path: RoutePaths.categories,
                builder: (context, state) => const CategoriesScreen(),
              ),
              GoRoute(
                path: RoutePaths.product,
                builder: (context, state) {
                  final params = state.uri.queryParameters;
                  return ProductListScreen(
                    searchQuery: params['q'],
                    categoryName: params['categoryName'],
                    subcategory: params['subcategory'],
                    brand: params['brandName'] ?? params['brand'],
                    minPrice: params['minPrice'],
                    maxPrice: params['maxPrice'],
                    sortId: params['sort'],
                  );
                },
              ),
            ],
          ),
          StatefulShellBranch(
            observers: [shellBranchNavigatorObservers[2]],
            navigatorKey: _shellNavigatorOrdersKey,
            routes: [
              GoRoute(
                path: RoutePaths.orders,
                builder: (context, state) => const OrdersScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            observers: [shellBranchNavigatorObservers[3]],
            navigatorKey: _shellNavigatorCartKey,
            routes: [
              GoRoute(
                path: RoutePaths.cart,
                builder: (context, state) => const CartScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            observers: [shellBranchNavigatorObservers[4]],
            navigatorKey: _shellNavigatorProfileKey,
            routes: [
              GoRoute(
                path: RoutePaths.profile,
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: RoutePaths.checkout,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: '/orders/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => OrderDetailScreen(
          orderId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/orders/:id/invoice',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => OrderInvoiceScreen(
          orderId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: RoutePaths.support,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const SupportScreen(),
      ),
      GoRoute(
        path: RoutePaths.about,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const InfoPageScreen(content: aboutPage),
      ),
      GoRoute(
        path: RoutePaths.contact,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const ContactScreen(),
      ),
      GoRoute(
        path: RoutePaths.blog,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const BlogScreen(),
      ),
      GoRoute(
        path: RoutePaths.privacyPolicy,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const InfoPageScreen(content: privacyPolicyPage),
      ),
      GoRoute(
        path: RoutePaths.terms,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const InfoPageScreen(content: termsPage),
      ),
      GoRoute(
        path: RoutePaths.shippingDetails,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const InfoPageScreen(content: shippingDetailsPage),
      ),
      GoRoute(
        path: RoutePaths.wishlist,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const WishlistScreen(),
      ),
      GoRoute(
        path: RoutePaths.notifications,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const NotificationScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => NotificationDetailScreen(
              notificationId: state.pathParameters['id']!,
            ),
          ),
        ],
      ),
      GoRoute(
        path: RoutePaths.justArrived,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const FeaturedProductsScreen(
          title: 'Just Arrived',
          filter: FeaturedProductFilter.justArrived,
          emptyMessage: 'No just arrived products yet.',
        ),
      ),
      GoRoute(
        path: RoutePaths.hotSelling,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const FeaturedProductsScreen(
          title: 'Hot Selling Products',
          filter: FeaturedProductFilter.hotSelling,
          emptyMessage: 'No hot selling products yet.',
        ),
      ),
      GoRoute(
        path: '/product/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => ProductDetailScreen(
          productId: state.pathParameters['id']!,
        ),
      ),
    ],
  );
});
