import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/error_interceptor.dart';
import 'interceptors/mock_api_interceptor.dart';

/// Centralized Dio HTTP Client factory.
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
    final effectiveBaseUrl = baseUrl ?? AppConfig.baseUrl;
    final effectiveMock = useMockApi ?? AppConfig.useMockApi;

    final baseOptions = BaseOptions(
      baseUrl: effectiveBaseUrl,
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

    // If mock mode is active, insert MockApiInterceptor before network requests
    if (effectiveMock) {
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
