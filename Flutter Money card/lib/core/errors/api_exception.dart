import 'package:dio/dio.dart';
import 'error_codes.dart';

/// Base exception class for all Money Card API & domain errors.
class ApiException implements Exception {
  final ApiErrorCode code;
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? details;

  const ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.details,
  });

  factory ApiException.fromDioException(DioException dioException) {
    // If response is present, check for M0 V10 envelope error payload
    final response = dioException.response;
    if (response != null) {
      final statusCode = response.statusCode;
      final data = response.data;

      if (data is Map<String, dynamic> && data['error'] != null) {
        final errorData = data['error'];
        if (errorData is Map<String, dynamic>) {
          final codeStr = errorData['code'] as String?;
          final message = errorData['message'] as String? ?? 'An error occurred';
          final details = errorData['details'] as Map<String, dynamic>?;
          return ApiException(
            code: ApiErrorCode.fromString(codeStr),
            message: message,
            statusCode: statusCode,
            details: details,
          );
        }
      }

      return ApiException.fromStatusCode(
        statusCode ?? 500,
        response.statusMessage,
      );
    }

    switch (dioException.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          code: ApiErrorCode.timeoutError,
          message: 'Connection timed out. Please check your internet connection.',
        );
      case DioExceptionType.connectionError:
        return const ApiException(
          code: ApiErrorCode.networkError,
          message: 'Network connection failed. Please check your connection.',
        );
      case DioExceptionType.cancel:
        return const ApiException(
          code: ApiErrorCode.unknownError,
          message: 'Request was cancelled.',
        );
      case DioExceptionType.badCertificate:
        return const ApiException(
          code: ApiErrorCode.networkError,
          message: 'Security certificate error.',
        );
      case DioExceptionType.badResponse:
      case DioExceptionType.unknown:
      default:
        return ApiException(
          code: ApiErrorCode.unknownError,
          message: dioException.message ?? 'An unexpected network error occurred.',
        );
    }
  }

  factory ApiException.fromStatusCode(int statusCode, [String? customMessage]) {
    switch (statusCode) {
      case 400:
        return ApiException(
          code: ApiErrorCode.validationError,
          message: customMessage ?? 'Bad request. Please verify your input.',
          statusCode: 400,
        );
      case 401:
        return ApiException(
          code: ApiErrorCode.unauthorized,
          message: customMessage ?? 'Unauthorized. Please login again.',
          statusCode: 401,
        );
      case 403:
        return ApiException(
          code: ApiErrorCode.forbidden,
          message: customMessage ?? 'Access forbidden. Insufficient permissions.',
          statusCode: 403,
        );
      case 404:
        return ApiException(
          code: ApiErrorCode.notFound,
          message: customMessage ?? 'Resource not found.',
          statusCode: 404,
        );
      case 409:
        return ApiException(
          code: ApiErrorCode.duplicateRequest,
          message: customMessage ?? 'Conflict or duplicate request.',
          statusCode: 409,
        );
      case 410:
        return ApiException(
          code: ApiErrorCode.sessionNotFound,
          message: customMessage ?? 'Session expired or resource gone.',
          statusCode: 410,
        );
      case 422:
        return ApiException(
          code: ApiErrorCode.validationError,
          message: customMessage ?? 'Business validation error.',
          statusCode: 422,
        );
      case 500:
      case 502:
      case 503:
      default:
        return ApiException(
          code: ApiErrorCode.serverError,
          message: customMessage ?? 'Server error. Please try again later.',
          statusCode: statusCode,
        );
    }
  }

  @override
  String toString() => 'ApiException(code: ${code.value}, message: $message, statusCode: $statusCode)';
}
