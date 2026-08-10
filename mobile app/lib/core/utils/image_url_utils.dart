import '../../config/env.dart';

/// Builds a display-sized image URL so thumbnails don't download full originals.
///
/// - Cloudinary: injects `w_*,c_limit,q_auto,f_auto`
/// - S3/CloudFront (and other allowed CDN hosts): routes through
///   `GET /api/proxy/img?u=...&w=...` for on-demand WebP resize
String optimizeImageUrl(String rawUrl, {int? width}) {
  final url = rawUrl.trim();
  if (url.isEmpty) return url;

  final targetWidth = width == null
      ? null
      : width.clamp(64, 1600);

  if (targetWidth == null) return url;

  if (url.contains('/api/proxy/img?')) return url;

  final cloudinary = _optimizeCloudinaryUrl(url, targetWidth);
  if (cloudinary != null) return cloudinary;

  // Avoid proxying local/data assets.
  final uri = Uri.tryParse(url);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    return url;
  }

  final api = Env.apiUrl;
  return '$api/api/proxy/img?u=${Uri.encodeQueryComponent(url)}&w=$targetWidth';
}

String? _optimizeCloudinaryUrl(String url, int width) {
  final marker = '/upload/';
  final index = url.indexOf(marker);
  if (index < 0 || !url.contains('res.cloudinary.com')) return null;

  final afterUpload = url.substring(index + marker.length);
  // Already transformed.
  if (RegExp(r'(^|/)(w_|c_|q_|f_)').hasMatch(afterUpload.split('/').first)) {
    // Replace leading transform segment width if present, else leave as-is.
    return url;
  }

  final transform = 'w_$width,c_limit,q_auto,f_auto';
  return '${url.substring(0, index + marker.length)}$transform/$afterUpload';
}
