import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/scroll/app_scroll_config.dart';
import '../../core/scroll/tab_scroll_registry.dart';
import '../../core/utils/product_pricing.dart';
import '../../core/utils/product_search.dart';
import '../../core/utils/product_utils.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../features/home/home_providers.dart';
import '../../features/product/product_providers.dart';
import '../../models/brand.dart';
import '../../models/cart_item.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../routes/route_paths.dart';
import '../../widgets/category/category_grid_tile.dart';
import '../../widgets/category/category_header_section.dart';
import '../../widgets/category/category_horizontal_strip.dart';
import '../../widgets/layout/shell_bottom_insets.dart';
import '../../widgets/common/api_error_view.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../../widgets/product/deal_product_card.dart';
import '../../widgets/product/mobile_product_card.dart';
import '../../widgets/product/product_filter_sheet.dart';
import '../../widgets/product/product_filters_bar.dart';

class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({
    super.key,
    this.searchQuery,
    this.categoryName,
    this.subcategory,
    this.brand,
    this.minPrice,
    this.maxPrice,
    this.sortId,
  });

  final String? searchQuery;
  final String? categoryName;
  final String? subcategory;
  final String? brand;
  final String? minPrice;
  final String? maxPrice;
  final String? sortId;

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  late ProductSortOption _sort;
  late final TabScrollRegistry _tabScrollRegistry;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabScrollRegistry = ref.read(tabScrollRegistryProvider);
    _sort =
        ProductSortOption.fromId(widget.sortId) ?? ProductSortOption.listingDefault;
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _tabScrollRegistry.register(ShellTabIndex.categories, _scrollController);
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _tabScrollRegistry.unregister(ShellTabIndex.categories, _scrollController);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels < position.maxScrollExtent - 480) return;
    ref.read(productListControllerProvider(_query).notifier).loadMore();
  }

  @override
  void didUpdateWidget(ProductListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sortId != widget.sortId) {
      _sort = ProductSortOption.fromId(widget.sortId) ??
          ProductSortOption.listingDefault;
    }
  }

  ProductQuery get _query => ProductQuery(
        categoryName: widget.categoryName,
        search: widget.searchQuery,
        brandName: widget.brand,
        subcategory: widget.subcategory,
        minPrice: widget.minPrice,
        maxPrice: widget.maxPrice,
        sortId: _sort.id,
      );

  String get _title {
    if (widget.searchQuery != null && widget.searchQuery!.isNotEmpty) {
      return 'Results for "${widget.searchQuery}"';
    }
    if (widget.categoryName != null && widget.categoryName!.isNotEmpty) {
      return widget.categoryName!;
    }
    if (widget.brand != null && widget.brand!.isNotEmpty) {
      return widget.brand!;
    }
    return 'All Products';
  }

  void _updateSort(ProductSortOption option) {
    setState(() => _sort = option);
    final path = ProductSearch.buildPath(
      query: widget.searchQuery ?? '',
      categoryName: widget.categoryName ?? '',
      subcategory: widget.subcategory ?? '',
      brand: widget.brand ?? '',
      minPrice: widget.minPrice ?? '',
      maxPrice: widget.maxPrice ?? '',
      sort: option.id,
    );
    context.go(path);
  }

  void _updateBrand(String brand) {
    _applyFilters(
      brand: brand.trim().isEmpty ? null : brand.trim(),
      minPrice: widget.minPrice,
      maxPrice: widget.maxPrice,
    );
  }

  void _clearListingFilters() {
    setState(() => _sort = ProductSortOption.listingDefault);
    final path = ProductSearch.buildPath(
      query: widget.searchQuery ?? '',
      categoryName: widget.categoryName ?? '',
      subcategory: widget.subcategory ?? '',
      sort: ProductSortOption.listingDefault.id,
    );
    context.go(path);
  }

  Future<void> _handleAdd(Product product, BuildContext context) async {
    final defaults = resolveCartDefaults(product);
    final result =
        await ref.read(cartControllerProvider.notifier).addToCart(
              product,
              defaults.quantity,
              variantName: defaults.variantName,
              colorName: defaults.colorName,
              flySourceContext: context,
            );
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
  }

  void _applyFilters({
    String? brand,
    String? minPrice,
    String? maxPrice,
  }) {
    final path = ProductSearch.buildPath(
      query: widget.searchQuery ?? '',
      categoryName: widget.categoryName ?? '',
      subcategory: widget.subcategory ?? '',
      brand: brand ?? '',
      minPrice: minPrice ?? '',
      maxPrice: maxPrice ?? '',
      sort: widget.sortId ?? _sort.id,
    );
    context.go(path);
  }

  void _openFilters(List<Product> products) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => ProductFilterSheet(
        brands: extractBrands(products),
        currentBrand: widget.brand,
        currentMinPrice: widget.minPrice,
        currentMaxPrice: widget.maxPrice,
        onApply: ({brand, minPrice, maxPrice}) => _applyFilters(
          brand: brand,
          minPrice: minPrice,
          maxPrice: maxPrice,
        ),
        onClear: () => _applyFilters(),
      ),
    );
  }

  bool get _hasActiveFilters =>
      (widget.brand?.isNotEmpty ?? false) ||
      (widget.minPrice?.isNotEmpty ?? false) ||
      (widget.maxPrice?.isNotEmpty ?? false) ||
      (_sort != ProductSortOption.listingDefault &&
          _sort.id != ProductSortOption.listingDefault.id);

  Future<void> _refreshProducts() async {
    await ref.read(productListControllerProvider(_query).notifier).refresh();
  }

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go(RoutePaths.home);
  }

  bool get _showBack {
    if (widget.searchQuery != null && widget.searchQuery!.isNotEmpty) {
      return true;
    }
    if (widget.brand != null && widget.brand!.isNotEmpty) {
      return true;
    }
    return false;
  }

  /// Website mobile category / all-products layout (not search or brand-only).
  bool get _isCategoryBrowseLayout {
    final hasSearch = widget.searchQuery != null && widget.searchQuery!.isNotEmpty;
    if (hasSearch) return false;
    final brandOnly = widget.brand != null &&
        widget.brand!.isNotEmpty &&
        (widget.categoryName == null || widget.categoryName!.isEmpty);
    return !brandOnly;
  }

  List<String> _brandNames(List<Brand> brands) {
    final names = brands
        .map((b) => b.brandName.trim())
        .where((name) => name.isNotEmpty)
        .toList();
    names.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return names;
  }

  Category? _findCategory(List<Category> categories, String? name) {
    if (name == null || name.isEmpty) return null;
    final lower = name.toLowerCase();
    for (final category in categories) {
      if (category.categoryName.toLowerCase() == lower) return category;
    }
    return null;
  }

  void _selectCategory(String? name) {
    if (name == null || name.isEmpty) {
      context.go(RoutePaths.product);
      return;
    }
    context.go(
      ProductSearch.buildPath(
        categoryName: name,
        brand: widget.brand ?? '',
        sort: _sort.id,
      ),
    );
  }

  void _selectSubcategory(String? sub) {
    context.go(
      ProductSearch.buildPath(
        categoryName: widget.categoryName ?? '',
        subcategory: sub ?? '',
        brand: widget.brand ?? '',
        sort: _sort.id,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final listState = ref.watch(productListControllerProvider(_query));

    if (_isCategoryBrowseLayout) {
      return _buildCategoryBrowseLayout(listState);
    }

    return _buildSearchOrBrandLayout(listState);
  }

  Widget _buildCategoryBrowseLayout(ProductListState listState) {
    final categories = resolveDisplayCategories(
      ref.watch(categoriesProvider).value ?? const <Category>[],
    );
    final brandNames = _brandNames(
      ref.watch(brandsProvider).value ?? const <Brand>[],
    );
    final hasCategory =
        widget.categoryName != null && widget.categoryName!.isNotEmpty;
    final activeCategory = _findCategory(categories, widget.categoryName);
    final subcategories = activeCategory?.subcategories ?? const <String>[];

    return ColoredBox(
      color: Colors.white,
      child: RefreshIndicator(
        onRefresh: _refreshProducts,
        color: AppColors.primary,
        child: CustomScrollView(
          controller: _scrollController,
          physics: AppScrollConfig.listPhysics,
          cacheExtent: AppScrollConfig.cacheExtent,
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _StickyCategoryStripDelegate(
                categories: categories,
                selectedCategoryName: widget.categoryName,
                onSelect: _selectCategory,
              ),
            ),
            if (hasCategory)
              SliverToBoxAdapter(
                child: CategoryHeaderSection(
                  category: activeCategory,
                  categoryName: widget.categoryName!,
                  subcategories: subcategories,
                  selectedSubcategory: widget.subcategory,
                  onSubcategorySelected: _selectSubcategory,
                ),
              ),
            SliverToBoxAdapter(
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: AppColors.borderLight),
                  ),
                ),
                child: ProductFiltersBar(
                  brands: brandNames,
                  selectedBrand: widget.brand ?? '',
                  sortBy: _sort,
                  onBrandChange: _updateBrand,
                  onSortChange: _updateSort,
                  hasActiveFilters: _hasActiveFilters,
                  onClear: _clearListingFilters,
                ),
              ),
            ),
            ..._buildCategoryProductSlivers(listState, hasCategory),
            SliverToBoxAdapter(
              child: SizedBox(height: ShellBottomInsets.of(context)),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildCategoryProductSlivers(
    ProductListState listState,
    bool hasCategory,
  ) {
    if (listState.isLoading && listState.products.isEmpty) {
      return const [SkeletonProductGridSliver()];
    }

    if (listState.error != null && listState.products.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: ApiErrorView(
            message: 'Could not load products',
            onRetry: _refreshProducts,
          ),
        ),
      ];
    }

    final filtered = filterAndSortProducts(
      products: listState.products,
      subcategory: widget.subcategory,
      brand: widget.brand,
      minPrice: widget.minPrice,
      maxPrice: widget.maxPrice,
      sort: _sort,
    );

    if (filtered.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
            child: Text(
              hasCategory
                  ? 'No products in this category.'
                  : 'No products available yet.',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: DealProductCardDimensions.gridChildAspectRatio,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final product = filtered[index];
              return DealProductCard(
                product: product,
                fillCell: true,
                cartQuantity: ref.watch(
                  cartProductQuantityProvider(product.id),
                ),
                onAdd: (ctx) => _handleAdd(product, ctx),
                onIncrease: () => _increaseFromList(product),
                onDecrease: () => _decreaseFromList(product),
              );
            },
            childCount: filtered.length,
          ),
        ),
      ),
      if (listState.isLoadingMore || listState.hasMore)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: listState.isLoadingMore
                  ? const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const SizedBox(height: 28),
            ),
          ),
        ),
    ];
  }

  Widget _buildSearchOrBrandLayout(ProductListState listState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ProductToolbar(
          title: _title,
          onBack: _showBack ? _goBack : null,
          onFilter: listState.products.isNotEmpty
              ? () => _openFilters(listState.products)
              : null,
          filtersActive: _hasActiveFilters,
        ),
        ProductFiltersBar(
          brands: extractBrands(listState.products),
          selectedBrand: widget.brand ?? '',
          sortBy: _sort,
          onBrandChange: _updateBrand,
          onSortChange: _updateSort,
          hasActiveFilters: _hasActiveFilters,
          onClear: _clearListingFilters,
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refreshProducts,
            child: listState.isLoading && listState.products.isEmpty
                ? const SkeletonProductGrid(useShellBottomInset: true)
                : listState.error != null && listState.products.isEmpty
                    ? ApiErrorView(
                        message: 'Could not load products',
                        onRetry: _refreshProducts,
                      )
                    : _ProductResultsView(
                        scrollController: _scrollController,
                        products: listState.products,
                        searchQuery: widget.searchQuery,
                        categoryName: widget.categoryName,
                        subcategory: widget.subcategory,
                        brand: widget.brand,
                        minPrice: widget.minPrice,
                        maxPrice: widget.maxPrice,
                        sort: _sort,
                        onAdd: _handleAdd,
                        isLoadingMore: listState.isLoadingMore,
                        hasMore: listState.hasMore,
                      ),
          ),
        ),
      ],
    );
  }

  CartItem? _cartLineForProduct(List<CartItem> cartItems, Product product) {
    final defaults = resolveCartDefaults(product);
    for (final item in cartItems) {
      if (item.id != product.id) continue;
      if (item.variantName.trim() != defaults.variantName.trim()) continue;
      if (item.colorName.trim() != defaults.colorName.trim()) continue;
      return item;
    }
    return null;
  }

  Future<void> _increaseFromList(Product product) async {
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLineForProduct(cartItems, product);
    if (line == null) {
      final defaults = resolveCartDefaults(product);
      final result = await ref.read(cartControllerProvider.notifier).addToCart(
            product,
            defaults.quantity,
            variantName: defaults.variantName,
            colorName: defaults.colorName,
          );
      if (result == AddToCartResult.requiresLogin && mounted) {
        ref.read(authControllerProvider.notifier).openAuthModal();
      }
      return;
    }
    final step = getCartStepForProduct(product, line.variantName);
    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: line.quantity + step,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

  Future<void> _decreaseFromList(Product product) async {
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLineForProduct(cartItems, product);
    if (line == null) return;

    final nextQty = getDecreasedCartQuantityForProduct(
      product,
      line.quantity,
      line.variantName,
    );
    if (nextQty <= 0) {
      await ref.read(cartControllerProvider.notifier).removeFromCartLine(
            productId: product.id,
            variantName: line.variantName,
            colorName: line.colorName,
          );
      return;
    }

    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: nextQty,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }
}

