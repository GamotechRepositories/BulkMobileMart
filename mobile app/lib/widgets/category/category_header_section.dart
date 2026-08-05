import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../models/category.dart';
import '../common/app_network_image.dart';
import 'category_grid_tile.dart';

/// Category title card + subcategory pills — frontend `CategoryHeaderSection`.
class CategoryHeaderSection extends StatelessWidget {
  const CategoryHeaderSection({
    super.key,
    required this.category,
    required this.categoryName,
    required this.subcategories,
    required this.selectedSubcategory,
    required this.onSubcategorySelected,
  });

  final Category? category;
  final String categoryName;
  final List<String> subcategories;
  final String? selectedSubcategory;
  final ValueChanged<String?> onSubcategorySelected;

  @override
  Widget build(BuildContext context) {
    final imageUrl = category != null ? resolveCategoryImageUrl(category!) : null;
    final subtitle = subcategories.isNotEmpty
        ? subcategories.join(', ')
        : 'Browse our wholesale $categoryName collection.';

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.borderLight),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(
                  width: 36,
                  height: 36,
                  child: imageUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: AppNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.contain,
                            cacheWidth: 72,
                            cacheHeight: 72,
                            errorIcon: Icons.category_outlined,
                          ),
                        )
                      : DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.mobileSurface,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Center(
                            child: Text(
                              categoryName.isNotEmpty
                                  ? categoryName.characters.first.toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        categoryName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          height: 1.2,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (subcategories.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text(
                    'Subcategory:',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SizedBox(
                      height: 28,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: subcategories.length + 1,
                        separatorBuilder: (_, _) => const SizedBox(width: 6),
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            final isActive = selectedSubcategory == null ||
                                selectedSubcategory!.isEmpty;
                            return _SubcategoryPill(
                              label: 'All',
                              isActive: isActive,
                              onTap: () => onSubcategorySelected(null),
                            );
                          }

                          final sub = subcategories[index - 1];
                          return _SubcategoryPill(
                            label: sub,
                            isActive: selectedSubcategory == sub,
                            onTap: () => onSubcategorySelected(sub),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SubcategoryPill extends StatelessWidget {
  const _SubcategoryPill({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.borderLight,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: isActive ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
