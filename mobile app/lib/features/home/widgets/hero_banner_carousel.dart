import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_decorations.dart';
import '../../../config/theme.dart';
import '../../../models/hero_banner.dart';
import '../../../widgets/common/app_network_image.dart';
import '../../../widgets/common/skeleton_loaders.dart';
import '../home_providers.dart';

/// Top home hero — same layout as [HomeWholesaleBanner] (cover, fixed height,
/// PageView, arrows, dots).
class HeroBannerCarousel extends ConsumerStatefulWidget {
  const HeroBannerCarousel({super.key});

  @override
  ConsumerState<HeroBannerCarousel> createState() => _HeroBannerCarouselState();
}

class _HeroBannerCarouselState extends ConsumerState<HeroBannerCarousel> {
  static const _autoPlayMs = 5000;
  static const _bannerHeight = 168.0;

  final PageController _pageController = PageController();
  Timer? _autoPlayTimer;
  int _currentPage = 0;
  int _scheduledForCount = 0;

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  List<HeroBanner> _visibleBanners(List<HeroBanner> banners) {
    return banners
        .where((banner) => banner.isActive && banner.imageUrl.trim().isNotEmpty)
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));
  }

  void _scheduleAutoPlay(int itemCount) {
    if (_scheduledForCount == itemCount && _autoPlayTimer != null) return;
    _autoPlayTimer?.cancel();
    _scheduledForCount = itemCount;
    if (itemCount <= 1) return;

    _autoPlayTimer = Timer.periodic(
      const Duration(milliseconds: _autoPlayMs),
      (_) {
        if (!_pageController.hasClients) return;
        final current = _pageController.page?.round() ?? _currentPage;
        final next = (current + 1) % itemCount;
        _pageController.animateToPage(
          next,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeOutCubic,
        );
      },
    );
  }

  void _pauseAutoPlay() {
    _autoPlayTimer?.cancel();
    _autoPlayTimer = null;
    _scheduledForCount = 0;
  }

  void _goToPage(int index, int itemCount) {
    if (!_pageController.hasClients || itemCount <= 1) return;
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bannersAsync = ref.watch(heroBannersProvider);

    return bannersAsync.when(
      loading: () => const SkeletonHeroBanner(),
      error: (_, _) => const SizedBox.shrink(),
      data: (banners) {
        final slides = _visibleBanners(banners);
        if (slides.isEmpty) return const SizedBox.shrink();

        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _scheduleAutoPlay(slides.length);
        });

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Column(
            children: [
              SizedBox(
                height: _bannerHeight,
                child: Stack(
                  clipBehavior: Clip.hardEdge,
                  children: [
                    PageView.builder(
                      controller: _pageController,
                      itemCount: slides.length,
                      onPageChanged: (index) {
                        setState(() => _currentPage = index);
                        _pauseAutoPlay();
                        _scheduleAutoPlay(slides.length);
                      },
                      itemBuilder: (context, index) =>
                          _BannerSlide(banner: slides[index]),
                    ),
                    if (slides.length > 1) ...[
                      Positioned(
                        left: 6,
                        top: 0,
                        bottom: 0,
                        child: Center(
                          child: _SliderArrowButton(
                            icon: Icons.chevron_left_rounded,
                            onPressed: () {
                              _pauseAutoPlay();
                              _goToPage(
                                (_currentPage - 1 + slides.length) %
                                    slides.length,
                                slides.length,
                              );
                              _scheduleAutoPlay(slides.length);
                            },
                          ),
                        ),
                      ),
                      Positioned(
                        right: 6,
                        top: 0,
                        bottom: 0,
                        child: Center(
                          child: _SliderArrowButton(
                            icon: Icons.chevron_right_rounded,
                            onPressed: () {
                              _pauseAutoPlay();
                              _goToPage(
                                (_currentPage + 1) % slides.length,
                                slides.length,
                              );
                              _scheduleAutoPlay(slides.length);
                            },
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (slides.length > 1) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(slides.length, (index) {
                    final active = index == _currentPage;
                    return GestureDetector(
                      onTap: () {
                        _pauseAutoPlay();
                        _goToPage(index, slides.length);
                        _scheduleAutoPlay(slides.length);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: active ? 18 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.primary
                              : AppColors.borderLight,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _BannerSlide extends StatelessWidget {
  const _BannerSlide({required this.banner});

  final HeroBanner banner;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppDecorations.radiusLg),
      child: AppNetworkImage(
        imageUrl: banner.imageUrl,
        fit: BoxFit.cover,
        alignment: Alignment.center,
        width: double.infinity,
        height: double.infinity,
        cacheWidth: 480,
        cacheHeight: 336,
      ),
    );
  }
}

class _SliderArrowButton extends StatelessWidget {
  const _SliderArrowButton({
    required this.icon,
    required this.onPressed,
  });

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.38),
      elevation: 0,
      shadowColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onPressed,
        child: SizedBox(
          width: 30,
          height: 30,
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}
