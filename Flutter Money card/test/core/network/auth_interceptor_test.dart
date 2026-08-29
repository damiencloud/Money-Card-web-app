import 'package:money_card_staff/core/config/app_config.dart';
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/network/interceptors/auth_interceptor.dart';
import 'package:money_card_staff/core/storage/token_storage.dart';

class MockTokenStorage implements TokenStorage {
  String? accessToken;
  String? refreshToken;
  bool cleared = false;

  @override
  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<bool> hasAccessToken() async => accessToken != null;

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    refreshToken = null;
    cleared = true;
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('AuthInterceptor Tests', () {
    late MockTokenStorage tokenStorage;
    late Dio dio;

    setUp(() {
      tokenStorage = MockTokenStorage();
      dio = Dio();
    });

    tearDown(() {
      dio.close(force: true);
    });

    test('attaches Bearer token to request when token exists', () async {
      tokenStorage.accessToken = 'test-jwt-token';

      final interceptor = AuthInterceptor(tokenStorage: tokenStorage);
      dio.interceptors.add(interceptor);
      dio.httpClientAdapter = _MockHttpAdapter((options) {
        return ResponseBody.fromString(
          '{"success": true}',
          200,
          headers: {
            'content-type': ['application/json'],
          },
        );
      });

      final response = await dio.get('https://api.moneycard.io/api/v1/cards');
      expect(response.requestOptions.headers['Authorization'], 'Bearer test-jwt-token');
    });

    test('triggers sessionExpired and clears tokens on 401 when refresh fails', () async {
      tokenStorage.accessToken = 'expired-token';
      tokenStorage.refreshToken = 'invalid-refresh-token';

      bool sessionExpiredCalled = false;

      final interceptor = AuthInterceptor(
        tokenStorage: tokenStorage,
        onRefreshToken: (token) async => null, // Refresh fails
        onSessionExpired: () => sessionExpiredCalled = true,
      );
      dio.interceptors.add(interceptor);
      dio.httpClientAdapter = _MockHttpAdapter((options) {
        return ResponseBody.fromString(
          '{"success": false, "error": {"code": "UNAUTHORIZED", "message": "Session expired"}}',
          401,
          headers: {
            'content-type': ['application/json'],
          },
        );
      });

      try {
        await dio.get('https://api.moneycard.io/api/v1/cards');
      } catch (_) {
        // Expected DioException
      }

      expect(tokenStorage.cleared, isTrue);
      expect(sessionExpiredCalled, isTrue);
    });

    test('deduplicates concurrent refresh requests on multiple 401s and retries successfully', () async {
      tokenStorage.accessToken = 'expired-token';
      tokenStorage.refreshToken = 'valid-refresh-token';

      int refreshCallCount = 0;

      final retryDio = Dio();
      final interceptor = AuthInterceptor(
        tokenStorage: tokenStorage,
        dioProvider: () => retryDio,
        onRefreshToken: (token) async {
          refreshCallCount++;
          await Future<void>.delayed(const Duration(milliseconds: 50));
          return 'fresh-jwt-token';
        },
      );
      dio.interceptors.add(interceptor);

      final adapter = _MockHttpAdapter((options) {
        final authHeader = options.headers['Authorization'] as String?;
        if (authHeader == 'Bearer fresh-jwt-token') {
          return ResponseBody.fromString(
            '{"success": true, "data": "retried"}',
            200,
            headers: {'content-type': ['application/json']},
          );
        }
        return ResponseBody.fromString(
          '{"success": false, "error": {"code": "UNAUTHORIZED"}}',
          401,
          headers: {'content-type': ['application/json']},
        );
      });

      dio.httpClientAdapter = adapter;
      retryDio.httpClientAdapter = adapter;

      // Fire 2 concurrent requests
      final responses = await Future.wait([
        dio.get('https://api.moneycard.io/api/v1/cards'),
        dio.get('https://api.moneycard.io/api/v1/branches'),
      ]);

      expect(responses.first.statusCode, 200);
      expect(responses.last.statusCode, 200);
      expect(refreshCallCount, 1);

      retryDio.close(force: true);
    });
  });
}

class _MockHttpAdapter implements HttpClientAdapter {
  final ResponseBody Function(RequestOptions options) handler;

  _MockHttpAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}
