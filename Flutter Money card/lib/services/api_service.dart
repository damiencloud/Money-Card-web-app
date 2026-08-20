import 'package:dio/dio.dart';
import '../core/errors/api_exception.dart';
import '../core/errors/error_codes.dart';

/// Base API Service wrapper around Dio ensuring type safety and M0 V10 envelope handling.
class ApiService {
  final Dio _dio;

  ApiService(this._dio);

  Dio get dio => _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    required T Function(dynamic data) fromJson,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw _unwrapDioException(e);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: ApiErrorCode.unknownError,
        message: e.toString(),
      );
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    required T Function(dynamic data) fromJson,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw _unwrapDioException(e);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: ApiErrorCode.unknownError,
        message: e.toString(),
      );
    }
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    required T Function(dynamic data) fromJson,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw _unwrapDioException(e);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: ApiErrorCode.unknownError,
        message: e.toString(),
      );
    }
  }

  Future<T> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    required T Function(dynamic data) fromJson,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw _unwrapDioException(e);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: ApiErrorCode.unknownError,
        message: e.toString(),
      );
    }
  }

  T _handleResponse<T>(
    Response response,
    T Function(dynamic data) fromJson,
  ) {
    final responseData = response.data;
    if (responseData is Map<String, dynamic>) {
      final success = responseData['success'] as bool? ?? true;
      if (!success) {
        final error = responseData['error'] as Map<String, dynamic>? ?? {};
        throw ApiException(
          code: ApiErrorCode.fromString(error['code'] as String?),
          message: error['message'] as String? ?? 'Request failed',
          statusCode: response.statusCode,
          details: error['details'] as Map<String, dynamic>?,
        );
      }
      final data = responseData['data'];
      return fromJson(data);
    }

    // Direct data format fallback
    return fromJson(responseData);
  }

  ApiException _unwrapDioException(DioException e) {
    if (e.error is ApiException) {
      return e.error as ApiException;
    }
    return ApiException.fromDioException(e);
  }
}
