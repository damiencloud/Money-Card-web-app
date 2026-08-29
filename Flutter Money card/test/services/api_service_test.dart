import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/core/network/dio_client.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/auth_service.dart';
import 'package:money_card_staff/services/branch_service.dart';
import 'package:money_card_staff/services/card_service.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('DioClient & Mock API Pipeline Tests', () {
    late InMemoryTokenStorage tokenStorage;
    late DioClient dioClient;
    late ApiService apiService;
    late AuthService authService;
    late BranchService branchService;
    late CardService cardService;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
      dioClient = DioClient.create(
        tokenStorage: tokenStorage,
        useMockApi: true,
      );
      apiService = ApiService(dioClient.dio);
      authService = AuthService(apiService);
      branchService = BranchService(apiService);
      cardService = CardService(apiService);
    });

    test('login returns M0 V10 compliant user with STAFF role and permissions', () async {
      final response = await authService.login(
        email: 'staff@moneycard.io',
        password: 'password123',
      );

      expect(response.accessToken, isNotEmpty);
      expect(response.user.role, 'STAFF');
      expect(response.user.email, 'staff@moneycard.io');
      expect(response.user.permissions, contains(AppPermission.cardView));
      expect(response.user.permissions, contains(AppPermission.recharge));
    });

    test('login with empty credentials throws validation ApiException', () async {
      expect(
        () => authService.login(email: '', password: ''),
        throwsA(isA<ApiException>().having(
          (e) => e.code,
          'code',
          ApiErrorCode.validationError,
        )),
      );
    });

    test('getBranches returns M0 V10 branch list', () async {
      final branches = await branchService.getBranches();
      expect(branches, isNotEmpty);
      expect(branches.first.name, 'Main Cafeteria');
    });

    test('resolveQr returns M0 V10 card and active session', () async {
      final result = await cardService.resolveQr('qr-mock-token-101');
      expect(result.card.physicalCardNumber, 'MC-101');
      expect(result.card.status.value, 'ACTIVE');
      expect(result.session, isNotNull);
      expect(result.session!.balance, 350.0);
    });
  });
}
