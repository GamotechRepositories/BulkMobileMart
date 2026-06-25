import 'image_size.dart';
import 'image_variant.dart';

/// Production decode targets — single source of truth for widget sizing.
class ImageConstants {
  ImageConstants._();

  static const categoryIcon = ImageSize.categoryIcon;
  static const brandLogo = ImageSize.brandLogo;
  static const productThumbnail = ImageSize.productThumbnail;
  static const productCard = ImageSize.productCard;
  static const productDetail = ImageSize.productDetail;
  static const heroBanner = ImageSize.heroBanner;
  static const profile = ImageSize.profile;
  static const paymentIcon = ImageSize.paymentIcon;
  static const supportIcon = ImageSize.supportIcon;

  /// Approximate average full-resolution product image payload (bytes).
  static const int avgOriginalProductBytes = 850000;

  /// Approximate variant payloads for bandwidth estimates.
  static const Map<ImageVariant, int> avgVariantBytes = {
    ImageVariant.thumbnail: 12000,
    ImageVariant.small: 18000,
    ImageVariant.medium: 45000,
    ImageVariant.large: 120000,
    ImageVariant.banner: 55000,
    ImageVariant.original: avgOriginalProductBytes,
  };

  /// CloudFront image-optimization query keys (Lambda@Edge / SIH compatible).
  static const cloudFrontWidthParam = 'w';
  static const cloudFrontHeightParam = 'h';
  static const cloudFrontFormatParam = 'format';
  static const cloudFrontFitParam = 'fit';

  /// S3 / self-hosted filename suffixes (see [ImageUrlResolver]).
  static const variantSuffixThumb = '_thumb';
  static const variantSuffixSmall = '_small';
  static const variantSuffixMedium = '_medium';
  static const variantSuffixLarge = '_large';
}
