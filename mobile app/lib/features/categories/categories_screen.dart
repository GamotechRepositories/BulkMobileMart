import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/theme.dart';
import '../../core/utils/product_pricing.dart';
import '../../models/cart_item.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../widgets/category/category_grid_tile.dart';
import '../../widgets/category/category_header_section.dart';
import '../../widgets/category/category_horizontal_strip.dart';
import '../../widgets/common/app_loading.dart';
import '../../widgets/product/deal_product_card.dart';
import '../auth/auth_controller.dart';
import '../cart/cart_controller.dart';
import '../home/home_providers.dart';
import '../product/product_providers.dart';

class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});

  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  String? _selectedCategoryName;
  String? _selectedSubcategory;

  Category? _findCategory(List<Category> categories, String? name) {
    if (name == null || name.isEmpty) return null;
    final lower = name.toLowerCase();
    for (final category in categories) {
      if (category.categoryName.toLowerCase() == lower) return category;
    }
    return null;
  }

  List<Product> _filterBySubcategory(
    List<Product> products,
    String? subcategory,
  ) {
    if (subcategory == null || subcategory.isEmpty) return products;
    final lower = subcategory.toLowerCase();
    return products
        .where((p) => p.subcategory.toLowerCase() == lower)
        .toList();
  }

  Future<void> _handleAdd(Product product) async {
    final defaults = resolveCartDefaults(product);
    final result =
        await ref.read(cartControllerProvider.notifier).addToCart(
              product,
              defaults.quantity,
              variantName: defaults.variantName,
              colorName: defaults.colorName,
            );
    if (result == AddToCartResult.requiresLogin && mounted) {
      ref.read(authControllerProvider.notifier).openAuthModal();
    }
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
      await _handleAdd(product);
      return;
    }
    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: line.quantity + 1,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

  Future<void> _handleDecrease(Product product) async {
    final cartItems = ref.read(cartControllerProvider).items;
    final line = _cartLineForProduct(cartItems, product);
    if (line == null) return;

    if (line.quantity <= 1) {
      await ref.read(cartControllerProvider.notifier).removeFromCartLine(
            productId: product.id,
            variantName: line.variantName,
            colorName: line.colorName,
          );
      return;
    }

    await ref.read(cartControllerProvider.notifier).updateCartLineQuantity(
          productId: product.id,
          quantity: line.quantity - 1,
          variantName: line.variantName,
          colorName: line.colorName,
        );
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final productQuery = ProductQuery(
      categoryName: _selectedCategoryName?.isNotEmpty == true
          ? _selectedCategoryName
          : null,
    );
    final productsAsync = ref.watch(productListProvider(productQuery));
    final cartItems = ref.watch(cartControllerProvider).items;

    return ColoredBox(
      color: AppColors.mobileSurface,
      child: categoriesAsync.when(
        loading: () => const AppLoading(message: 'Loading categories...'),
        error: (error, _) {
          final fallback = resolveDisplayCategories(const []);
          return _CategoriesProductLayout(
            categories: fallback,
            productsAsync: productsAsync,
            cartItems: cartItems,
            selectedCategoryName: _selectedCategoryName,
            selectedSubcategory: _selectedSubcategory,
            activeCategory: _findCategory(fallback, _selectedCategoryName),
            onCategorySelected: (name) {
              setState(() {
                _selectedCategoryName = name;
                _selectedSubcategory = null;
              });
            },
            onSubcategorySelected: (sub) {
              setState(() => _selectedSubcategory = sub);
            },
            onAdd: _handleAdd,
            onIncrease: _handleIncrease,
            onDecrease: _handleDecrease,
            onRefresh: () async {
              ref.invalidate(categoriesProvider);
              ref.invalidate(productListProvider(productQuery));
            },
            filterBySubcategory: _filterBySubcategory,
          );
        },
        data: (categories) {
          final displayCategories = resolveDisplayCategories(categories);
          return _CategoriesProductLayout(
            categories: displayCategories,
            productsAsync: productsAsync,
            cartItems: cartItems,
            selectedCategoryName: _selectedCategoryName,
            selectedSubcategory: _selectedSubcategory,
            activeCategory:
                _findCategory(displayCategories, _selectedCategoryName),
            onCategorySelected: (name) {
              setState(() {
                _selectedCategoryName = name;
                _selectedSubcategory = null;
              });
            },
            onSubcategorySelected: (sub) {
              setState(() => _selectedSubcategory = sub);
            },
            onAdd: _handleAdd,
            onIncrease: _handleIncrease,
            onDecrease: _handleDecrease,
            onRefresh: () async {
              ref.invalidate(categoriesProvider);
              ref.invalidate(productListProvider(productQuery));
            },
            filterBySubcategory: _filterBySubcategory,
          );
        },
      ),
    );
  }
}

