import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/config/app_config.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/network/interceptors/error_interceptor.dart';
import 'package:money_card_staff/core/network/interceptors/mock_api_interceptor.dart';
import 'package:money_card_staff/core/storage/token_storage.dart';
import 'package:money_card_staff/models/card.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/transaction.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/auth_service.dart';
import 'package:money_card_staff/services/card_service.dart';
import 'package:money_card_staff/services/inventory_service.dart';
import 'package:money_card_staff/services/session_service.dart';

class InMemoryTokenStorage implements TokenStorage {
  String? _access;
  String? _refresh;

  @override
  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    _access = accessToken;
    _refresh = refreshToken;
  }

  @override
  Future<String?> getAccessToken() async => _access;

  @override
  Future<String?> getRefreshToken() async => _refresh;

  @override
  Future<void> clearTokens() async {
    _access = null;
    _refresh = null;
  }

  @override
  Future<bool> hasAccessToken() async => _access != null;
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Mock API Engine & M0 V10 Compliance Tests', () {
    late Dio dio;
    late ApiService apiService;
    late AuthService authService;
    late CardService cardService;
    late SessionService sessionService;
    late InventoryService inventoryService;

    setUp(() {
      MockApiInterceptor.resetMockData();

      dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.defaultBaseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );
      dio.interceptors.add(MockApiInterceptor());
      dio.interceptors.add(ErrorInterceptor());

      apiService = ApiService(dio);
      authService = AuthService(apiService);
      cardService = CardService(apiService);
      sessionService = SessionService(apiService);
      inventoryService = InventoryService(apiService);
    });

    test('Staff A login returns full permissions and assigned branches', () async {
      final authResult = await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );
      expect(authResult.user.email, 'staffa@demo.local');
      expect(authResult.user.assignedBranchIds, contains('branch-001'));
      expect(authResult.user.assignedBranchIds, contains('branch-002'));
      expect(authResult.user.permissions.length, greaterThan(10));
    });

    test('Staff B login returns restricted permissions and single branch', () async {
      final authResult = await authService.login(
        email: 'staffb@demo.local',
        password: 'password123',
      );
      expect(authResult.user.email, 'staffb@demo.local');
      expect(authResult.user.assignedBranchIds, ['branch-002']);
      expect(authResult.user.permissions.length, 3);
    });

    test('Mock QR Resolution works for physical card number and QR token', () async {
      // Resolve active card by QR token
      final result1 = await cardService.resolveQr('QR-MOCK-001');
      expect(result1.card.physicalCardNumber, 'MC-001');
      expect(result1.card.status, CardStatus.active);
      expect(result1.session, isNotNull);
      expect(result1.session?.balance, 750.0);

      // Resolve available card
      final resultAvailable = await cardService.resolveQr('QR-MOCK-004');
      expect(resultAvailable.card.physicalCardNumber, 'MC-004');
      expect(resultAvailable.card.status, CardStatus.available);
      expect(resultAvailable.session, isNull);

      // Resolve issued card with active session
      final result2 = await cardService.resolveQr('qr-mock-token-101');
      expect(result2.card.physicalCardNumber, 'MC-101');
      expect(result2.card.status, CardStatus.active);
      expect(result2.session, isNotNull);
      expect(result2.session?.balance, 350.0);

      // Resolve unregistered QR token throws 404 NOT_FOUND
      expect(
        () => cardService.resolveQr('UNREGISTERED-QR-TOKEN'),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Card not registered')),
      );
    });

    test('Mock Issue Card creates active session and transitions AVAILABLE to ACTIVE', () async {
      await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );

      final session = await sessionService.createSession(
        cardId: 'CARD004',
        branchId: 'branch-001',
      );
      expect(session.balance, 0.0);
      expect(session.status, SessionStatus.active);

      final updatedCard = await cardService.getCardById('CARD004');
      expect(updatedCard.status, CardStatus.active);
    });

    test('Mock purchase execution deducts balance and reduces inventory', () async {
      await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );

      // Purchase Veg Rice (prod-001, price 80.0, qty 2 = 160.0) on session-101 (balance 350.0)
      final purchaseResult = await sessionService.purchase(
        sessionId: 'session-101',
        items: [
          {
            'productId': 'prod-001',
            'quantity': 2,
            'unitPrice': 80.0,
          },
        ],
      );

      expect(purchaseResult.amount, 160.0);
      expect(purchaseResult.balance, 190.0);

      // Check session balance updated in memory
      final session = await sessionService.getSessionById('session-101');
      expect(session.balance, 190.0);

      // Check inventory deducted in memory (initial 42 - 2 = 40)
      final inventory = await inventoryService.getInventory(branchId: 'branch-001');
      final vegRice = inventory.firstWhere((i) => i.productId == 'prod-001');
      expect(vegRice.currentStock, 40);
    });

    test('Mock CASH & UPI recharge adds to balance', () async {
      await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );

      final rechargeResult = await sessionService.recharge(
        sessionId: 'session-101',
        amount: 200.0,
        paymentMethod: PaymentMethod.cash,
      );

      expect(rechargeResult.amount, 200.0);
      expect(rechargeResult.balance, 550.0);
    });

    test('Mock Card Return calculates refund and resets card to AVAILABLE', () async {
      await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );

      final returnResult = await sessionService.returnSession('session-101');
      expect(returnResult.refundedAmount, 350.0);
      expect(returnResult.sessionStatus, 'SETTLED');
      expect(returnResult.cardStatus, 'AVAILABLE');

      final card = await cardService.getCardById('card-101');
      expect(card.status, CardStatus.available);
    });

    test('Mock Stock Adjustment updates stock and records movement', () async {
      await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );

      final updated = await inventoryService.adjustStock(
        inventoryId: 'inv-001',
        adjustment: 10,
        reason: 'Restock shipment',
      );

      expect(updated.currentStock, 52);

      final movements = await inventoryService.getInventoryMovements(branchId: 'branch-001');
      expect(movements.first.changeQuantity, 10);
      expect(movements.first.reason, 'Restock shipment');
    });

    test('Mock Permission Enforcement: Staff B cannot adjust stock', () async {
      // Login as Staff B (restricted)
      await authService.login(
        email: 'staffb@demo.local',
        password: 'password123',
      );

      // Attempt to adjust stock -> 403 Forbidden ApiException
      expect(
        inventoryService.adjustStock(
          inventoryId: 'inv-001',
          adjustment: 5,
        ),
        throwsA(isA<ApiException>()),
      );
    });

    test('Mock Error Simulation triggers expected HTTP failure codes', () async {
      MockApiInterceptor.simulatedError = MockErrorSimulation.error500;

      await expectLater(
        authService.login(
          email: 'staffa@demo.local',
          password: 'password123',
        ),
        throwsA(isA<ApiException>()),
      );

      MockApiInterceptor.simulatedError = MockErrorSimulation.networkError;
      await expectLater(
        authService.login(
          email: 'staffa@demo.local',
          password: 'password123',
        ),
        throwsA(isA<ApiException>()),
      );

      // Reset
      MockApiInterceptor.simulatedError = MockErrorSimulation.none;
    });

    test('resetMockData restores all modified state back to initial seed state', () async {
      await authService.login(
        email: 'staffa@demo.local',
        password: 'password123',
      );

      // Mutate session balance
      await sessionService.recharge(
        sessionId: 'session-101',
        amount: 300.0,
        paymentMethod: PaymentMethod.cash,
      );

      var session = await sessionService.getSessionById('session-101');
      expect(session.balance, 650.0);

      // Reset mock data
      MockApiInterceptor.resetMockData();

      session = await sessionService.getSessionById('session-101');
      expect(session.balance, 350.0);
    });
  });
}
