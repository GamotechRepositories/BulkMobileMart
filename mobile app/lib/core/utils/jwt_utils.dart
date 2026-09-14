import 'dart:convert';

/// Lightweight JWT helpers (decode only — no signature verification).
class JwtUtils {
  JwtUtils._();

  /// Returns true when the token is missing, malformed, or past `exp`.
  /// [skew] allows a small clock drift buffer before treating as expired.
  static bool isExpired(String? token, {Duration skew = const Duration(seconds: 30)}) {
    final exp = expiryUtc(token);
    if (exp == null) return true;
    return DateTime.now().toUtc().isAfter(exp.subtract(skew));
  }

  /// JWT `exp` as UTC, or null if the token cannot be decoded.
  static DateTime? expiryUtc(String? token) {
    final payload = decodePayload(token);
    if (payload == null) return null;
    final exp = payload['exp'];
    if (exp is int) {
      return DateTime.fromMillisecondsSinceEpoch(exp * 1000, isUtc: true);
    }
    if (exp is num) {
      return DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000, isUtc: true);
    }
    return null;
  }

  static Map<String, dynamic>? decodePayload(String? token) {
    if (token == null || token.isEmpty) return null;
    final parts = token.split('.');
    if (parts.length < 2) return null;

    try {
      final normalized = base64Url.normalize(parts[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final json = jsonDecode(decoded);
      if (json is Map<String, dynamic>) return json;
      if (json is Map) return Map<String, dynamic>.from(json);
    } catch (_) {}
    return null;
  }
}
