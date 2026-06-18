import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../config/app_decorations.dart';
import '../../../config/theme.dart';
import '../../../core/utils/product_search.dart';
import '../../../routes/route_paths.dart';
import '../../../widgets/common/app_network_image.dart';
import '../../../widgets/common/section_header.dart';
import '../../../widgets/common/skeleton_loaders.dart';
import '../home_providers.dart';
import 'home_section_card.dart';

class TopBrandsSection extends ConsumerWidget {
  const TopBrandsSection({super.key});

  static const _tileWidth = 116.0;
  static const _logoHeight = 92.0;
  static const _rowHeight = 132.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brandsAsync = ref.watch(brandsProvider);

    return brandsAsync.when(
      loading: () => const HomeSectionCard(
        margin: EdgeInsets.fromLTRB(0, 4, 0, 4),
        padding: EdgeInsets.fromLTRB(16, 0, 16, 0),
        child: Column(
          children: [
            SkeletonBox(width: 120, height: 20, borderRadius: 6),
            SizedBox(height: 12),
            SkeletonBox(height: 132, borderRadius: 12),
          ],
        ),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (brands) {
        if (brands.isEmpty) return const SizedBox.shrink();

        return HomeSectionCard(
          margin: const EdgeInsets.fromLTRB(0, 4, 0, 8),
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
          showDivider: true,
          child: Column(
            children: [
              SectionHeader(
                title: 'Top Brands',
                subtitle: 'Trusted accessory brands',
                dense: true,
                onViewAll: () => context.go(RoutePaths.product),
              ),
              SizedBox(
                height: _rowHeight,
                child: ListView.separated(
                  primary: false,
                  scrollDirection: Axis.horizontal,
                  clipBehavior: Clip.none,
                  cacheExtent: 320,
                  addAutomaticKeepAlives: false,
                  itemCount: brands.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final brand = brands[index];
                    return _BrandTile(
                      width: _tileWidth,
                      logoHeight: _logoHeight,
                      name: brand.brandName,
                      imageUrl: brand.brandImage,
                      onTap: () {
                        context.go(
                          ProductSearch.buildPath(brand: brand.brandName),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _BrandTile extends StatelessWidget {
  const _BrandTile({
    required this.width,
    required this.logoHeight,
    required this.name,
    required this.imageUrl,
    required this.onTap,
  });

  final double width;
  final double logoHeight;
  final String name;
  final String imageUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
          child: Column(
            children: [
              Container(
                height: logoHeight,
                width: width,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius:
                      BorderRadius.circular(AppDecorations.radiusMd),
                ),
                alignment: Alignment.center,
                padding: const EdgeInsets.all(12),
                child: imageUrl.trim().isNotEmpty
                    ? AppNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.contain,
                        cacheWidth: 112,
                        cacheHeight: 72,
                        errorIcon: Icons.storefront_outlined,
                        errorIconSize: 28,
                      )
                    : Icon(
                        Icons.storefront_outlined,
                        size: 32,
                        color: AppColors.textMuted.withValues(alpha: 0.8),
                      ),
              ),
              const SizedBox(height: 8),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
