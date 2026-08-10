import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../core/utils/image_url_utils.dart';
import 'shimmer.dart';

/// Network image with sized CDN/proxy URL + memory/disk cache sizing.
///
/// If the optimize proxy is unavailable (backend not deployed yet), falls back
/// to the original CDN URL so images still show.
class AppNetworkImage extends StatefulWidget {
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
  /// Logical px used for decode + remote resize request.
  final int? cacheWidth;
  /// Logical px used for decode height.
  final int? cacheHeight;
  final Widget? placeholder;
  final IconData errorIcon;
  final double errorIconSize;
  final bool optimizeRemote;

  @override
  State<AppNetworkImage> createState() => _AppNetworkImageState();
}

class _AppNetworkImageState extends State<AppNetworkImage> {
  var _useOriginal = false;

  @override
  void didUpdateWidget(covariant AppNetworkImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _useOriginal = false;
    }
  }

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
    final original = widget.imageUrl.trim();
    if (original.isEmpty) {
      return _errorBox();
    }

    final logicalW = _logicalDim(widget.width, widget.cacheWidth);
    final logicalH = _logicalDim(widget.height, widget.cacheHeight);
    final memW = _memDim(context, logicalW);
    final memH = _memDim(context, logicalH);

    final networkW = memW ?? (logicalW != null ? logicalW * 2 : null);
    final optimized = widget.optimizeRemote && !_useOriginal
        ? optimizeImageUrl(original, width: networkW)
        : original;
    final resolvedUrl = optimized;

    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      fit: widget.fit,
      alignment: widget.alignment,
      width: widget.width,
      height: widget.height,
      memCacheWidth: memW,
      memCacheHeight: memH,
      maxWidthDiskCache: memW != null ? memW.clamp(200, 1200) : 800,
      maxHeightDiskCache: memH?.clamp(200, 1200),
      filterQuality: FilterQuality.medium,
      fadeInDuration: const Duration(milliseconds: 120),
      fadeOutDuration: const Duration(milliseconds: 80),
      placeholder: (_, _) => widget.placeholder ?? _loadingBox(),
      errorWidget: (_, _, _) {
        // Optimize proxy missing / failed → show original CDN image.
        if (!_useOriginal &&
            widget.optimizeRemote &&
            resolvedUrl != original) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && !_useOriginal) {
              setState(() => _useOriginal = true);
            }
          });
          return widget.placeholder ?? _loadingBox();
        }
        return _errorBox();
      },
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
        child: Icon(
          widget.errorIcon,
          size: widget.errorIconSize,
          color: AppColors.textMuted,
        ),
      ),
    );
  }
}
