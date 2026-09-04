import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'interceptors/mock_api_interceptor.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/error_interceptor.dart';
import 'mdns_discovery_service.dart';

/// Centralized Dio HTTP Client factory with mDNS-driven dynamic LAN discovery and safe diagnostics.
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

    // 1. Safe Diagnostic Logger (Host, Port, Endpoint, Duration, Status only - NEVER credentials/tokens)
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
            final uri = err.requestOptions.uri;
            debugPrint(
              '[Network Diagnostic] Host: ${uri.host} | Port: ${uri.port} | Endpoint: ${uri.path} | '
              'Duration: ${durationMs}ms | Exception: ${err.type} | Status: ${err.response?.statusCode ?? "N/A"}',
            );
            return handler.next(err);
          },
        ),
      );
    }

    // 2. Dynamic mDNS Rediscovery Interceptor on network failure
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
          // Only attempt mDNS dynamic discovery in development mode
          if (AppConfig.isDevelopment &&
              (err.type == DioExceptionType.connectionError ||
                  err.type == DioExceptionType.connectionTimeout)) {
            final currentUrl = err.requestOptions.baseUrl;

            // Only attempt automatic rediscovery once per failed request
            if (err.requestOptions.extra['retried_mdns'] != true) {
              if (kDebugMode) {
                debugPrint('[Network] Connection failed to $currentUrl. Triggering automatic mDNS discovery...');
              }

              try {
                final discoveredUrl = await MdnsDiscoveryService.instance.discoverAndVerifyBackend(
                  timeout: const Duration(seconds: 4),
                  testStoredFirst: false,
                );

                if (discoveredUrl != null && discoveredUrl.isNotEmpty && discoveredUrl != currentUrl) {
                  if (kDebugMode) {
                    debugPrint('[HTTP AUTO-DISCOVERY] Reconnecting request to new backend endpoint: $discoveredUrl');
                  }

                  AppConfig.baseUrl = discoveredUrl;
                  dio.options.baseUrl = discoveredUrl;

                  final retryOptions = Options(
                    method: err.requestOptions.method,
                    headers: err.requestOptions.headers,
                    responseType: err.requestOptions.responseType,
                    contentType: err.requestOptions.contentType,
                    extra: {
                      ...err.requestOptions.extra,
                      'retried_mdns': true,
                    },
                  );

                  final retryDio = Dio(
                    BaseOptions(
                      baseUrl: discoveredUrl,
                      connectTimeout: const Duration(seconds: 4),
                      receiveTimeout: const Duration(seconds: 6),
                    ),
                  );

                  final response = await retryDio.request(
                    err.requestOptions.path,
                    data: err.requestOptions.data,
                    queryParameters: err.requestOptions.queryParameters,
                    options: retryOptions,
                  );

                  return handler.resolve(response);
                }
              } catch (retryErr) {
                if (kDebugMode) {
                  debugPrint('[HTTP AUTO-DISCOVERY] Rediscovery retry failed: $retryErr');
                }
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
