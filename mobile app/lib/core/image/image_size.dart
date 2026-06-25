import 'image_variant.dart';

/// Logical pixel bounds for a variant (before device pixel ratio).
class ImageSize {
  const ImageSize(this.width, this.height);

  final int width;
  final int height;

  int get maxDimension => width > height ? width : height;

  static const categoryIcon = ImageSize(96, 96);
  static const brandLogo = ImageSize(128, 128);
  static const productThumbnail = ImageSize(256, 256);
  static const productCard = ImageSize(512, 512);
  static const productDetail = ImageSize(1024, 1024);
  static const heroBanner = ImageSize(800, 450);
  static const profile = ImageSize(128, 128);
  static const paymentIcon = ImageSize(64, 64);
  static const supportIcon = ImageSize(64, 64);

  static ImageSize forVariant(ImageVariant variant) {
    switch (variant) {
      case ImageVariant.thumbnail:
        return productThumbnail;
      case ImageVariant.small:
        return brandLogo;
      case ImageVariant.medium:
        return productCard;
      case ImageVariant.large:
        return productDetail;
      case ImageVariant.banner:
        return heroBanner;
      case ImageVariant.original:
        return const ImageSize(2048, 2048);
    }
  }
}
