import 'dart:async';

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
  static const _autoPlayMs = 5000;
  static const _swipeThreshold = 48.0;

  int _current = 0;
  int _slideCount = 0;
  double? _bannerAspectRatio;
  String? _resolvedForUrl;
  Timer? _autoPlayTimer;
  double _dragDx = 0;

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    super.dispose();
  }

  List<HeroBanner> _visibleBanners(List<HeroBanner> banners) {
    return banners
        .where((banner) => banner.isActive && banner.imageUrl.trim().isNotEmpty)
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));
  }

  void _resolveAspectRatio(String imageUrl) {
    final url = imageUrl.trim();
    if (url.isEmpty || _resolvedForUrl == url) return;
    _resolvedForUrl = url;

    final stream = NetworkImage(url).resolve(const ImageConfiguration());
    late final ImageStreamListener listener;
    listener = ImageStreamListener(
      (info, _) {
        stream.removeListener(listener);
        final w = info.image.width.toDouble();
        final h = info.image.height.toDouble();
        if (!mounted || w <= 0 || h <= 0) return;
        setState(() => _bannerAspectRatio = w / h);
      },
      onError: (_, _) {
        stream.removeListener(listener);
      },
    );
    stream.addListener(listener);
  }

  void _scheduleAutoPlay(int count) {
    _autoPlayTimer?.cancel();
    _slideCount = count;
    if (count <= 1) return;
    _autoPlayTimer = Timer.periodic(
      const Duration(milliseconds: _autoPlayMs),
      (_) {
        if (!mounted || _slideCount <= 1) return;
        setState(() => _current = (_current + 1) % _slideCount);
      },
    );
  }

  void _goTo(int index, int count) {
    if (count <= 0) return;
    setState(() => _current = (index + count) % count);
    _scheduleAutoPlay(count);
  }

  @override
  Widget build(BuildContext context) {
    final bannersAsync = ref.watch(heroBannersProvider);

    return bannersAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.only(top: 4, bottom: 12),
        child: SkeletonHeroBanner(),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (banners) {
        final slides = _visibleBanners(banners);
        if (slides.isEmpty) return const SizedBox.shrink();

        final current = _current.clamp(0, slides.length - 1);
        if (current != _current) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) setState(() => _current = current);
          });
        }

        if (_slideCount != slides.length) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            _resolveAspectRatio(slides.first.imageUrl);
            _scheduleAutoPlay(slides.length);
          });
        }
        return _buildCarousel(slides, current);
      },
    );
  }

  Widget _buildCarousel(List<HeroBanner> slides, int current) {
    final aspect = (_bannerAspectRatio ?? 2.0).clamp(1.2, 3.2);

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
      child: Column(
        children: [
          AspectRatio(
            aspectRatio: aspect,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppDecorations.radiusLg),
              clipBehavior: Clip.antiAlias,
              child: ColoredBox(
                color: Colors.white,
                child: GestureDetector(
                  onHorizontalDragStart: (_) => _autoPlayTimer?.cancel(),
                  onHorizontalDragUpdate: (details) {
                    _dragDx += details.delta.dx;
                  },
                  onHorizontalDragEnd: (_) {
                    final count = slides.length;
                    if (_dragDx.abs() >= _swipeThreshold && count > 1) {
                      if (_dragDx < 0) {
                        _goTo(current + 1, count);
                      } else {
                        _goTo(current - 1, count);
                      }
                    } else {
                      _scheduleAutoPlay(count);
                    }
                    _dragDx = 0;
                  },
                  // Hard cut: only the active banner — never peeks the next slide.
                  child: _BannerSlide(banner: slides[current]),
                ),
              ),
            ),
          ),
          if (slides.length > 1) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(slides.length, (index) {
                final active = index == current;
                return GestureDetector(
                  onTap: () => _goTo(index, slides.length),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: active ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary : AppColors.borderLight,
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
  }
}

class _BannerSlide extends StatelessWidget {
  const _BannerSlide({required this.banner});

  final HeroBanner banner;

  @override
  Widget build(BuildContext context) {
    return AppNetworkImage(
      imageUrl: banner.imageUrl,
      fit: BoxFit.contain,
      alignment: Alignment.center,
      width: double.infinity,
      height: double.infinity,
      cacheWidth: 1080,
      cacheHeight: 600,
    );
  }
}
