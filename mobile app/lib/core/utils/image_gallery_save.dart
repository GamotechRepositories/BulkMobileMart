import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:gal/gal.dart';

import 'network_image_bytes.dart';

class GallerySaveResult {
  const GallerySaveResult({required this.success, this.message});

  final bool success;
  final String? message;
}

/// Saves a network image using MediaStore / Photos add APIs.
///
/// Android 10+ (API 29+): no READ_MEDIA / storage read permission is requested.
/// Older Android may need WRITE_EXTERNAL_STORAGE (maxSdkVersion 29 in the manifest).
/// iOS uses NSPhotoLibraryAddUsageDescription only (add access), not full library read.
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
    // Skip runtime permission prompts on modern Android — `gal` already treats
    // API > 29 as granted. Only request when the platform actually needs it
    // (legacy Android write, or iOS add-to-library).
    final needsAccessPrompt = !kIsWeb &&
        (Platform.isIOS ||
            Platform.isMacOS ||
            (Platform.isAndroid &&
                !await Gal.hasAccess()));

    if (needsAccessPrompt) {
      final granted = await Gal.requestAccess();
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
    final name = safeName.isEmpty ? 'image' : safeName;

    await Gal.putImageBytes(bytes, name: name);
    return GallerySaveResult(success: true, message: successMessage);
  } on GalException catch (error) {
    return GallerySaveResult(success: false, message: error.type.message);
  } catch (_) {
    return const GallerySaveResult(
      success: false,
      message: 'Could not save image.',
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
