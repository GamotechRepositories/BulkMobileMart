import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../core/utils/product_utils.dart';
import '../../models/product.dart';

const _productsPageSize = 50;
const _filteredProductsFastLimit = 120;

final productListProvider =
    FutureProvider.family<List<Product>, ProductQuery>((ref, query) async {
  final api = ref.read(apiServiceProvider);
  final params = query.toApiParams();

  // Category/search/brand listings should feel instant on mobile.
  // For these filtered views, fetch one larger page instead of walking all pages.
  if (_isFilteredListing(query)) {
    final firstPage = await api.fetchProductsPage({
      ...params,
      'page': 1,
      'limit': _filteredProductsFastLimit,
    });
    return firstPage.items.where((product) => product.isActive).toList();
  }

  final all = <Product>[];
  var page = 1;
  var totalPages = 1;

  do {
    final result = await api.fetchProductsPage({
      ...params,
      'page': page,
      'limit': _productsPageSize,
    });
    all.addAll(result.items);
    totalPages = result.totalPages < 1 ? 1 : result.totalPages;
    page++;
  } while (page <= totalPages);

  return all.where((product) => product.isActive).toList();
});

bool _isFilteredListing(ProductQuery query) {
  bool hasValue(String? value) => value != null && value.trim().isNotEmpty;
  return hasValue(query.categoryName) ||
      hasValue(query.search) ||
      hasValue(query.brandName) ||
      hasValue(query.subcategory) ||
      hasValue(query.minPrice) ||
      hasValue(query.maxPrice) ||
      query.justArrived ||
      query.hotSelling;
}

final productDetailProvider =
    FutureProvider.family<Product, String>((ref, id) async {
  return ref.read(apiServiceProvider).fetchProductById(id);
});

final similarProductsProvider =
    FutureProvider.family<List<Product>, String>((ref, productId) async {
  if (productId.trim().isEmpty) return [];
  return ref.read(apiServiceProvider).fetchSimilarProducts(productId);
});

class ProductQuery {
  const ProductQuery({
    this.categoryName,
    this.search,
    this.brandName,
    this.subcategory,
    this.minPrice,
    this.maxPrice,
    this.sortId,
    this.justArrived = false,
    this.hotSelling = false,
  });

  final String? categoryName;
  final String? search;
  final String? brandName;
  final String? subcategory;
  final String? minPrice;
  final String? maxPrice;
  final String? sortId;
  final bool justArrived;
  final bool hotSelling;

  /// Same query shape as website `useProductListParams`.
  Map<String, dynamic> toApiParams() {
    final params = <String, dynamic>{};
    final category = categoryName?.trim() ?? '';
    final q = search?.trim() ?? '';
    final brand = brandName?.trim() ?? '';
    final sub = subcategory?.trim() ?? '';
    final min = minPrice?.trim() ?? '';
    final max = maxPrice?.trim() ?? '';
    final sort = (sortId?.trim().isNotEmpty == true)
        ? sortId!.trim()
        : ProductSortOption.listingDefault.id;

    if (category.isNotEmpty) params['categoryName'] = category;
    if (q.isNotEmpty) params['q'] = q;
    if (brand.isNotEmpty) params['brandName'] = brand;
    if (sub.isNotEmpty) params['subcategory'] = sub;
    if (min.isNotEmpty) params['minPrice'] = min;
    if (max.isNotEmpty) params['maxPrice'] = max;
    if (sort.isNotEmpty && sort != 'default') params['sort'] = sort;
    if (justArrived) params['justArrived'] = true;
    if (hotSelling) params['hotSelling'] = true;
    return params;
  }

  @override
  bool operator ==(Object other) {
    return other is ProductQuery &&
        other.categoryName == categoryName &&
        other.search == search &&
        other.brandName == brandName &&
        other.subcategory == subcategory &&
        other.minPrice == minPrice &&
        other.maxPrice == maxPrice &&
        other.sortId == sortId &&
        other.justArrived == justArrived &&
        other.hotSelling == hotSelling;
  }

  @override
  int get hashCode => Object.hash(
        categoryName,
        search,
        brandName,
        subcategory,
        minPrice,
        maxPrice,
        sortId,
        justArrived,
        hotSelling,
      );
}
