import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_decorations.dart';
import '../../../config/theme.dart';
import '../../../models/hero_banner.dart';
import '../../../widgets/common/app_network_image.dart';
import '../../../widgets/common/skeleton_loaders.dart';
import '../home_fallback_data.dart';
import '../home_providers.dart';
import 'home_promo_banner.dart';

class HeroBannerCarousel extends ConsumerStatefulWidget {
  const HeroBannerCarousel({super.key});

  @override
  ConsumerState<HeroBannerCarousel> createState() =>
      _HeroBannerCarouselState();
}

class _HeroBannerCarouselState extends ConsumerState<HeroBannerCarousel> {
  final _pageController = PageController(viewportFraction: 0.92);
  int _current = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  List<_Slide> _buildSlides(List<HeroBanner> apiBanners) {
    final slides = <_Slide>[
      const _Slide.promo(),
      const _Slide.promoWholesale(),
    ];
    for (final banner in apiBanners) {
      if (banner.imageUrl.trim().isEmpty) continue;
      slides.add(_Slide.image(banner));
    }
    // Last banner first on open; swipe manually for others.
    if (slides.length > 1) {
      final last = slides.removeLast();
      slides.insert(0, last);
    }
    return slides;
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
        error: (_, __) => _buildCarousel(_buildSlides(fallbackHeroBanners())),
        data: (banners) {
          final display = banners.isEmpty ? fallbackHeroBanners() : banners;
          return _buildCarousel(_buildSlides(display));
        },
      ),
    );
  }

  Widget _buildCarousel(List<_Slide> slides) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 4, 0, 12),
      child: Column(
        children: [
          SizedBox(
            height: 176,
            child: PageView.builder(
              controller: _pageController,
              itemCount: slides.length,
              onPageChanged: (index) => setState(() => _current = index),
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: slides[index].build(context),
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
                    color: active
                        ? AppColors.primary
                        : AppColors.borderLight,
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

class _Slide {
  const _Slide._({this.banner, this.variant = HomePromoVariant.sale});

  const _Slide.promo() : this._(variant: HomePromoVariant.sale);

  const _Slide.promoWholesale() : this._(variant: HomePromoVariant.wholesale);

  const _Slide.image(HeroBanner banner) : this._(banner: banner);

  final HeroBanner? banner;
  final HomePromoVariant variant;

  Widget build(BuildContext context) {
    if (banner != null) {
      return LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          return ClipRRect(
            borderRadius: BorderRadius.circular(AppDecorations.radiusLg),
            child: SizedBox(
              height: 176,
              width: width,
              child: AppNetworkImage(
                imageUrl: banner!.imageUrl,
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

    return HomePromoBanner(variant: variant);
  }
}