class _CategoriesProductLayout extends StatelessWidget {
  const _CategoriesProductLayout({
    required this.categories,
    required this.productsAsync,
    required this.cartItems,
    required this.selectedCategoryName,
    required this.selectedSubcategory,
    required this.activeCategory,
    required this.onCategorySelected,
    required this.onSubcategorySelected,
    required this.onAdd,
    required this.onIncrease,
    required this.onDecrease,
    required this.onRefresh,
    required this.filterBySubcategory,
  });

  final List<Category> categories;
  final AsyncValue<List<Product>> productsAsync;
  final List<CartItem> cartItems;
  final String? selectedCategoryName;
  final String? selectedSubcategory;
  final Category? activeCategory;
  final ValueChanged<String?> onCategorySelected;
  final ValueChanged<String?> onSubcategorySelected;
  final Future<void> Function(Product) onAdd;
  final Future<void> Function(Product) onIncrease;
  final Future<void> Function(Product) onDecrease;
  final Future<void> Function() onRefresh;
  final List<Product> Function(List<Product>, String?) filterBySubcategory;

  CartItem? _cartLine(List<CartItem> items, Product product) {
    final defaults = resolveCartDefaults(product);
    for (final item in items) {
      if (item.id != product.id) continue;
      if (item.variantName.trim() != defaults.variantName.trim()) continue;
      if (item.colorName.trim() != defaults.colorName.trim()) continue;
      return item;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final hasCategory = selectedCategoryName != null &&
        selectedCategoryName!.isNotEmpty;
    final subcategories = activeCategory?.subcategories ?? const <String>[];

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: CategoryHorizontalStrip(
              categories: categories,
              selectedCategoryName: selectedCategoryName,
              onSelect: onCategorySelected,
            ),
          ),
          if (hasCategory)
            SliverToBoxAdapter(
              child: CategoryHeaderSection(
                category: activeCategory,
                categoryName: selectedCategoryName!,
                subcategories: subcategories,
                selectedSubcategory: selectedSubcategory,
                onSubcategorySelected: onSubcategorySelected,
              ),
            ),
          productsAsync.when(
            loading: () => const SliverFillRemaining(
              hasScrollBody: false,
              child: AppLoading(message: 'Loading products...'),
            ),
            error: (error, _) => SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      error.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: onRefresh,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
            data: (products) {
              final filtered =
                  filterBySubcategory(products, selectedSubcategory);

              if (filtered.isEmpty) {
                return SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Text(
                      hasCategory
                          ? 'No products in this category.'
                          : 'No products available yet.',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 8,
                    childAspectRatio: 0.64,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final product = filtered[index];
                      final line = _cartLine(cartItems, product);
                      final qty = line?.quantity ?? 0;

                      return DealProductCard(
                        product: product,
                        flat: true,
                        cartQuantity: qty,
                        onAdd: () => onAdd(product),
                        onIncrease: () => onIncrease(product),
                        onDecrease: () => onDecrease(product),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
