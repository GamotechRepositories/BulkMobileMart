import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/widgets.dart';

import 'image_url_resolver.dart';
import 'image_variant.dart';

/// Background prefetch for banners, products, and categories — never whole home page.
class ImagePrefetchManager {
  ImagePrefetchManager._();

  static final ImagePrefetchManager instance = ImagePrefetchManager._();

  final Set<String> _prefetched = {};

  Future<void> prefetchUrl(
    BuildContext context,
    String originalUrl, {
    ImageVariant variant = ImageVariant.thumbnail,
  }) async {
    final resolved = ImageUrlResolver.resolve(originalUrl, variant: variant);
    if (resolved.isEmpty || _prefetched.contains(resolved)) return;
    _prefetched.add(resolved);

    if (!context.mounted) return;
    try {
      await precacheImage(
        CachedNetworkImageProvider(resolved),
        context,
      );
    } catch (_) {
      _prefetched.remove(resolved);
    }
  }

  /// Hero slides 2–4 after first frame (slide 1 loads in carousel).
  Future<void> prefetchBanners(
    BuildContext context,
    List<String> originalUrls, {
    int maxCount = 3,
  }) async {
    final urls = originalUrls.where((u) => u.trim().isNotEmpty).take(maxCount);
    for (final url in urls) {
      if (!context.mounted) return;
      await prefetchUrl(context, url, variant: ImageVariant.banner);
    }
  }

  /// Next product thumbnails in a horizontal row / grid.
  Future<void> prefetchProducts(
    BuildContext context,
    List<String> originalUrls, {
    int maxCount = 4,
  }) async {
    final urls = originalUrls.where((u) => u.trim().isNotEmpty).take(maxCount);
    for (final url in urls) {
      if (!context.mounted) return;
      await prefetchUrl(context, url, variant: ImageVariant.thumbnail);
    }
  }

  /// Visible category icons on home.
  Future<void> prefetchCategories(
    BuildContext context,
    List<String> originalUrls, {
    int maxCount = 6,
  }) async {
    final urls = originalUrls.where((u) => u.trim().isNotEmpty).take(maxCount);
    for (final url in urls) {
      if (!context.mounted) return;
      await prefetchUrl(context, url, variant: ImageVariant.thumbnail);
    }
  }

  @visibleForTesting
  void reset() => _prefetched.clear();
}
