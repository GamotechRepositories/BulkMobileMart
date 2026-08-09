import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../core/utils/product_utils.dart';
import '../../models/product.dart';

/// First page + each scroll page. Keep first paint fast; load the rest on scroll.
const listingPageSize = 48;

class ProductListState {
  const ProductListState({
    this.products = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasMore = true,
    this.page = 0,
    this.error,
  });

  final List<Product> products;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasMore;
  final int page;
  final Object? error;

  ProductListState copyWith({
    List<Product>? products,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasMore,
    int? page,
    Object? error,
    bool clearError = false,
  }) {
    return ProductListState(
      products: products ?? this.products,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      page: page ?? this.page,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final productListControllerProvider = NotifierProvider.family<
    ProductListController, ProductListState, ProductQuery>(
  ProductListController.new,
);

class ProductListController extends Notifier<ProductListState> {
  ProductListController(this.query);

  final ProductQuery query;

  @override
  ProductListState build() {
    Future.microtask(_loadInitial);
    return const ProductListState(isLoading: true);
  }

  Future<void> _loadInitial() async {
    await _fetchPage(1, replace: true);
  }

  Future<void> refresh() async {
    state = state.copyWith(
      isLoading: true,
      isLoadingMore: false,
      clearError: true,
    );
    await _fetchPage(1, replace: true);
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    await _fetchPage(state.page + 1, replace: false);
  }

  Future<void> _fetchPage(int page, {required bool replace}) async {
    if (!replace) {
      state = state.copyWith(isLoadingMore: true, clearError: true);
    }

    try {
      final result = await ref.read(apiServiceProvider).fetchProductsPage({
        ...query.toApiParams(),
        'page': page,
        'limit': listingPageSize,
      });
      final incoming =
          result.items.where((product) => product.isActive).toList();

      final merged = replace
          ? incoming
          : _mergeUnique(state.products, incoming);

      final reachedEnd = incoming.isEmpty ||
          page >= result.totalPages ||
          incoming.length < listingPageSize;

      state = ProductListState(
        products: merged,
        isLoading: false,
        isLoadingMore: false,
        hasMore: !reachedEnd,
        page: page,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        isLoadingMore: false,
        error: error,
      );
    }
  }

  List<Product> _mergeUnique(List<Product> existing, List<Product> next) {
    if (next.isEmpty) return existing;
    final seen = existing.map((p) => p.id).toSet();
    final merged = [...existing];
    for (final product in next) {
      if (seen.add(product.id)) merged.add(product);
    }
    return merged;
  }
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