class _ProductResultsView extends ConsumerStatefulWidget {
  const _ProductResultsView({
    required this.scrollController,
    required this.products,
    required this.searchQuery,
    required this.categoryName,
    required this.subcategory,
    required this.brand,
    required this.minPrice,
    required this.maxPrice,
    required this.sort,
    required this.onAdd,
    this.isLoadingMore = false,
    this.hasMore = false,
  });

  final ScrollController scrollController;
  final List<Product> products;
  final String? searchQuery;
  final String? categoryName;
  final String? subcategory;
  final String? brand;
  final String? minPrice;
  final String? maxPrice;
  final ProductSortOption sort;
  final Future<void> Function(Product, BuildContext) onAdd;
  final bool isLoadingMore;
  final bool hasMore;

  @override
  ConsumerState<_ProductResultsView> createState() => _ProductResultsViewState();
}

class _ProductResultsViewState extends ConsumerState<_ProductResultsView> {
  late List<Product> _filtered;

  @override
  void initState() {
    super.initState();
    _filtered = _computeFiltered();
  }

  @override
  void didUpdateWidget(_ProductResultsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.products != widget.products ||
        oldWidget.subcategory != widget.subcategory ||
        oldWidget.brand != widget.brand ||
        oldWidget.minPrice != widget.minPrice ||
        oldWidget.maxPrice != widget.maxPrice ||
        oldWidget.sort != widget.sort) {
      _filtered = _computeFiltered();
    }
  }

  List<Product> _computeFiltered() {
    return filterAndSortProducts(
      products: widget.products,
      subcategory: widget.subcategory,
      brand: widget.brand,
      minPrice: widget.minPrice,
      maxPrice: widget.maxPrice,
      sort: widget.sort,
    );
  }

  CartItem? _cartLineForProduct(List<CartItem> cartItems, Product product) {
    final defaults = resolveCartDefaults(product);
    for (final item in cartItems) {
      if (item.id != product.id) continue;
      if (item.variantName.trim() != defaults.variantName.trim()) continue;
      if (item.colorName.trim() != defaults.colorName.trim()) continue;
      return item;
    }
    return null;
  }

  Future<void> _handleIncrease(Product product) async {
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLineForProduct(cartItems, product);
    if (line == null) {
      final defaults = resolveCartDefaults(product);
      final result = await ref.read(cartControllerProvider.notifier).addToCart(
            product,
            defaults.quantity,
            variantName: defaults.variantName,
            colorName: defaults.colorName,
          );
      if (result == AddToCartResult.requiresLogin && mounted) {
        ref.read(authControllerProvider.notifier).openAuthModal();
      }
      return;
    }

    final step = getCartStepForProduct(product, line.variantName);
    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: line.quantity + step,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

  Future<void> _handleDecrease(Product product) async {
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLineForProduct(cartItems, product);
    if (line == null) return;

    final nextQty = getDecreasedCartQuantityForProduct(
      product,
      line.quantity,
      line.variantName,
    );
    if (nextQty <= 0) {
      await ref.read(cartControllerProvider.notifier).removeFromCartLine(
            productId: product.id,
            variantName: line.variantName,
            colorName: line.colorName,
          );
      return;
    }

    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: nextQty,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

  @override
  Widget build(BuildContext context) {
    if (_filtered.isEmpty) {
      return Center(
        child: Text(
          widget.brand != null && widget.brand!.isNotEmpty
              ? 'No products found for brand "${widget.brand}".'
              : widget.searchQuery != null
                  ? 'No products found for "${widget.searchQuery}".'
                  : 'No products available yet.',
          style: const TextStyle(color: AppColors.textSecondary),
        ),
      );
    }

    final isSearchOnly = widget.searchQuery != null &&
        widget.searchQuery!.isNotEmpty &&
        (widget.categoryName == null || widget.categoryName!.isEmpty);

    if (isSearchOnly) {
      return ListView.separated(
        controller: widget.scrollController,
        physics: AppScrollConfig.listPhysics,
        cacheExtent: AppScrollConfig.cacheExtent,
        padding: ShellBottomInsets.listPadding(context, top: 16),
        itemCount:
            _filtered.length + ((widget.isLoadingMore || widget.hasMore) ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          if (index >= _filtered.length) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: widget.isLoadingMore
                    ? const SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const SizedBox(height: 28),
              ),
            );
          }
          final product = _filtered[index];
          return MobileProductCard(
            product: product,
            cartQuantity: ref.watch(cartProductQuantityProvider(product.id)),
            onAdd: (context) => widget.onAdd(product, context),
            onIncrease: () => _handleIncrease(product),
            onDecrease: () => _handleDecrease(product),
          );
        },
      );
    }

    return CustomScrollView(
      controller: widget.scrollController,
      physics: AppScrollConfig.listPhysics,
      cacheExtent: AppScrollConfig.cacheExtent,
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: DealProductCardDimensions.gridChildAspectRatio,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final product = _filtered[index];
                return DealProductCard(
                  product: product,
                  fillCell: true,
                  cartQuantity:
                      ref.watch(cartProductQuantityProvider(product.id)),
                  onAdd: (context) => widget.onAdd(product, context),
                  onIncrease: () => _handleIncrease(product),
                  onDecrease: () => _handleDecrease(product),
                );
              },
              childCount: _filtered.length,
            ),
          ),
        ),
        if (widget.isLoadingMore || widget.hasMore)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: widget.isLoadingMore
                    ? const SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const SizedBox(height: 28),
              ),
            ),
          ),
        SliverToBoxAdapter(
          child: SizedBox(height: ShellBottomInsets.of(context)),
        ),
      ],
    );
  }
}

