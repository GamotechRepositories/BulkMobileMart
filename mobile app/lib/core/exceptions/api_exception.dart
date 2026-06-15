import 'package:dio/dio.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.cause});

  final String message;
  final int? statusCode;
  final Object? cause;

  factory ApiException.fromDio(DioException error) {
    final response = error.response;
    final data = response?.data;

    if (data is Map<String, dynamic>) {
      final message = data['message']?.toString();
      if (message != null && message.isNotEmpty) {
        return ApiException(
          message,
          statusCode: response?.statusCode,
          cause: error,
        );
      }
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return ApiException(
          'Connection timed out. Check your network and API URL.',
          statusCode: response?.statusCode,
          cause: error,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          'Cannot reach the backend. Ensure the server is running.',
          statusCode: response?.statusCode,
          cause: error,
        );
      default:
        return ApiException(
          error.message ?? 'Something went wrong',
          statusCode: response?.statusCode,
          cause: error,
        );
    }
  }

  @override
  String toString() => message;
}
