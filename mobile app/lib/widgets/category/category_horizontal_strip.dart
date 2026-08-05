import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../models/category.dart';
import '../common/app_network_image.dart';
import 'category_grid_tile.dart';

/// Horizontal category chips — frontend `CategoryListBox` mobile variant.
class CategoryHorizontalStrip extends StatelessWidget {
  const CategoryHorizontalStrip({
    super.key,
    required this.categories,
    required this.selectedCategoryName,
    required this.onSelect,
  });

  final List<Category> categories;
  final String? selectedCategoryName;
  final ValueChanged<String?> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      child: SizedBox(
        height: 88,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: categories.length + 1,
          separatorBuilder: (_, _) => const SizedBox(width: 6),
          itemBuilder: (context, index) {
            if (index == 0) {
              return _CategoryStripChip(
                label: 'All',
                isActive: selectedCategoryName == null ||
                    selectedCategoryName!.isEmpty,
                showGridIcon: true,
                onTap: () => onSelect(null),
              );
            }

            final category = categories[index - 1];
            final isActive = selectedCategoryName != null &&
                selectedCategoryName!.toLowerCase() ==
                    category.categoryName.toLowerCase();

            return _CategoryStripChip(
              label: category.categoryName,
              imageUrl: resolveCategoryImageUrl(category),
              isActive: isActive,
              onTap: () => onSelect(category.categoryName),
            );
          },
        ),
      ),
    );
  }
}

class _CategoryStripChip extends StatelessWidget {
  const _CategoryStripChip({
    required this.label,
    required this.isActive,
    required this.onTap,
    this.imageUrl,
    this.showGridIcon = false,
  });

  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final String? imageUrl;
  final bool showGridIcon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 76,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary.withValues(alpha: 0.1)
                : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isActive ? AppColors.primary : AppColors.borderLight,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 48,
                height: 48,
                child: showGridIcon
                    ? DecoratedBox(
                        decoration: BoxDecoration(
                          color: AppColors.mobileSurface,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.grid_view_rounded,
                          size: 22,
                          color: AppColors.textSecondary,
                        ),
                      )
                    : imageUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: ColoredBox(
                              color: Colors.white,
                              child: AppNetworkImage(
                                imageUrl: imageUrl!,
                                fit: BoxFit.contain,
                                cacheWidth: 96,
                                cacheHeight: 96,
                                errorIcon: Icons.category_outlined,
                              ),
                            ),
                          )
                        : DecoratedBox(
                            decoration: BoxDecoration(
                              color: AppColors.mobileSurface,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                label.isNotEmpty
                                    ? label.characters.first.toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ),
                          ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: isActive ? AppColors.primary : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
