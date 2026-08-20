import '../core/storage/token_storage.dart';
import '../models/auth_user.dart';
import '../services/auth_service.dart';

class AuthRepository {
  final AuthService authService;
  final TokenStorage tokenStorage;

  AuthRepository({
    required this.authService,
    required this.tokenStorage,
  });

  /// Perform login and securely persist tokens
  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final response = await authService.login(email: email, password: password);
    await tokenStorage.saveTokens(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    );

    // Fetch authoritative staff identity from /auth/me
    try {
      final me = await authService.getMe();
      return me;
    } catch (_) {
      return response.user;
    }
  }

  /// Retrieve current authenticated user, attempting refresh if access token expired
  Future<AuthUser?> getCurrentUser() async {
    final hasToken = await tokenStorage.hasAccessToken();
    final refreshToken = await tokenStorage.getRefreshToken();

    if (!hasToken && (refreshToken == null || refreshToken.isEmpty)) {
      return null;
    }

    try {
      return await authService.getMe();
    } catch (_) {
      // Try refresh if token expired
      if (refreshToken != null && refreshToken.isNotEmpty) {
        try {
          final refreshRes = await authService.refreshToken(refreshToken);
          await tokenStorage.saveTokens(
            accessToken: refreshRes.accessToken,
            refreshToken: refreshRes.refreshToken ?? refreshToken,
          );
          return await authService.getMe();
        } catch (_) {
          await tokenStorage.clearTokens();
          return null;
        }
      }
      await tokenStorage.clearTokens();
      return null;
    }
  }

  /// Refresh token operation used by AuthInterceptor
  Future<String?> refreshToken(String refreshToken) async {
    try {
      final response = await authService.refreshToken(refreshToken);
      await tokenStorage.saveTokens(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken ?? refreshToken,
      );
      return response.accessToken;
    } catch (_) {
      await tokenStorage.clearTokens();
      return null;
    }
  }

  /// Invalidate session and clear stored tokens
  Future<void> logout() async {
    try {
      await authService.logout();
    } finally {
      await tokenStorage.clearTokens();
    }
  }

  /// Check if an active session exists
  Future<bool> hasStoredSession() async {
    return tokenStorage.hasAccessToken();
  }
}
