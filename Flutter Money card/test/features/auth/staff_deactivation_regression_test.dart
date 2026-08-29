import 'package:money_card_staff/core/config/app_config.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/repositories/auth_repository.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/auth_service.dart';

class FakeFailingAuthService extends AuthService {
  final ApiException errorToThrow;
  FakeFailingAuthService(this.errorToThrow) : super(ApiService(Dio()));

  @override
  Future<AuthResponseData> login({required String email, required String password}) async {
    throw errorToThrow;
  }

  @override
  Future<AuthUser> getMe() async {
    throw errorToThrow;
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Staff Deactivation & Inactive Org Regression Tests', () {
    test('STAFF_INACTIVE response sets exact friendly banner message', () async {
      final mockStorage = InMemoryTokenStorage();
      final failingService = FakeFailingAuthService(
        const ApiException(
          code: ApiErrorCode.unauthorized,
          message: 'Your staff account is no longer active. Please contact your Organization Administrator.',
          statusCode: 401,
        ),
      );

      final authRepo = AuthRepository(authService: failingService, tokenStorage: mockStorage);
      final notifier = AuthNotifier(authRepo);

      final success = await notifier.login(email: 'staff@maincafe.com', password: 'Staff@123');

      expect(success, false);
      expect(notifier.state.status, AuthStatus.error);
      expect(
        notifier.state.errorMessage,
        'Your staff account is no longer active. Please contact your Organization Administrator.',
      );
    });

    test('ORGANIZATION_INACTIVE response sets exact organization inactive banner', () async {
      final mockStorage = InMemoryTokenStorage();
      final failingService = FakeFailingAuthService(
        const ApiException(
          code: ApiErrorCode.forbidden,
          message: 'Your organization account is currently inactive or suspended. Please contact platform administration.',
          statusCode: 403,
        ),
      );

      final authRepo = AuthRepository(authService: failingService, tokenStorage: mockStorage);
      final notifier = AuthNotifier(authRepo);

      final success = await notifier.login(email: 'staff@maincafe.com', password: 'Staff@123');

      expect(success, false);
      expect(notifier.state.status, AuthStatus.error);
      expect(
        notifier.state.errorMessage,
        'Your organization account is currently inactive or suspended. Please contact platform administration.',
      );
    });
  });
}
