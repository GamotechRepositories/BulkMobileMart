/// Builds a display-sized image URL when the CDN supports transforms.
///
/// Cloudinary URLs get `w_*,c_limit,q_auto,f_auto`.
/// S3/CloudFront URLs are left unchanged (loaded directly like the website).
/// Client-side memCacheWidth still avoids decoding full-resolution bitmaps.
String optimizeImageUrl(String rawUrl, {int? width}) {
  final url = rawUrl.trim();
  if (url.isEmpty) return url;

  final targetWidth = width == null ? null : width.clamp(64, 1600);
  if (targetWidth == null) return url;

  final cloudinary = _optimizeCloudinaryUrl(url, targetWidth);
  if (cloudinary != null) return cloudinary;

  // Direct CDN URL — same as website. Do not route through API resize proxy
  // (that endpoint only helps after backend deploy, and breaks images before then).
  return url;
}

String? _optimizeCloudinaryUrl(String url, int width) {
  final marker = '/upload/';
  final index = url.indexOf(marker);
  if (index < 0 || !url.contains('res.cloudinary.com')) return null;

  final afterUpload = url.substring(index + marker.length);
  // Already transformed.
  if (RegExp(r'(^|/)(w_|c_|q_|f_)').hasMatch(afterUpload.split('/').first)) {
    return url;
  }

  final transform = 'w_$width,c_limit,q_auto,f_auto';
  return '${url.substring(0, index + marker.length)}$transform/$afterUpload';
}
