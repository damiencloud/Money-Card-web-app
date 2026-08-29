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

    // Failover interceptor: If 127.0.0.1 (USB) fails, transparently try Wi-Fi IP, and vice versa
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (DioException err, ErrorInterceptorHandler handler) async {
          if (err.type == DioExceptionType.connectionError ||
              err.type == DioExceptionType.connectionTimeout) {
            final currentUrl = err.requestOptions.baseUrl;
            final isPrimary = currentUrl.contains('127.0.0.1') || currentUrl.contains('localhost');
            final alternateUrl = isPrimary ? AppConfig.alternateBaseUrl : AppConfig.defaultBaseUrl;

            // Only retry once to avoid infinite loop
            if (err.requestOptions.extra['retried_alternate'] != true) {
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
                    connectTimeout: const Duration(seconds: 8),
                    receiveTimeout: const Duration(seconds: 8),
                  ),
                );

                final response = await retryDio.request(
                  err.requestOptions.path,
                  data: err.requestOptions.data,
                  queryParameters: err.requestOptions.queryParameters,
                  options: options,
                );

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
