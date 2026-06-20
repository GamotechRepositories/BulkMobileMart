import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_decorations.dart';
import '../../../config/theme.dart';
import '../../../models/hero_banner.dart';
import '../../../widgets/common/app_network_image.dart';
import '../../../widgets/common/skeleton_loaders.dart';
import '../home_providers.dart';

class HeroBannerCarousel extends ConsumerStatefulWidget {
  const HeroBannerCarousel({super.key});

  @override
  ConsumerState<HeroBannerCarousel> createState() => _HeroBannerCarouselState();
}

class _HeroBannerCarouselState extends ConsumerState<HeroBannerCarousel> {
  final _pageController = PageController(viewportFraction: 0.92);
  int _current = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  List<HeroBanner> _visibleBanners(List<HeroBanner> banners) {
    return banners
        .where((banner) => banner.isActive && banner.imageUrl.trim().isNotEmpty)
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));
  }

  @override
  Widget build(BuildContext context) {
    final bannersAsync = ref.watch(heroBannersProvider);

    return RepaintBoundary(
      child: bannersAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.only(top: 4, bottom: 12),
          child: SkeletonHeroBanner(),
        ),
        error: (_, _) => const SizedBox.shrink(),
        data: (banners) {
          final slides = _visibleBanners(banners);
          if (slides.isEmpty) return const SizedBox.shrink();
          return _buildCarousel(slides);
        },
      ),
    );
  }

  Widget _buildCarousel(List<HeroBanner> slides) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 4, 0, 12),
      child: Column(
        children: [
          SizedBox(
            height: 176,
            child: PageView.builder(
              controller: _pageController,
              itemCount: slides.length,
              allowImplicitScrolling: false,
              onPageChanged: (index) => setState(() => _current = index),
              itemBuilder: (context, index) {
                final banner = slides[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: _BannerSlide(banner: banner),
                );
              },
            ),
          ),
          if (slides.length > 1) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(slides.length, (index) {
                final active = index == _current;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? AppColors.primary : AppColors.borderLight,
                    borderRadius: BorderRadius.circular(999),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }
}

class _BannerSlide extends StatelessWidget {
  const _BannerSlide({required this.banner});

  final HeroBanner banner;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        return ClipRRect(
          borderRadius: BorderRadius.circular(AppDecorations.radiusLg),
          child: SizedBox(
            height: 176,
            width: width,
            child: AppNetworkImage(
              imageUrl: banner.imageUrl,
              fit: BoxFit.cover,
              width: width,
              height: 176,
              cacheWidth: width.round(),
              cacheHeight: 176,
            ),
          ),
        );
      },
    );
  }
}
