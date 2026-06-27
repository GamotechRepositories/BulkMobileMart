import 'package:gal/gal.dart';

import 'network_image_bytes.dart';

class GallerySaveResult {
  const GallerySaveResult({required this.success, this.message});

  final bool success;
  final String? message;
}

Future<GallerySaveResult> saveProductImageToGallery({
  required String imageUrl,
  required String productId,
}) async {
  final url = imageUrl.trim();
  if (url.isEmpty) {
    return const GallerySaveResult(
      success: false,
      message: 'No image available to save.',
    );
  }

  try {
    if (!await Gal.hasAccess()) {
      final granted = await Gal.requestAccess();
      if (!granted) {
        return const GallerySaveResult(
          success: false,
          message: 'Allow photo permission to save image.',
        );
      }
    }

    var bytes = await downloadNetworkImageBytes(url);
    if (bytes == null || bytes.isEmpty) {
      return const GallerySaveResult(
        success: false,
        message: 'Could not download image.',
      );
    }

    final safeId = productId.replaceAll(RegExp(r'[^\w-]'), '');
    final name = safeId.isEmpty ? 'product-image' : 'product-$safeId';

    await Gal.putImageBytes(bytes, name: name);
    return const GallerySaveResult(success: true);
  } on GalException catch (error) {
    return GallerySaveResult(success: false, message: error.type.message);
  } catch (_) {
    return const GallerySaveResult(
      success: false,
      message: 'Could not save image.',
    );
  }
}
