import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../config/constants.dart';
import '../utils/jwt_utils.dart';

class AuthStorage {
  AuthStorage(this._prefs);

  final SharedPreferences _prefs;

  static Future<AuthStorage> create() async {
    final prefs = await SharedPreferences.getInstance();
    return AuthStorage(prefs);
  }

  String? get token {
    final raw = _prefs.getString(AppConstants.authStorageKey);
    if (raw == null || raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return decoded['token'] as String?;
    } catch (_) {
      return null;
    }
  }

  /// Token only when present and not past JWT `exp` (client-side check).
  String? get validToken {
    final value = token;
    if (value == null || value.isEmpty) return null;
    if (JwtUtils.isExpired(value)) return null;
    return value;
  }

  bool get hasExpiredToken {
    final value = token;
    if (value == null || value.isEmpty) return false;
    return JwtUtils.isExpired(value);
  }

  Map<String, dynamic>? get session {
    final raw = _prefs.getString(AppConstants.authStorageKey);
    if (raw == null || raw.isEmpty) return null;

    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> saveSession({
    required Map<String, dynamic> user,
    required String token,
  }) async {
    await _prefs.setString(
      AppConstants.authStorageKey,
      jsonEncode({'user': user, 'token': token}),
    );
  }

  Future<void> clear() async {
    await _prefs.remove(AppConstants.authStorageKey);
  }

  /// Drops a locally-expired session so we never send a dead JWT.
  Future<bool> clearIfTokenExpired() async {
    if (!hasExpiredToken) return false;
    await clear();
    return true;
  }
}
