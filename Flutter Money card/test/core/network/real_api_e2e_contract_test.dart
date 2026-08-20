import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/config/app_config.dart';
import 'package:money_card_staff/core/constants/api_endpoints.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/core/network/dio_client.dart';
import 'package:money_card_staff/core/storage/token_storage.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/inventory.dart';
import 'package:money_card_staff/models/product.dart' hide InventoryItem;

class MockTokenStorage implements TokenStorage {
  String? _access = 'real-test-access-token';
  String? _refresh = 'real-test-refresh-token';

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
  group('M18 Real API Mode & M0 V10 Contract E2E Verification', () {
    late MockTokenStorage tokenStorage;

    setUp(() {
      tokenStorage = MockTokenStorage();
    });

    test('ApiMode enum correctly distinguishes mock vs real modes', () {
      expect(ApiMode.mock.isMock, isTrue);
      expect(ApiMode.mock.isReal, isFalse);
      expect(ApiMode.real.isMock, isFalse);
      expect(ApiMode.real.isReal, isTrue);

      expect(ApiMode.fromString('real'), ApiMode.real);
      expect(ApiMode.fromString('REAL'), ApiMode.real);
      expect(ApiMode.fromString('mock'), ApiMode.mock);
      expect(ApiMode.fromString('anything_else'), ApiMode.mock);
    });

    test('DioClient with useMockApi=false excludes MockApiInterceptor and targets real baseUrl', () {
      final client = DioClient.create(
        tokenStorage: tokenStorage,
        baseUrl: 'http://localhost:8080/api/v1',
        useMockApi: false,
      );

      // Check baseUrl
      expect(client.dio.options.baseUrl, 'http://localhost:8080/api/v1');

      // Verify headers
      expect(client.dio.options.headers['Content-Type'], 'application/json');
      expect(client.dio.options.headers['Accept'], 'application/json');

      // Verify MockApiInterceptor is NOT in interceptors list
      final interceptorTypes = client.dio.interceptors.map((i) => i.runtimeType.toString()).toList();
      expect(interceptorTypes, isNot(contains('MockApiInterceptor')));
      expect(interceptorTypes, contains('AuthInterceptor'));
      expect(interceptorTypes, contains('ErrorInterceptor'));
    });

    test('All M0 V10 API Endpoints match exact shared specification', () {
      // Auth Endpoints (M0 V10 Section 7)
      expect(ApiEndpoints.login, '/auth/login');
      expect(ApiEndpoints.refresh, '/auth/refresh');
      expect(ApiEndpoints.logout, '/auth/logout');
      expect(ApiEndpoints.me, '/auth/me');

      // Branches Endpoints
      expect(ApiEndpoints.branches, '/branches');
      expect(ApiEndpoints.branchById('b-1'), '/branches/b-1');

      // Card Endpoints
      expect(ApiEndpoints.cards, '/cards');
      expect(ApiEndpoints.resolveCard, '/cards/resolve');
      expect(ApiEndpoints.cardById('c-1'), '/cards/c-1');
      expect(ApiEndpoints.blockCard('c-1'), '/cards/c-1/block');
      expect(ApiEndpoints.unblockCard('c-1'), '/cards/c-1/unblock');

      // Card Sessions Endpoints
      expect(ApiEndpoints.cardSessions, '/card-sessions');
      expect(ApiEndpoints.cardSessionById('s-1'), '/card-sessions/s-1');
      expect(ApiEndpoints.rechargeCardSession('s-1'), '/card-sessions/s-1/recharge');
      expect(ApiEndpoints.purchaseCardSession('s-1'), '/card-sessions/s-1/purchase');
      expect(ApiEndpoints.returnCardSession('s-1'), '/card-sessions/s-1/return');

      // Products & Inventory Endpoints
      expect(ApiEndpoints.products, '/products');
      expect(ApiEndpoints.inventory, '/inventory');
      expect(ApiEndpoints.inventoryById('i-1'), '/inventory/i-1');

      // Analytics Endpoints
      expect(ApiEndpoints.analytics, '/analytics');
    });

    test('M0 V10 Real Data Envelopes parse correctly into Domain Models', () {
      // Real backend Auth response format
      final authJson = {
        'accessToken': 'real-jwt-access-token',
        'refreshToken': 'real-jwt-refresh-token',
        'user': {
          'id': 'usr-real-001',
          'email': 'staff@canteen.io',
          'name': 'Real Staff Member',
          'role': 'STAFF',
          'organizationId': 'org-real-001',
          'assignedBranchIds': ['br-001'],
          'permissions': ['CARD_VIEW', 'RECHARGE', 'PURCHASE'],
          'createdAt': '2026-08-14T10:00:00Z',
          'updatedAt': '2026-08-14T10:00:00Z',
        }
      };

      final authResponse = AuthResponseData.fromJson(authJson);
      expect(authResponse.accessToken, 'real-jwt-access-token');
      expect(authResponse.user.role, 'STAFF');
      expect(authResponse.user.organizationId, 'org-real-001');

      // Real backend Branch format
      final branchJson = {
        'id': 'br-001',
        'organizationId': 'org-real-001',
        'name': 'Main Cafeteria',
        'status': 'ACTIVE',
        'upiId': 'canteen@icici',
        'upiQrPayload': 'upi://pay?pa=canteen@icici&pn=Main%20Cafeteria&cu=INR',
      };
      final branch = Branch.fromJson(branchJson);
      expect(branch.name, 'Main Cafeteria');
      expect(branch.upiId, 'canteen@icici');

      // Real backend Card format
      final cardJson = {
        'id': 'card-real-001',
        'organizationId': 'org-real-001',
        'qrToken': 'QR-MC-REAL-001',
        'physicalCardNumber': 'MC-REAL-001',
        'status': 'ACTIVE',
        'currentBranchId': 'br-001',
      };
      final card = Card.fromJson(cardJson);
      expect(card.physicalCardNumber, 'MC-REAL-001');
      expect(card.status, CardStatus.active);

      // Real backend Card Session format
      final sessionJson = {
        'id': 'sess-real-001',
        'cardId': 'card-real-001',
        'branchId': 'br-001',
        'status': 'ACTIVE',
        'balance': 450.0,
        'startedAt': '2026-08-14T10:00:00Z',
      };
      final session = CardSession.fromJson(sessionJson);
      expect(session.balance, 450.0);
      expect(session.status, SessionStatus.active);

      // Real backend Product format with multi-select category array
      final productJson = {
        'id': 'prod-real-001',
        'branchId': 'br-001',
        'itemName': 'Thali Special',
        'category': ['Veg', 'Main Course', 'Lunch'],
        'price': 150.0,
        'status': 'ACTIVE',
      };
      final product = Product.fromJson(productJson);
      expect(product.itemName, 'Thali Special');
      expect(product.category, contains('Veg'));
      expect(product.price, 150.0);

      // Real backend Inventory Item format
      final inventoryJson = {
        'id': 'inv-real-001',
        'productId': 'prod-real-001',
        'productName': 'Thali Special',
        'branchId': 'br-001',
        'currentStock': 30,
        'reorderLevel': 5,
        'status': 'IN_STOCK',
        'price': 150.0,
        'updatedAt': '2026-08-14T10:00:00Z',
      };
      final invItem = InventoryItem.fromJson(inventoryJson);
      expect(invItem.currentStock, 30);
      expect(invItem.status, StockStatus.inStock);
    });

    test('Real backend error mapping handles HTTP status codes properly', () {
      final badRequestDio = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 400,
          data: {
            'success': false,
            'error': {'code': 'VALIDATION_ERROR', 'message': 'Invalid input amount'},
          },
        ),
        type: DioExceptionType.badResponse,
      );

      final apiEx = ApiException.fromDioException(badRequestDio);
      expect(apiEx.code, ApiErrorCode.validationError);
      expect(apiEx.statusCode, 400);
      expect(apiEx.message, 'Invalid input amount');

      final forbiddenDio = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 403,
          data: {
            'success': false,
            'error': {'code': 'FORBIDDEN', 'message': 'You do not have access to this branch'},
          },
        ),
        type: DioExceptionType.badResponse,
      );

      final forbiddenEx = ApiException.fromDioException(forbiddenDio);
      expect(forbiddenEx.code, ApiErrorCode.forbidden);
      expect(forbiddenEx.statusCode, 403);
      expect(forbiddenEx.message, 'You do not have access to this branch');
    });
  });
}
