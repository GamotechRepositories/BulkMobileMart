import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/theme.dart';
import '../../core/utils/product_search.dart';
import '../../widgets/category/category_grid_tile.dart';
import '../../widgets/common/api_error_view.dart';
import '../../widgets/common/refreshable_body.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../home/home_providers.dart';

class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(categoriesProvider);
    await ref.read(categoriesProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return categoriesAsync.when(
      loading: () => const ColoredBox(
        color: Color(0xFFF4F5F7),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: SkeletonCategoryGrid(large: true, itemCount: 9),
        ),
      ),
      error: (_, __) => RefreshableBody(
        onRefresh: () => _refresh(ref),
        child: ApiErrorView(
          message: 'Could not load categories',
          onRetry: () => ref.invalidate(categoriesProvider),
        ),
      ),
      data: (categories) {
        final filtered = filterShopCategories(categories);

        if (filtered.isEmpty) {
          return RefreshableBody(
            onRefresh: () => _refresh(ref),
            child: const Center(
              child: Text(
                'No categories available yet.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => _refresh(ref),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Categories',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                            ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Tap a category to browse products',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.58,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final category = filtered[index];
                      return CategoryGridTile.fromCategory(
                        category: category,
                        icon: categoryIconTypes[
                            index % categoryIconTypes.length],
                        showSubcategoryHint: true,
                        onTap: () {
                          context.go(
                            ProductSearch.buildPath(
                              categoryName: category.categoryName,
                            ),
                          );
                        },
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
