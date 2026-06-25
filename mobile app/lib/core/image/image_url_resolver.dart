import 'image_constants.dart';
import 'image_size.dart';
import 'image_variant.dart';

enum ImageDeliveryBackend { s3, cloudFront, cloudinary, unknown }

/// Central URL transformation for S3, CloudFront, and Cloudinary assets.
class ImageUrlResolver {
  ImageUrlResolver._();

  static ImageDeliveryBackend detectBackend(String url) {
    final host = Uri.tryParse(url)?.host.toLowerCase() ?? '';
    if (host.contains('cloudinary.com')) return ImageDeliveryBackend.cloudinary;
    if (host.contains('cloudfront.net') || host.contains('cdn.')) {
      return ImageDeliveryBackend.cloudFront;
    }
    if (host.contains('amazonaws.com') || host.contains('.s3.')) {
      return ImageDeliveryBackend.s3;
    }
    return ImageDeliveryBackend.unknown;
  }

  /// Primary resolved URL (WebP-preferred).
  static String resolve(
    String originalUrl, {
    ImageVariant variant = ImageVariant.medium,
  }) {
    final candidates = resolveCandidates(originalUrl, variant: variant);
    return candidates.isEmpty ? originalUrl.trim() : candidates.first;
  }

  /// Ordered fallback chain: WebP → JPG → PNG → original.
  static List<String> resolveCandidates(
    String originalUrl, {
    ImageVariant variant = ImageVariant.medium,
  }) {
    final trimmed = originalUrl.trim();
    if (trimmed.isEmpty || variant == ImageVariant.original) {
      return trimmed.isEmpty ? const [] : [trimmed];
    }

    if (_isAlreadyVariant(trimmed, variant)) {
      return [trimmed];
    }

    switch (detectBackend(trimmed)) {
      case ImageDeliveryBackend.cloudinary:
        return [_cloudinaryUrl(trimmed, variant)];
      case ImageDeliveryBackend.cloudFront:
        return _cloudFrontCandidates(trimmed, variant);
      case ImageDeliveryBackend.s3:
      case ImageDeliveryBackend.unknown:
        return _suffixVariantCandidates(trimmed, variant);
    }
  }

  static String _variantSuffix(ImageVariant variant) {
    switch (variant) {
      case ImageVariant.thumbnail:
        return ImageConstants.variantSuffixThumb;
      case ImageVariant.small:
        return ImageConstants.variantSuffixSmall;
      case ImageVariant.medium:
        return ImageConstants.variantSuffixMedium;
      case ImageVariant.large:
        return ImageConstants.variantSuffixLarge;
      case ImageVariant.banner:
        return ImageConstants.variantSuffixMedium;
      case ImageVariant.original:
        return '';
    }
  }

  static bool _isAlreadyVariant(String url, ImageVariant variant) {
    final suffix = _variantSuffix(variant);
    if (suffix.isEmpty) return false;
    final lower = url.toLowerCase();
    return lower.contains('$suffix.webp') ||
        lower.contains('$suffix.jpg') ||
        lower.contains('$suffix.jpeg') ||
        lower.contains('$suffix.png');
  }

  /// `iphone.jpg` → `iphone_thumb.webp`, `iphone_thumb.jpg`, `iphone_thumb.png`, original.
  static List<String> _suffixVariantCandidates(String url, ImageVariant variant) {
    final uri = Uri.tryParse(url);
    if (uri == null) return [url];

    final path = uri.path;
    final dot = path.lastIndexOf('.');
    if (dot <= 0) return [url];

    final basePath = path.substring(0, dot);
    final suffix = _variantSuffix(variant);
    final variantBase = '$basePath$suffix';

    final candidates = <String>[
      uri.replace(path: '$variantBase.webp').toString(),
      uri.replace(path: '$variantBase.jpg').toString(),
      uri.replace(path: '$variantBase.jpeg').toString(),
      uri.replace(path: '$variantBase.png').toString(),
      url,
    ];

    return candidates.toSet().toList();
  }

  /// Cloudinary transform in upload path.
  static String _cloudinaryUrl(String url, ImageVariant variant) {
    final size = ImageSize.forVariant(variant);
    final uri = Uri.parse(url);
    final segments = uri.pathSegments.toList();
    final uploadIndex = segments.indexOf('upload');
    if (uploadIndex == -1) return url;

    final transform =
        'w_${size.width},h_${size.height},c_limit,f_webp,q_auto:good';
    final next = uploadIndex + 1;
    if (next < segments.length && segments[next].startsWith('w_')) {
      segments[next] = transform;
    } else {
      segments.insert(next, transform);
    }
    return uri.replace(pathSegments: segments).toString();
  }

  /// CloudFront / Lambda@Edge / Serverless Image Handler query params.
  static List<String> _cloudFrontCandidates(String url, ImageVariant variant) {
    final size = ImageSize.forVariant(variant);
    final uri = Uri.parse(url);
    final params = Map<String, String>.from(uri.queryParameters)
      ..[ImageConstants.cloudFrontWidthParam] = '${size.width}'
      ..[ImageConstants.cloudFrontHeightParam] = '${size.height}'
      ..[ImageConstants.cloudFrontFormatParam] = 'webp'
      ..[ImageConstants.cloudFrontFitParam] = 'cover';

    final webp = uri.replace(queryParameters: params).toString();
    final jpg = uri
        .replace(
          queryParameters: {
            ...params,
            ImageConstants.cloudFrontFormatParam: 'jpg',
          },
        )
        .toString();
    return [webp, jpg, url];
  }
}
