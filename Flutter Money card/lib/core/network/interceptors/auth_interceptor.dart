import 'dart:async';
import 'package:dio/dio.dart';
import '../../constants/api_endpoints.dart';
import '../../storage/token_storage.dart';

/// Interceptor that manages Bearer token attachment, 401 interception,
/// synchronized single in-flight token refresh, request retry, and session expiry.
class AuthInterceptor extends Interceptor {
  final TokenStorage tokenStorage;
  final Dio Function()? dioProvider;
  final Future<String?> Function(String refreshToken)? onRefreshToken;
  final void Function()? onSessionExpired;

  Completer<String?>? _refreshCompleter;

  AuthInterceptor({
    required this.tokenStorage,
    this.dioProvider,
    this.onRefreshToken,
    this.onSessionExpired,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final path = err.requestOptions.path;

    // Do not attempt refresh on login, refresh, or logout endpoints
    final isAuthEndpoint = path.endsWith(ApiEndpoints.login) ||
        path.endsWith(ApiEndpoints.refresh) ||
        path.endsWith(ApiEndpoints.logout);

    final isInactiveAccount = response?.statusCode == 401 || response?.statusCode == 403;
    final responseData = response?.data;
    final errorCode = (responseData is Map<String, dynamic>)
        ? (responseData['error'] is Map ? responseData['error']['code'] : null)
        : null;

    final isStaffOrOrgInactive = errorCode == 'STAFF_INACTIVE' || errorCode == 'ORGANIZATION_INACTIVE';

    if (isStaffOrOrgInactive) {
      // Deactivated account or organization -> immediately clear session and force logout
      await tokenStorage.clearTokens();
      onSessionExpired?.call();
      return handler.next(err);
    }

    if (response?.statusCode == 401 && !isAuthEndpoint) {
      final refreshToken = await tokenStorage.getRefreshToken();

      if (refreshToken != null && refreshToken.isNotEmpty) {
        try {
          final newToken = await _synchronizedRefreshToken(refreshToken);

          if (newToken != null && newToken.isNotEmpty) {
            // Update request headers with new access token and retry
            final options = err.requestOptions;
            options.headers['Authorization'] = 'Bearer $newToken';

            if (dioProvider != null) {
              final dio = dioProvider!();
              final retryResponse = await dio.fetch(options);
              return handler.resolve(retryResponse);
            }
          }
        } catch (_) {
          // Refresh failed
        }
      }

      // If refresh failed or no refresh token is present, clear storage and notify session expired
      await tokenStorage.clearTokens();
      onSessionExpired?.call();
    }

    handler.next(err);
  }

  /// Ensures only one refresh request runs concurrently if multiple requests receive 401
  Future<String?> _synchronizedRefreshToken(String refreshToken) async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<String?>();

    try {
      String? newAccessToken;

      if (onRefreshToken != null) {
        newAccessToken = await onRefreshToken!(refreshToken);
      }

      _refreshCompleter!.complete(newAccessToken);
      return newAccessToken;
    } catch (e) {
      _refreshCompleter!.complete(null);
      return null;
    } finally {
      _refreshCompleter = null;
    }
  }
}
