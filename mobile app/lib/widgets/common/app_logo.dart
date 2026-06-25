import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../core/image/image_constants.dart';
import '../../core/image/image_url_resolver.dart';
import '../../core/image/image_variant.dart';

class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.height = 40, this.invert = false});

  final double height;
  final bool invert;

  @override
  Widget build(BuildContext context) {
    final networkUrl = ImageUrlResolver.resolve(
      AppConstants.logoUrl,
      variant: ImageVariant.small,
    );

    return Image.asset(
      AppConstants.logoAsset,
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.low,
      gaplessPlayback: true,
      errorBuilder: (context, error, stackTrace) => CachedNetworkImage(
        imageUrl: networkUrl,
        height: height,
        fit: BoxFit.contain,
        memCacheWidth: ImageConstants.brandLogo.width,
        memCacheHeight: ImageConstants.brandLogo.height,
        filterQuality: FilterQuality.low,
        errorWidget: (context, url, err) => _textFallback(context),
      ),
    );
  }

  Widget _textFallback(BuildContext context) {
    return Text(
      'BulkMobileMart',
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: invert ? Colors.white : null,
          ),
    );
  }
}
