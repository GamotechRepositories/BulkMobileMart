/// Maps incoming deep-link URIs to in-app go_router paths.
String? mapDeepLinkToRoute(Uri uri) {
  final path = uri.path.isEmpty ? '/' : uri.path;

  if (RegExp(r'^/product/[^/]+$').hasMatch(path)) {
    return path;
  }

  const staticRoutes = {
    '/',
    '/product',
    '/cart',
    '/wishlist',
    '/checkout',
    '/orders',
    '/profile',
    '/support',
    '/about',
    '/contact',
    '/blog',
    '/privacy-policy',
    '/terms-and-conditions',
    '/shipping-details',
  };

  if (staticRoutes.contains(path)) return path;
  if (path.startsWith('/orders/')) return path;

  // Custom scheme: bulkmobilemart://product/<id>
  if (uri.scheme == 'bulkmobilemart' && uri.host == 'product' && uri.pathSegments.isNotEmpty) {
    return '/product/${uri.pathSegments.first}';
  }

  return null;
}
