import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../core/image/image_size.dart';
import '../../core/image/image_url_resolver.dart';
import '../../core/image/image_variant.dart';
import '../../core/perf/first_frame_profiler.dart';

/// Network image with variant-aware CDN URLs, bounded decode, and format fallback.
class AppNetworkImage extends StatefulWidget {
  const AppNetworkImage({
    super.key,
    required this.imageUrl,
    this.variant = ImageVariant.medium,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.alignment = Alignment.center,
    this.cacheWidth,
    this.cacheHeight,
    this.placeholder,
    this.errorIcon = Icons.image_not_supported_outlined,
    this.errorIconSize = 28,
  });

  /// Original asset URL from API — resolved internally via [ImageUrlResolver].
  final String imageUrl;
  final ImageVariant variant;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Alignment alignment;
  /// Optional logical px override; defaults to [ImageSize.forVariant].
  final int? cacheWidth;
  final int? cacheHeight;
  final Widget? placeholder;
  final IconData errorIcon;
  final double errorIconSize;

  @override
  State<AppNetworkImage> createState() => _AppNetworkImageState();
}

class _AppNetworkImageState extends State<AppNetworkImage> {
  late List<String> _candidates;
  int _candidateIndex = 0;

  @override
  void initState() {
    super.initState();
    _candidates = _buildCandidates();
  }

  @override
  void didUpdateWidget(covariant AppNetworkImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl ||
        oldWidget.variant != widget.variant) {
      _candidates = _buildCandidates();
      _candidateIndex = 0;
    }
  }

  List<String> _buildCandidates() {
    return ImageUrlResolver.resolveCandidates(
      widget.imageUrl,
      variant: widget.variant,
    );
  }

  String get _activeUrl =>
      _candidates.isEmpty ? widget.imageUrl.trim() : _candidates[_candidateIndex];

  void _tryNextCandidate() {
    if (_candidateIndex + 1 >= _candidates.length) return;
    setState(() => _candidateIndex++);
  }

  int? _memDim(BuildContext context, double? logical, int? cacheLogical) {
    final variantSize = ImageSize.forVariant(widget.variant);
    final logicalBound = cacheLogical ?? logical?.round();
    final value = logicalBound ?? variantSize.maxDimension;
    if (!value.isFinite || value <= 0) return null;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final cap = variantSize.maxDimension * dpr;
    return (value * dpr).clamp(1, cap).round();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.imageUrl.trim().isEmpty) {
      return _errorBox();
    }

    final memW = _memDim(context, widget.width, widget.cacheWidth);
    final memH = _memDim(context, widget.height, widget.cacheHeight);

    return CachedNetworkImage(
      key: ValueKey(_activeUrl),
      imageUrl: _activeUrl,
      fit: widget.fit,
      alignment: widget.alignment,
      width: widget.width,
      height: widget.height,
      memCacheWidth: memW,
      memCacheHeight: memH,
      maxWidthDiskCache: memW != null ? memW.clamp(64, 1200) : 800,
      maxHeightDiskCache: memH?.clamp(64, 1200),
      filterQuality: FilterQuality.low,
      fadeInDuration: const Duration(milliseconds: 120),
      fadeOutDuration: const Duration(milliseconds: 80),
      imageBuilder: (context, imageProvider) {
        FirstFrameProfiler.traceImageDecode(
          imageProvider,
          createLocalImageConfiguration(
            context,
            size: Size(widget.width ?? 0, widget.height ?? 0),
          ),
        );
        return Image(
          image: imageProvider,
          fit: widget.fit,
          alignment: widget.alignment,
          width: widget.width,
          height: widget.height,
          filterQuality: FilterQuality.low,
          gaplessPlayback: true,
        );
      },
      placeholder: (_, _) => widget.placeholder ?? _loadingBox(),
      errorWidget: (_, _, _) {
        if (_candidateIndex + 1 < _candidates.length) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _tryNextCandidate();
          });
          return widget.placeholder ?? _loadingBox();
        }
        return _errorBox();
      },
    );
  }

  Widget _loadingBox() {
    return ColoredBox(
      color: AppColors.mobileSurface,
      child: Center(
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.primary.withValues(alpha: 0.7),
          ),
        ),
      ),
    );
  }

  Widget _errorBox() {
    return ColoredBox(
      color: AppColors.mobileSurface,
      child: Center(
        child: Icon(
          widget.errorIcon,
          size: widget.errorIconSize,
          color: AppColors.textMuted,
        ),
      ),
    );
  }
}
