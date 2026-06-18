import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme.dart';
import '../../../core/utils/product_search.dart';
import '../../../models/category.dart';
import '../../../routes/route_paths.dart';
import '../../../widgets/category/category_grid_tile.dart';
import '../../../widgets/common/api_error_view.dart';
import '../../../widgets/common/section_header.dart';
import '../../../widgets/common/skeleton_loaders.dart';
import '../home_providers.dart';
import 'home_section_card.dart';

const _itemsPerPage = 9;
const _gridColumns = 3;
const _gridRows = 3;
const _gridSpacing = 10.0;
/// Width / height — tuned for flat circular category icons.
const _tileAspectRatio = 0.72;

/// Home landing — 3×3 category grid per page, swipe horizontally for more.
class CategoryNavSection extends ConsumerWidget {
  const CategoryNavSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return categoriesAsync.when(
      loading: () => const HomeSectionCard(
        margin: EdgeInsets.fromLTRB(0, 8, 0, 4),
        padding: EdgeInsets.fromLTRB(16, 0, 16, 0),
        child: SkeletonCategoryGridPage(),
      ),
      error: (_, _) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: ApiErrorView(
          message: 'Could not load categories',
          onRetry: () => ref.invalidate(categoriesProvider),
        ),
      ),
      data: (categories) {
        final filtered = filterShopCategories(categories);
        if (filtered.isEmpty) return const SizedBox.shrink();

        return HomeSectionCard(
          margin: const EdgeInsets.fromLTRB(0, 8, 0, 4),
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
          showDivider: true,
          child: Column(
            children: [
              SectionHeader(
                title: 'Shop by Category',
                dense: true,
                onViewAll: () => context.go(RoutePaths.categories),
              ),
              _CategoryPagedGrid(categories: filtered),
            ],
          ),
        );
      },
    );
  }
}

enum _CategoryCellKind { category, viewAll, empty }

class _CategoryCell {
  const _CategoryCell.category(this.category)
      : kind = _CategoryCellKind.category;

  const _CategoryCell.viewAll()
      : kind = _CategoryCellKind.viewAll,
        category = null;

  const _CategoryCell.empty()
      : kind = _CategoryCellKind.empty,
        category = null;

  final _CategoryCellKind kind;
  final Category? category;
}

class _CategoryPagedGrid extends StatefulWidget {
  const _CategoryPagedGrid({required this.categories});

  final List<Category> categories;

  @override
  State<_CategoryPagedGrid> createState() => _CategoryPagedGridState();
}

class _CategoryPagedGridState extends State<_CategoryPagedGrid> {
  final _pageController = PageController();
  int _currentPage = 0;
  List<List<_CategoryCell>>? _cachedPages;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _CategoryPagedGrid oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.categories != widget.categories) {
      _cachedPages = null;
    }
  }

  List<List<_CategoryCell>> get _pages {
    return _cachedPages ??= _buildPages();
  }

  List<List<_CategoryCell>> _buildPages() {
    final cells = <_CategoryCell>[
      ...widget.categories.map(_CategoryCell.category),
      const _CategoryCell.viewAll(),
    ];

    final pages = <List<_CategoryCell>>[];
    for (var i = 0; i < cells.length; i += _itemsPerPage) {
      final end = (i + _itemsPerPage).clamp(0, cells.length);
      final page = List<_CategoryCell>.from(cells.sublist(i, end));
      while (page.length < _itemsPerPage) {
        page.add(const _CategoryCell.empty());
      }
      pages.add(page);
    }
    return pages;
  }

  double _tileHeight(double width) {
    final tileWidth =
        (width - _gridSpacing * (_gridColumns - 1)) / _gridColumns;
    return tileWidth / _tileAspectRatio;
  }

  double _gridHeight(double width) {
    final tileHeight = _tileHeight(width);
    return tileHeight * _gridRows + _gridSpacing * (_gridRows - 1);
  }

  Widget _buildCell(_CategoryCell cell, int globalIndex) {
    switch (cell.kind) {
      case _CategoryCellKind.empty:
        return const SizedBox.shrink();
      case _CategoryCellKind.viewAll:
        return CategoryGridTile.more(
          onTap: () => context.go(RoutePaths.categories),
          style: CategoryTileStyle.flat,
        );
      case _CategoryCellKind.category:
        final category = cell.category!;
        return CategoryGridTile.fromCategory(
          category: category,
          icon: categoryIconTypes[globalIndex % categoryIconTypes.length],
          style: CategoryTileStyle.flat,
          onTap: () {
            context.go(
              ProductSearch.buildPath(categoryName: category.categoryName),
            );
          },
        );
    }
  }

  Widget _buildGridPage(List<_CategoryCell> page, int pageIndex, double width) {
    final tileHeight = _tileHeight(width);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(_gridRows, (row) {
        return Padding(
          padding: EdgeInsets.only(bottom: row < _gridRows - 1 ? _gridSpacing : 0),
          child: Row(
            children: List.generate(_gridColumns, (col) {
              final index = row * _gridColumns + col;
              final globalIndex = pageIndex * _itemsPerPage + index;

              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    right: col < _gridColumns - 1 ? _gridSpacing : 0,
                  ),
                  child: SizedBox(
                    height: tileHeight,
                    child: _buildCell(page[index], globalIndex),
                  ),
                ),
              );
            }),
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = _pages;

    return RepaintBoundary(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final gridHeight = _gridHeight(constraints.maxWidth);

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: gridHeight,
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: pages.length,
                  onPageChanged: (index) => setState(() => _currentPage = index),
                  itemBuilder: (context, pageIndex) {
                    return _buildGridPage(
                      pages[pageIndex],
                      pageIndex,
                      constraints.maxWidth,
                    );
                  },
                ),
              ),
              if (pages.length > 1) ...[
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(pages.length, (index) {
                    final active = index == _currentPage;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: active ? 18 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color:
                            active ? AppColors.primary : AppColors.borderLight,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
