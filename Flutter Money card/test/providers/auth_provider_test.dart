import 'package:money_card_staff/core/config/app_config.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/repositories/auth_repository.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/auth_service.dart';

class FakeAuthServiceSuccess extends AuthService {
  FakeAuthServiceSuccess() : super(ApiService(Dio()));

  @override
  Future<AuthResponseData> login({required String email, required String password}) async {
    return const AuthResponseData(
      accessToken: 'test-jwt-token',
      refreshToken: 'test-refresh-token',
      user: AuthUser(
        id: 'staff-001',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-001',
        permissions: [AppPermission.cardView, AppPermission.recharge],
        assignedBranchIds: ['b-1'],
      ),
    );
  }

  @override
  Future<AuthUser> getMe() async {
    return const AuthUser(
      id: 'staff-001',
      email: 'staff@moneycard.io',
      name: 'Alex Morgan',
      role: 'STAFF',
      organizationId: 'org-001',
      permissions: [AppPermission.cardView, AppPermission.recharge],
      assignedBranchIds: ['b-1'],
    );
  }

  @override
  Future<void> logout() async {}
}

class FakeAuthServiceFailure extends AuthService {
  FakeAuthServiceFailure() : super(ApiService(Dio()));

  @override
  Future<AuthResponseData> login({required String email, required String password}) async {
    throw const ApiException(
      code: ApiErrorCode.unauthorized,
      message: 'Invalid credentials',
      statusCode: 401,
    );
  }

  @override
  Future<AuthUser> getMe() async {
    throw const ApiException(
      code: ApiErrorCode.unauthorized,
      message: 'Session expired',
      statusCode: 401,
    );
  }

  @override
  Future<void> logout() async {}
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('AuthNotifier State Lifecycle Tests', () {
    test('successful login updates state to authenticated', () async {
      final tokenStorage = InMemoryTokenStorage();
      final authRepo = AuthRepository(
        authService: FakeAuthServiceSuccess(),
        tokenStorage: tokenStorage,
      );

      final notifier = AuthNotifier(authRepo);
      await Future<void>.delayed(const Duration(milliseconds: 10));

      final result = await notifier.login(
        email: 'staff@moneycard.io',
        password: 'password',
      );

      expect(result, isTrue);
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.user?.name, 'Alex Morgan');
      expect(notifier.state.isAuthenticated, isTrue);
      expect(await tokenStorage.getAccessToken(), 'test-jwt-token');
    });

    test('failed login sets status to error and stores user-friendly error message', () async {
      final tokenStorage = InMemoryTokenStorage();
      final authRepo = AuthRepository(
        authService: FakeAuthServiceFailure(),
        tokenStorage: tokenStorage,
      );

      final notifier = AuthNotifier(authRepo);
      await Future<void>.delayed(const Duration(milliseconds: 10));

      final result = await notifier.login(
        email: 'wrong@moneycard.io',
        password: 'wrong',
      );

      expect(result, isFalse);
      expect(notifier.state.status, AuthStatus.error);
      expect(notifier.state.errorMessage, 'Email or password is incorrect.');
      expect(notifier.state.isAuthenticated, isFalse);
    });

    test('setSessionExpired transitions state correctly', () async {
      final tokenStorage = InMemoryTokenStorage();
      final authRepo = AuthRepository(
        authService: FakeAuthServiceSuccess(),
        tokenStorage: tokenStorage,
      );

      final notifier = AuthNotifier(authRepo);
      await notifier.login(email: 'a@b.com', password: 'p');

      expect(notifier.state.isAuthenticated, isTrue);

      notifier.setSessionExpired();

      expect(notifier.state.status, AuthStatus.sessionExpired);
      expect(notifier.state.isSessionExpired, isTrue);
      expect(notifier.state.user, isNull);
    });

    test('logout clears user and token storage', () async {
      final tokenStorage = InMemoryTokenStorage();
      final authRepo = AuthRepository(
        authService: FakeAuthServiceSuccess(),
        tokenStorage: tokenStorage,
      );

      final notifier = AuthNotifier(authRepo);
      await notifier.login(email: 'a@b.com', password: 'p');

      expect(await tokenStorage.hasAccessToken(), isTrue);

      await notifier.logout();

      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(notifier.state.user, isNull);
      expect(await tokenStorage.hasAccessToken(), isFalse);
    });
  });
}
