import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../core/utils/image_url_utils.dart';
import 'shimmer.dart';

/// Network image with memory/disk cache sizing.
/// Loads the same CDN URLs as the website (no broken API resize proxy).
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.alignment = Alignment.center,
    this.cacheWidth,
    this.cacheHeight,
    this.placeholder,
    this.errorIcon = Icons.image_not_supported_outlined,
    this.errorIconSize = 28,
    this.optimizeRemote = true,
  });

  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Alignment alignment;
  /// Logical px used for decode sizing.
  final int? cacheWidth;
  /// Logical px used for decode height.
  final int? cacheHeight;
  final Widget? placeholder;
  final IconData errorIcon;
  final double errorIconSize;
  final bool optimizeRemote;

  int? _logicalDim(double? logical, int? cacheLogical) {
    final value = cacheLogical?.toDouble() ?? logical;
    if (value == null || !value.isFinite || value <= 0) return null;
    return value.round();
  }

  int? _memDim(BuildContext context, int? logicalPx) {
    if (logicalPx == null) return null;
    final dpr = MediaQuery.devicePixelRatioOf(context).clamp(1.0, 2.5);
    return (logicalPx * dpr).round().clamp(64, 1600);
  }

  @override
  Widget build(BuildContext context) {
    final original = imageUrl.trim();
    if (original.isEmpty) {
      return _errorBox();
    }

    final logicalW = _logicalDim(width, cacheWidth);
    final logicalH = _logicalDim(height, cacheHeight);
    final memW = _memDim(context, logicalW);
    final memH = _memDim(context, logicalH);

    final networkW = memW ?? (logicalW != null ? logicalW * 2 : null);
    final resolvedUrl = optimizeRemote
        ? optimizeImageUrl(original, width: networkW)
        : original;

    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      fit: fit,
      alignment: alignment,
      width: width,
      height: height,
      memCacheWidth: memW,
      memCacheHeight: memH,
      maxWidthDiskCache: memW != null ? memW.clamp(200, 1200) : 800,
      maxHeightDiskCache: memH?.clamp(200, 1200),
      filterQuality: FilterQuality.medium,
      fadeInDuration: const Duration(milliseconds: 120),
      fadeOutDuration: const Duration(milliseconds: 80),
      placeholder: (_, _) => placeholder ?? _loadingBox(),
      errorWidget: (_, _, _) => _errorBox(),
    );
  }

  Widget _loadingBox() {
    return const Shimmer(
      child: ColoredBox(
        color: Color(0xFFE8E8E8),
        child: SizedBox.expand(),
      ),
    );
  }

  Widget _errorBox() {
    return ColoredBox(
      color: Colors.white,
      child: Center(
        child: Icon(errorIcon, size: errorIconSize, color: AppColors.textMuted),
      ),
    );
  }
}
