import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../models/category.dart';
import '../../models/product.dart';

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  ref.keepAlive();
  final categories = await ref.watch(apiServiceProvider).fetchCategories();
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
  final products = await ref.watch(apiServiceProvider).fetchProducts({
    'limit': 12,
  });
  return products.where((product) => product.isActive).toList();
});

final brandsProvider = FutureProvider((ref) async {
  ref.keepAlive();
  final brands = await ref.watch(apiServiceProvider).fetchBrands();
  return brands.where((brand) => brand.isActive).toList();
});

final testimonialsProvider = FutureProvider((ref) async {
  final items = await ref.watch(apiServiceProvider).fetchTestimonials();
  return items.where((item) => item.isActive).toList();
});

final heroBannersProvider = FutureProvider((ref) async {
  ref.keepAlive();
  final api = ref.watch(apiServiceProvider);
  var banners = await api.fetchHeroBanners(device: 'mobile');
  if (banners.isEmpty) {
    final desktop = await api.fetchHeroBanners(device: 'desktop');
    if (desktop.isNotEmpty) banners = desktop;
  }
  return banners.where((banner) => banner.isActive).toList();
});
