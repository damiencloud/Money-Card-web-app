import '../core/constants/api_endpoints.dart';
import '../models/auth_user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  /// Authenticate Staff using email and password (POST /api/v1/auth/login)
  Future<AuthResponseData> login({
    required String email,
    required String password,
  }) async {
    return _apiService.post<AuthResponseData>(
      ApiEndpoints.login,
      data: {
        'email': email,
        'password': password,
      },
      fromJson: (data) => AuthResponseData.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Retrieve current authenticated Staff identity (GET /api/v1/auth/me)
  Future<AuthUser> getMe() async {
    return _apiService.get<AuthUser>(
      ApiEndpoints.me,
      fromJson: (data) {
        if (data is Map<String, dynamic>) {
          // If response is {user: {...}, organization: {...}, ...}
          if (data['user'] is Map<String, dynamic>) {
            final userMap = Map<String, dynamic>.from(data['user'] as Map);
            if (data['permissions'] != null) userMap['permissions'] = data['permissions'];
            if (data['branches'] != null && data['branches'] is List) {
              userMap['assignedBranchIds'] = (data['branches'] as List)
                  .map((b) => (b is Map) ? b['id']?.toString() : b.toString())
                  .whereType<String>()
                  .toList();
            }
            return AuthUser.fromJson(userMap);
          }
          return AuthUser.fromJson(data);
        }
        return AuthUser.fromJson({});
      },
    );
  }

  /// Refresh session using refresh token (POST /api/v1/auth/refresh)
  Future<AuthResponseData> refreshToken(String refreshToken) async {
    return _apiService.post<AuthResponseData>(
      ApiEndpoints.refresh,
      data: {'refreshToken': refreshToken},
      fromJson: (data) => AuthResponseData.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Invalidate and revoke current refresh session (POST /api/v1/auth/logout)
  Future<void> logout() async {
    try {
      await _apiService.post<dynamic>(
        ApiEndpoints.logout,
        fromJson: (data) => data,
      );
    } catch (_) {
      // Ignore network errors during logout
    }
  }

  /// Request password reset (POST /api/v1/auth/forgot-password)
  Future<void> forgotPassword(String email) async {
    await _apiService.post<dynamic>(
      ApiEndpoints.forgotPassword,
      data: {'email': email},
      fromJson: (data) => data,
    );
  }

  /// Set new password using reset token (POST /api/v1/auth/reset-password)
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _apiService.post<dynamic>(
      ApiEndpoints.resetPassword,
      data: {
        'token': token,
        'newPassword': newPassword,
      },
      fromJson: (data) => data,
    );
  }

  /// Change password for authenticated session (POST /api/v1/auth/change-password)
  Future<AuthResponseData> changePassword({
    required String currentPassword,
    required String newPassword,
    String? confirmPassword,
  }) async {
    return _apiService.post<AuthResponseData>(
      ApiEndpoints.changePassword,
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
        if (confirmPassword != null && confirmPassword.isNotEmpty)
          'confirmPassword': confirmPassword,
      },
      fromJson: (data) => AuthResponseData.fromJson(data as Map<String, dynamic>),
    );
  }
}
