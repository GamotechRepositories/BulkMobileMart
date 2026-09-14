import 'package:dio/dio.dart';

import '../auth/session_expired_handler.dart';
import '../exceptions/api_exception.dart';
import '../../config/env.dart';
import '../storage/auth_storage.dart';

class ApiClient {
  ApiClient(
    this._authStorage, {
    SessionExpiredHandler? sessionExpiredHandler,
  }) : _sessionExpiredHandler = sessionExpiredHandler {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final hasAuth = options.headers.containsKey('Authorization');
          if (!hasAuth) {
            if (_authStorage.hasExpiredToken) {
              // Drop dead JWT quietly; AuthController updates UI to logged-out.
              await _authStorage.clear();
              _sessionExpiredHandler?.notifyUnauthorized(promptLogin: false);
            } else {
              final token = _authStorage.validToken;
              if (token != null && token.isNotEmpty) {
                options.headers['Authorization'] = 'Bearer $token';
              }
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          final path = error.requestOptions.path;
          final apiError = ApiException.fromDio(error);

          if (status == 401 && !_isAuthCredentialRequest(path)) {
            await _authStorage.clear();
            final isSessionProbe = path.toLowerCase().contains('/api/users/me');
            _sessionExpiredHandler?.notifyUnauthorized(
              // Cold-start /me failures should not force the login sheet.
              promptLogin: !isSessionProbe,
            );
          }

          handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              response: error.response,
              type: error.type,
              error: apiError,
              message: apiError.message,
            ),
          );
        },
      ),
    );
  }

  final AuthStorage _authStorage;
  final SessionExpiredHandler? _sessionExpiredHandler;
  late final Dio _dio;

  Dio get dio => _dio;

  /// Login/OTP endpoints can return 401 for wrong credentials — do not logout.
  static bool _isAuthCredentialRequest(String path) {
    final normalized = path.toLowerCase();
    const authPaths = <String>[
      '/api/users/otp/send',
      '/api/users/otp/verify',
      '/api/users/otp/complete-signup',
      '/api/users/login',
      '/api/users/signup',
      '/api/users/login/phone',
      '/api/users/password/reset',
    ];
    return authPaths.any(normalized.contains);
  }
}
