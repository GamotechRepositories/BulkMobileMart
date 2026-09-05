import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:gal/gal.dart';
import 'package:path_provider/path_provider.dart';

import 'network_image_bytes.dart';

class GallerySaveResult {
  const GallerySaveResult({required this.success, this.message});

  final bool success;
  final String? message;
}

/// Saves a network image using MediaStore / Photos add APIs.
Future<GallerySaveResult> saveNetworkImageToGallery({
  required String imageUrl,
  required String fileName,
  String successMessage = 'Image saved to gallery.',
}) async {
  final url = imageUrl.trim();
  if (url.isEmpty) {
    return const GallerySaveResult(
      success: false,
      message: 'No image available to save.',
    );
  }

  try {
    final hasAccess = await Gal.hasAccess(toAlbum: false);
    if (!hasAccess) {
      final granted = await Gal.requestAccess(toAlbum: false);
      if (!granted) {
        return const GallerySaveResult(
          success: false,
          message: 'Allow photo library access to save this image.',
        );
      }
    }

    final bytes = await downloadNetworkImageBytes(url);
    if (bytes == null || bytes.isEmpty) {
      return const GallerySaveResult(
        success: false,
        message: 'Could not download image.',
      );
    }

    final safeName = fileName.replaceAll(RegExp(r'[^\w.-]'), '');
    final name = safeName.isEmpty ? 'qr-payment' : safeName;

    final tempDir = await getTemporaryDirectory();
    final tempFile = File('${tempDir.path}/$name.png');
    await tempFile.writeAsBytes(bytes, flush: true);

    await Gal.putImage(tempFile.path);
    return GallerySaveResult(success: true, message: successMessage);
  } on GalException catch (error) {
    return GallerySaveResult(success: false, message: error.type.message);
  } catch (error, st) {
    debugPrint('saveNetworkImageToGallery failed: $error\n$st');
    return const GallerySaveResult(
      success: false,
      message: 'Could not save image to gallery.',
    );
  }
}

Future<GallerySaveResult> saveProductImageToGallery({
  required String imageUrl,
  required String productId,
}) async {
  final safeId = productId.replaceAll(RegExp(r'[^\w-]'), '');
  final name = safeId.isEmpty ? 'product-image' : 'product-$safeId';

  return saveNetworkImageToGallery(
    imageUrl: imageUrl,
    fileName: name,
  );
}
