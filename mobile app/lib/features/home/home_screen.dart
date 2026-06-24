import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/theme.dart';
import '../../core/refresh/app_refresh.dart';
import '../../core/scroll/tab_scroll_registry.dart';
import '../../widgets/layout/mobile_search_bar.dart';
import 'home_search_focus.dart';
import 'widgets/best_deals_section.dart';
import 'widgets/category_nav_section.dart';
import 'widgets/deferred_home_section.dart';
import 'widgets/hero_banner_carousel.dart';
import 'widgets/hot_selling_section.dart';
import 'widgets/just_arrived_section.dart';
import 'widgets/recently_viewed_section.dart';
import 'widgets/social_media_carousel_section.dart';
import 'widgets/testimonials_section.dart';
import 'widgets/home_wholesale_banner.dart';
import 'widgets/top_brands_section.dart';
import 'widgets/why_choose_us_section.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  late final FocusNode _searchFocusNode;
  late final TabScrollRegistry _tabScrollRegistry;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabScrollRegistry = ref.read(tabScrollRegistryProvider);
    _searchFocusNode = FocusNode();
    HomeSearchFocus.attach(_searchFocusNode);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _tabScrollRegistry.register(ShellTabIndex.home, _scrollController);
    });
  }

  @override
  void dispose() {
    _tabScrollRegistry.unregister(ShellTabIndex.home, _scrollController);
    HomeSearchFocus.detach();
    _searchFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.pageBackground,
      child: RefreshIndicator(
        color: const Color(0xFFFF7A00),
        onRefresh: () => refreshHomeData(ref),
        child: CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.headerSearchBg,
                      AppColors.headerFadeBg,
                      AppColors.pageBackground,
                    ],
                    stops: [0.0, 0.45, 1.0],
                  ),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                      child: MobileSearchBar(focusNode: _searchFocusNode),
                    ),
                    const RepaintBoundary(child: HeroBannerCarousel()),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(child: CategoryNavSection()),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 150),
                  placeholderHeight: 140,
                  child: TopBrandsSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 300),
                  placeholderHeight: 280,
                  child: BestDealsSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 450),
                  placeholderHeight: 280,
                  child: JustArrivedSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 600),
                  placeholderHeight: 280,
                  child: HotSellingSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 750),
                  placeholderHeight: 280,
                  child: RecentlyViewedSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 280),
                  placeholderHeight: 280,
                  child: WhyChooseUsSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: DeferredHomeSection(
                delay: Duration(milliseconds: 320),
                placeholderHeight: 168,
                child: HomeWholesaleBanner(),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 360),
                  placeholderHeight: 180,
                  child: TestimonialsSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: RepaintBoundary(
                child: DeferredHomeSection(
                  delay: Duration(milliseconds: 400),
                  placeholderHeight: 160,
                  child: SocialMediaCarouselSection(),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 20)),
          ],
        ),
      ),
    );
  }
}
