import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../models/category.dart';
import '../../models/product.dart';

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  ref.keepAlive();
  final categories = await ref.read(apiServiceProvider).fetchCategories();
  return categories
      .where(
        (category) =>
            category.isActive &&
            category.categoryName.toLowerCase() != 'most purchase',
      )
      .toList();
});

final homeDealsProvider = FutureProvider<List<Product>>((ref) async {
  ref.keepAlive();
  final products = await ref.read(apiServiceProvider).fetchProducts({
    'limit': 12,
  });
  return products.where((product) => product.isActive).toList();
});

final brandsProvider = FutureProvider((ref) async {
  ref.keepAlive();
  final brands = await ref.read(apiServiceProvider).fetchBrands();
  return brands.where((brand) => brand.isActive).toList();
});

final testimonialsProvider = FutureProvider((ref) async {
  ref.keepAlive();
  final items = await ref.read(apiServiceProvider).fetchTestimonials();
  return items.where((item) => item.isActive).toList();
});

final heroBannersProvider = FutureProvider((ref) async {
  ref.keepAlive();
  final api = ref.read(apiServiceProvider);
  final results = await Future.wait([
    api.fetchHeroBanners(device: 'mobile'),
    api.fetchHeroBanners(device: 'desktop'),
  ]);
  var banners = results[0];
  if (banners.isEmpty && results[1].isNotEmpty) {
    banners = results[1];
  }
  return banners.where((banner) => banner.isActive).toList();
});