class _ProductToolbar extends StatelessWidget {
  const _ProductToolbar({
    required this.title,
    this.onBack,
    this.onFilter,
    this.filtersActive = false,
  });

  final String title;
  final VoidCallback? onBack;
  final VoidCallback? onFilter;
  final bool filtersActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          if (onBack != null)
            IconButton(
              onPressed: onBack,
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              visualDensity: VisualDensity.compact,
            ),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
          ),
          if (onFilter != null)
            OutlinedButton.icon(
              onPressed: onFilter,
              icon: Icon(
                Icons.filter_list,
                size: 16,
                color: filtersActive ? AppColors.primary : AppColors.textSecondary,
              ),
              label: const Text('Filter'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                foregroundColor:
                    filtersActive ? AppColors.primary : AppColors.textPrimary,
                textStyle: const TextStyle(
                  inherit: false,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                side: BorderSide(
                  color: filtersActive
                      ? AppColors.primary
                      : AppColors.borderLight,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StickyCategoryStripDelegate extends SliverPersistentHeaderDelegate {
  _StickyCategoryStripDelegate({
    required this.categories,
    required this.selectedCategoryName,
    required this.onSelect,
  });

  static const double stripHeight = 108;

  final List<Category> categories;
  final String? selectedCategoryName;
  final ValueChanged<String?> onSelect;

  @override
  double get minExtent => stripHeight;

  @override
  double get maxExtent => stripHeight;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: Colors.white,
      elevation: overlapsContent || shrinkOffset > 0 ? 1.5 : 0,
      shadowColor: const Color(0x1A000000),
      child: CategoryHorizontalStrip(
        categories: categories,
        selectedCategoryName: selectedCategoryName,
        onSelect: onSelect,
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _StickyCategoryStripDelegate oldDelegate) {
    return oldDelegate.selectedCategoryName != selectedCategoryName ||
        oldDelegate.categories != categories ||
        oldDelegate.onSelect != onSelect;
  }
}
