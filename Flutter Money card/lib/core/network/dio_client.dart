import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'interceptors/mock_api_interceptor.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/error_interceptor.dart';

/// Centralized Dio HTTP Client factory with automatic endpoint failover (USB reverse / Wi-Fi LAN).
class DioClient {
  final Dio dio;

  DioClient._(this.dio);

  void updateBaseUrl(String newUrl) {
    final normalized = AppConfig.normalizeUrl(newUrl);
    dio.options.baseUrl = normalized;
  }

  factory DioClient.create({
    required TokenStorage tokenStorage,
    String? baseUrl,
    bool? useMockApi,
    Future<String?> Function(String refreshToken)? onRefreshToken,
    void Function()? onSessionExpired,
  }) {
    final primaryBaseUrl = baseUrl ?? AppConfig.baseUrl;

    final baseOptions = BaseOptions(
      baseUrl: primaryBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      sendTimeout: AppConfig.sendTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      responseType: ResponseType.json,
    );

    final dio = Dio(baseOptions);

    // 1. Safe Performance Network Logger (Method, Endpoint, Duration, Status only)
    if (kDebugMode) {
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            options.extra['request_start_time'] = DateTime.now().millisecondsSinceEpoch;
            return handler.next(options);
          },
          onResponse: (response, handler) {
            final startTime = response.requestOptions.extra['request_start_time'] as int?;
            final durationMs = startTime != null ? DateTime.now().millisecondsSinceEpoch - startTime : -1;
            debugPrint('[HTTP] ${response.requestOptions.method} ${response.requestOptions.path} | ${durationMs}ms | ${response.statusCode}');
            return handler.next(response);
          },
          onError: (DioException err, handler) {
            final startTime = err.requestOptions.extra['request_start_time'] as int?;
            final durationMs = startTime != null ? DateTime.now().millisecondsSinceEpoch - startTime : -1;
            debugPrint('[HTTP] ${err.requestOptions.method} ${err.requestOptions.path} | ${durationMs}ms | ERR ${err.response?.statusCode ?? err.type}');
            return handler.next(err);
          },
        ),
      );
    }

    // 2. Endpoint sync and dynamic failover interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // Always ensure the active baseUrl from AppConfig is respected
          if (options.baseUrl.isEmpty) {
            options.baseUrl = AppConfig.baseUrl;
          }
          return handler.next(options);
        },
        onError: (DioException err, ErrorInterceptorHandler handler) async {
          if (err.type == DioExceptionType.connectionError ||
              err.type == DioExceptionType.connectionTimeout) {
            final currentUrl = err.requestOptions.baseUrl;
            final isLoopback = currentUrl.contains('127.0.0.1') || currentUrl.contains('localhost');
            final alternateUrl = isLoopback ? AppConfig.defaultLanBaseUrl : AppConfig.defaultBaseUrl;

            // Only retry once if current is not already alternate
            if (err.requestOptions.extra['retried_alternate'] != true && currentUrl != alternateUrl) {
              try {
                final options = Options(
                  method: err.requestOptions.method,
                  headers: err.requestOptions.headers,
                  responseType: err.requestOptions.responseType,
                  contentType: err.requestOptions.contentType,
                  extra: {
                    ...err.requestOptions.extra,
                    'retried_alternate': true,
                  },
                );

                final retryDio = Dio(
                  BaseOptions(
                    baseUrl: alternateUrl,
                    connectTimeout: const Duration(seconds: 3),
                    receiveTimeout: const Duration(seconds: 5),
                  ),
                );

                final response = await retryDio.request(
                  err.requestOptions.path,
                  data: err.requestOptions.data,
                  queryParameters: err.requestOptions.queryParameters,
                  options: options,
                );

                // Alternate endpoint succeeded! Persist it so future calls don't pay failover penalty
                AppConfig.setBaseUrl(alternateUrl);
                dio.options.baseUrl = alternateUrl;
                debugPrint('[HTTP FAILOVER] Successfully switched active baseUrl to: $alternateUrl');

                return handler.resolve(response);
              } catch (_) {
                // Fall through to standard error handler
              }
            }
          }
          return handler.next(err);
        },
      ),
    );

    // Attach MockApiInterceptor if in Mock mode
    if (useMockApi ?? AppConfig.useMockApi) {
      dio.interceptors.add(MockApiInterceptor());
    }

    // Attach AuthInterceptor for Bearer token, token refresh, and session expiry
    dio.interceptors.add(
      AuthInterceptor(
        tokenStorage: tokenStorage,
        dioProvider: () => dio,
        onRefreshToken: onRefreshToken,
        onSessionExpired: onSessionExpired,
      ),
    );

    // Attach ErrorInterceptor for mapping DioException -> ApiException
    dio.interceptors.add(ErrorInterceptor());

    return DioClient._(dio);
  }
}
