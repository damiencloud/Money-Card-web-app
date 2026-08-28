import 'dart:convert';
import 'package:dio/dio.dart';
import '../../constants/api_endpoints.dart';
import '../../constants/permission_constants.dart';

/// Simulated error states for development testing
enum MockErrorSimulation {
  none,
  error400,
  error401,
  error403,
  error404,
  error409,
  error422,
  error500,
  networkError,
  timeout,
}

/// Stateful Mock API Interceptor providing complete offline emulation of
/// M0 V10 backend endpoints for M13-M17 staff cafeteria operations.
class MockApiInterceptor extends Interceptor {
  /// Dev error simulation flag
  static MockErrorSimulation simulatedError = MockErrorSimulation.none;

  // ==========================================
  // MOCK USERS DATABASE
  // ==========================================
  static final Map<String, Map<String, dynamic>> mockUsersByEmail = {
    'staffa@demo.local': {
      'id': 'staff-user-001',
      'email': 'staffa@demo.local',
      'name': 'Alex Morgan (Staff A - Full)',
      'role': 'STAFF',
      'organizationId': 'org-demo-001',
      'assignedBranchIds': ['branch-001', 'branch-002'],
      'permissions': AppPermission.values.map((p) => p.value).toList(),
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    'staffb@demo.local': {
      'id': 'staff-user-002',
      'email': 'staffb@demo.local',
      'name': 'Robin Taylor (Staff B - Restricted)',
      'role': 'STAFF',
      'organizationId': 'org-demo-001',
      'assignedBranchIds': ['branch-002'],
      'permissions': [
        AppPermission.cardView.value,
        AppPermission.sessionView.value,
        AppPermission.productView.value,
      ],
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    'staffc@other.local': {
      'id': 'staff-user-003',
      'email': 'staffc@other.local',
      'name': 'Jordan Lee (Staff C - Other Org)',
      'role': 'STAFF',
      'organizationId': 'org-other-002',
      'assignedBranchIds': ['branch-003'],
      'permissions': AppPermission.values.map((p) => p.value).toList(),
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    // Default fallback user for backward test compatibility
    'staff@moneycard.io': {
      'id': 'staff-user-001',
      'email': 'staff@moneycard.io',
      'name': 'Alex Morgan',
      'role': 'STAFF',
      'organizationId': 'org-demo-001',
      'assignedBranchIds': ['branch-001', 'branch-002'],
      'permissions': AppPermission.values.map((p) => p.value).toList(),
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
  };

  static Map<String, dynamic> currentActiveUser = mockUsersByEmail['staffa@demo.local']!;

  // ==========================================
  // MOCK ORGANIZATIONS & BRANCHES
  // ==========================================
  static final List<Map<String, dynamic>> initialBranches = [
    {
      'id': 'branch-001',
      'organizationId': 'org-demo-001',
      'name': 'Main Cafeteria',
      'status': 'ACTIVE',
      'upiId': 'canteen.main@icici',
      'upiQrPayload': 'upi://pay?pa=canteen.main@icici&pn=Main%20Cafeteria&cu=INR',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'branch-002',
      'organizationId': 'org-demo-001',
      'name': 'Campus Cafeteria',
      'status': 'ACTIVE',
      'upiId': 'canteen.campus@hdfcbank',
      'upiQrPayload': 'upi://pay?pa=canteen.campus@hdfcbank&pn=Campus%20Cafeteria&cu=INR',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'branch-003',
      'organizationId': 'org-other-002',
      'name': 'Other Cafeteria',
      'status': 'ACTIVE',
      'upiId': 'other.canteen@sbi',
      'upiQrPayload': 'upi://pay?pa=other.canteen@sbi&pn=Other%20Cafeteria&cu=INR',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
  ];

  // ==========================================
  // MOCK CARDS DATABASE
  // ==========================================
  static final List<Map<String, dynamic>> initialCards = [
    {
      'id': 'CARD001',
      'organizationId': 'org-demo-001',
      'qrToken': 'QR-MOCK-001',
      'physicalCardNumber': 'MC-001',
      'status': 'ACTIVE',
      'currentBranchId': 'branch-001',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'CARD002',
      'organizationId': 'org-demo-001',
      'qrToken': 'QR-MOCK-002',
      'physicalCardNumber': 'MC-002',
      'status': 'ACTIVE',
      'currentBranchId': 'branch-001',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'CARD003',
      'organizationId': 'org-demo-001',
      'qrToken': 'QR-MOCK-003',
      'physicalCardNumber': 'MC-003',
      'status': 'BLOCKED',
      'currentBranchId': 'branch-001',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'CARD004',
      'organizationId': 'org-demo-001',
      'qrToken': 'QR-MOCK-004',
      'physicalCardNumber': 'MC-004',
      'status': 'AVAILABLE',
      'currentBranchId': 'branch-001',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'CARD005',
      'organizationId': 'org-demo-001',
      'qrToken': 'QR-MOCK-005',
      'physicalCardNumber': 'MC-005',
      'status': 'AVAILABLE',
      'currentBranchId': 'branch-001',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'card-101',
      'organizationId': 'org-demo-001',
      'qrToken': 'qr-mock-token-101',
      'physicalCardNumber': 'MC-101',
      'status': 'ACTIVE',
      'currentBranchId': 'branch-001',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'card-other-999',
      'organizationId': 'org-other-002',
      'qrToken': 'QR-OTHER-999',
      'physicalCardNumber': 'MC-OTHER-999',
      'status': 'AVAILABLE',
      'currentBranchId': 'branch-003',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
  ];

  // ==========================================
  // MOCK SESSIONS DATABASE
  // ==========================================
  static final List<Map<String, dynamic>> initialSessions = [
    {
      'id': 'session-001',
      'cardId': 'CARD001',
      'branchId': 'branch-001',
      'status': 'ACTIVE',
      'balance': 750.0,
      'startedAt': '2026-08-14T08:00:00Z',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'session-002',
      'cardId': 'CARD002',
      'branchId': 'branch-001',
      'status': 'ACTIVE',
      'balance': 350.0,
      'startedAt': '2026-08-14T08:00:00Z',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'session-101',
      'cardId': 'card-101',
      'branchId': 'branch-001',
      'status': 'ACTIVE',
      'balance': 350.0,
      'startedAt': '2026-08-14T08:00:00Z',
      'createdAt': '2026-08-14T08:00:00Z',
      'updatedAt': '2026-08-14T08:00:00Z',
    },
  ];

  // ==========================================
  // MOCK PRODUCTS DATABASE (Multi-select category, no tags)
  // ==========================================
  static final List<Map<String, dynamic>> initialProducts = [
    {
      'id': 'prod-001',
      'branchId': 'branch-001',
      'itemName': 'Veg Burger',
      'category': ['Veg', 'Burger', 'Fast Food', 'Snacks'],
      'price': 120.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-002',
      'branchId': 'branch-001',
      'itemName': 'Chicken Burger',
      'category': ['Non-Veg', 'Burger', 'Fast Food', 'Snacks'],
      'price': 150.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-003',
      'branchId': 'branch-001',
      'itemName': 'Cheese Burger',
      'category': ['Veg', 'Burger', 'Fast Food', 'Snacks'],
      'price': 140.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-004',
      'branchId': 'branch-001',
      'itemName': 'Chicken Rice',
      'category': ['Non-Veg', 'Rice', 'Lunch', 'Dinner', 'Main Course'],
      'price': 140.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-005',
      'branchId': 'branch-001',
      'itemName': 'Veg Fried Rice',
      'category': ['Veg', 'Rice', 'Lunch', 'Dinner', 'Main Course'],
      'price': 110.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-006',
      'branchId': 'branch-001',
      'itemName': 'Fresh Juice',
      'category': ['Vegan', 'Beverages', 'Drinks', 'Juice'],
      'price': 50.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-007',
      'branchId': 'branch-001',
      'itemName': 'Tea',
      'category': ['Veg', 'Beverages', 'Hot Drinks', 'Breakfast'],
      'price': 20.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-008',
      'branchId': 'branch-001',
      'itemName': 'Coffee',
      'category': ['Veg', 'Beverages', 'Hot Drinks', 'Breakfast'],
      'price': 30.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-009',
      'branchId': 'branch-001',
      'itemName': 'French Fries',
      'category': ['Veg', 'Vegan', 'Snacks', 'Fast Food'],
      'price': 80.0,
      'status': 'ACTIVE',
    },
    {
      'id': 'prod-010',
      'branchId': 'branch-001',
      'itemName': 'Sandwich',
      'category': ['Veg', 'Breakfast', 'Snacks', 'Fast Food'],
      'price': 70.0,
      'status': 'ACTIVE',
    },
  ];

  // ==========================================
  // MOCK INVENTORY DATABASE
  // ==========================================
  static final List<Map<String, dynamic>> initialInventory = [
    {
      'id': 'inv-001',
      'productId': 'prod-001',
      'productName': 'Veg Rice',
      'branchId': 'branch-001',
      'currentStock': 42,
      'reorderLevel': 10,
      'status': 'IN_STOCK',
      'category': ['Veg', 'Main Course', 'Rice'],
      'price': 80.0,
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'inv-002',
      'productId': 'prod-002',
      'productName': 'Chicken Curry',
      'branchId': 'branch-001',
      'currentStock': 8,
      'reorderLevel': 10,
      'status': 'LOW_STOCK',
      'category': ['Non-Veg', 'Main Course', 'Curry'],
      'price': 120.0,
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'inv-003',
      'productId': 'prod-003',
      'productName': 'Juice',
      'branchId': 'branch-001',
      'currentStock': 0,
      'reorderLevel': 10,
      'status': 'OUT_OF_STOCK',
      'category': ['Beverage', 'Sweet'],
      'price': 40.0,
      'updatedAt': '2026-08-14T08:00:00Z',
    },
    {
      'id': 'inv-004',
      'productId': 'prod-004',
      'productName': 'Sandwich',
      'branchId': 'branch-001',
      'currentStock': 25,
      'reorderLevel': 10,
      'status': 'IN_STOCK',
      'category': ['Veg', 'Fast Food', 'Snack'],
      'price': 70.0,
      'updatedAt': '2026-08-14T08:00:00Z',
    },
  ];

  static final List<Map<String, dynamic>> initialMovements = [
    {
      'id': 'mov-001',
      'inventoryId': 'inv-001',
      'productId': 'prod-001',
      'productName': 'Veg Rice',
      'branchId': 'branch-001',
      'changeQuantity': 20,
      'balanceAfter': 42,
      'type': 'RESTOCK',
      'reason': 'Weekly supplier delivery',
      'createdAt': '2026-08-14T08:00:00Z',
      'staffName': 'Alex Morgan',
    },
    {
      'id': 'mov-002',
      'inventoryId': 'inv-002',
      'productId': 'prod-002',
      'productName': 'Chicken Curry',
      'branchId': 'branch-001',
      'changeQuantity': -12,
      'balanceAfter': 8,
      'type': 'PURCHASE',
      'reason': 'POS sales',
      'createdAt': '2026-08-14T10:30:00Z',
      'staffName': 'Alex Morgan',
    },
  ];

  // In-memory runtime state
  static List<Map<String, dynamic>> mockBranches = List.from(initialBranches);
  static List<Map<String, dynamic>> mockCards = List.from(initialCards);
  static List<Map<String, dynamic>> mockSessions = List.from(initialSessions);
  static List<Map<String, dynamic>> mockProducts = List.from(initialProducts);
  static List<Map<String, dynamic>> mockInventory = List.from(initialInventory);
  static List<Map<String, dynamic>> mockMovements = List.from(initialMovements);
  static List<Map<String, dynamic>> mockTransactions = [];

  /// Reset all in-memory mock data to seed state for development testing
  static void resetMockData() {
    mockBranches = List.from(initialBranches);
    mockCards = List.from(initialCards.map((c) => Map<String, dynamic>.from(c)));
    mockSessions = List.from(initialSessions.map((s) => Map<String, dynamic>.from(s)));
    mockProducts = List.from(initialProducts.map((p) => Map<String, dynamic>.from(p)));
    mockInventory = List.from(initialInventory.map((i) => Map<String, dynamic>.from(i)));
    mockMovements = List.from(initialMovements.map((m) => Map<String, dynamic>.from(m)));
    mockTransactions = [];
    simulatedError = MockErrorSimulation.none;
    currentActiveUser = mockUsersByEmail['staffa@demo.local']!;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final path = options.path;
    final method = options.method.toUpperCase();

    // ==========================================
    // 0. SIMULATED ERROR HANDLER (DEV-ONLY)
    // ==========================================
    if (simulatedError != MockErrorSimulation.none) {
      final sim = simulatedError;
      switch (sim) {
        case MockErrorSimulation.networkError:
          return handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
              error: 'Simulated network connection failure',
            ),
          );
        case MockErrorSimulation.timeout:
          return handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionTimeout,
              error: 'Simulated connection timeout',
            ),
          );
        case MockErrorSimulation.error400:
          return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Simulated 400 Bad Request');
        case MockErrorSimulation.error401:
          return _reject(handler, options, 401, 'UNAUTHORIZED', 'Simulated 401 Unauthorized');
        case MockErrorSimulation.error403:
          return _reject(handler, options, 403, 'FORBIDDEN', 'Simulated 403 Forbidden');
        case MockErrorSimulation.error404:
          return _reject(handler, options, 404, 'NOT_FOUND', 'Simulated 404 Not Found');
        case MockErrorSimulation.error409:
          return _reject(handler, options, 409, 'CONFLICT', 'Simulated 409 Conflict');
        case MockErrorSimulation.error422:
          return _reject(handler, options, 422, 'UNPROCESSABLE_ENTITY', 'Simulated 422 Business Error');
        case MockErrorSimulation.error500:
          return _reject(handler, options, 500, 'INTERNAL_SERVER_ERROR', 'Simulated 500 Server Error');
        case MockErrorSimulation.none:
          break;
      }
    }

    // ==========================================
    // 1. AUTH ENDPOINTS
    // ==========================================
    if (path.endsWith(ApiEndpoints.login) && method == 'POST') {
      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final email = (data?['email'] as String?)?.toLowerCase().trim();
      final password = data?['password'] as String?;

      if (email == null || password == null || email.isEmpty || password.isEmpty) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Email and password are required');
      }

      // Check against mock users database
      final user = mockUsersByEmail[email] ?? {
        'id': 'staff-custom-001',
        'email': email,
        'name': email.split('@').first.toUpperCase(),
        'role': 'STAFF',
        'organizationId': 'org-demo-001',
        'assignedBranchIds': ['branch-001', 'branch-002'],
        'permissions': AppPermission.values.map((p) => p.value).toList(),
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };

      currentActiveUser = user;

      return _resolve(handler, options, {
        'accessToken': 'mock-access-token-${DateTime.now().millisecondsSinceEpoch}',
        'refreshToken': 'mock-refresh-token-${DateTime.now().millisecondsSinceEpoch}',
        'user': user,
      });
    }

    if (path.endsWith(ApiEndpoints.refresh) && method == 'POST') {
      return _resolve(handler, options, {
        'accessToken': 'mock-refreshed-token-${DateTime.now().millisecondsSinceEpoch}',
        'refreshToken': 'mock-refreshed-refresh-token-${DateTime.now().millisecondsSinceEpoch}',
      });
    }

    if (path.endsWith(ApiEndpoints.logout) && method == 'POST') {
      return _resolve(handler, options, {'message': 'Logged out successfully'});
    }

    if (path.endsWith(ApiEndpoints.me) && method == 'GET') {
      return _resolve(handler, options, currentActiveUser);
    }

    // ==========================================
    // 2. BRANCH ENDPOINTS
    // ==========================================
    if ((path.endsWith('/branches') || path.endsWith(ApiEndpoints.branches)) && method == 'GET') {
      // Return branches assigned to current active user
      final assigned = (currentActiveUser['assignedBranchIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          ['branch-001'];

      final result = mockBranches
          .where((b) => assigned.contains(b['id']))
          .toList();

      return _resolve(handler, options, result);
    }

    // ==========================================
    // 3. CARD ENDPOINTS
    // ==========================================
    // Resolve QR: POST /cards/resolve or /cards/resolve-qr
    if ((path.endsWith('/cards/resolve') || path.endsWith('/cards/resolve-qr')) && method == 'POST') {
      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final qrToken = data?['qrToken'] as String?;

      if (qrToken == null || qrToken.isEmpty) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'QR token is required');
      }

      // Match strictly by qrToken or physicalCardNumber or id
      final card = mockCards.firstWhere(
        (c) =>
            c['qrToken'] == qrToken ||
            c['physicalCardNumber'] == qrToken ||
            c['id'] == qrToken ||
            'QR-${c['physicalCardNumber']}' == qrToken,
        orElse: () => <String, dynamic>{},
      );

      if (card.isEmpty) {
        return _reject(handler, options, 404, 'NOT_FOUND', 'Card not registered');
      }

      // Enforce organization isolation
      final userOrg = currentActiveUser['organizationId'];
      if (userOrg != null && card['organizationId'] != userOrg) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Access denied: Card belongs to another organization');
      }

      final session = mockSessions.firstWhere(
        (s) =>
            (s['cardId'] == card['id'] || s['cardId'] == card['physicalCardNumber']) &&
            s['status'] == 'ACTIVE',
        orElse: () => <String, dynamic>{},
      );

      return _resolve(handler, options, {
        'card': card,
        if (session.isNotEmpty) 'session': session,
      });
    }

    // Issue/Create Card: POST /cards or /cards/issue
    if ((path.endsWith('/cards') || path.endsWith('/cards/issue')) && method == 'POST') {
      if (!_hasPermission(AppPermission.cardIssue)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot issue card');
      }

      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final physicalCardNumber = data?['physicalCardNumber'] as String?;
      final branchId = data?['branchId'] as String? ?? 'branch-001';
      final initialBalance = (data?['initialBalance'] as num?)?.toDouble() ?? 0.0;

      if (physicalCardNumber == null || physicalCardNumber.isEmpty) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Physical card number is required');
      }

      // Check if card exists
      var card = mockCards.firstWhere(
        (c) => c['physicalCardNumber'] == physicalCardNumber,
        orElse: () => <String, dynamic>{},
      );

      if (card.isEmpty) {
        card = {
          'id': 'CARD-${DateTime.now().millisecondsSinceEpoch}',
          'organizationId': currentActiveUser['organizationId'] ?? 'org-demo-001',
          'qrToken': 'QR-$physicalCardNumber',
          'physicalCardNumber': physicalCardNumber,
          'status': 'ACTIVE',
          'currentBranchId': branchId,
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };
        mockCards.add(card);
      } else {
        card['status'] = 'ACTIVE';
        card['currentBranchId'] = branchId;
        card['updatedAt'] = DateTime.now().toIso8601String();
      }

      // Create new active session if initial balance provided
      if (initialBalance > 0) {
        final session = {
          'id': 'session-${DateTime.now().millisecondsSinceEpoch}',
          'cardId': card['id'],
          'branchId': branchId,
          'status': 'ACTIVE',
          'balance': initialBalance,
          'startedAt': DateTime.now().toIso8601String(),
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };
        mockSessions.insert(0, session);
      }

      return _resolve(handler, options, card);
    }

    // Block Card: POST /cards/:id/block
    final blockRegex = RegExp(r'/cards/([a-zA-Z0-9_-]+)/block$');
    final blockMatch = blockRegex.firstMatch(path);
    if (blockMatch != null && method == 'POST') {
      if (!_hasPermission(AppPermission.cardBlock)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot block card');
      }

      final cardId = blockMatch.group(1);
      final card = mockCards.firstWhere(
        (c) => c['id'] == cardId || c['physicalCardNumber'] == cardId,
        orElse: () => <String, dynamic>{},
      );

      if (card.isEmpty) {
        return _reject(handler, options, 404, 'NOT_FOUND', 'Card not found');
      }

      card['status'] = 'BLOCKED';
      card['updatedAt'] = DateTime.now().toIso8601String();

      return _resolve(handler, options, card);
    }

    // Unblock Card: POST /cards/:id/unblock
    final unblockRegex = RegExp(r'/cards/([a-zA-Z0-9_-]+)/unblock$');
    final unblockMatch = unblockRegex.firstMatch(path);
    if (unblockMatch != null && method == 'POST') {
      if (!_hasPermission(AppPermission.cardUnblock)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot unblock card');
      }

      final cardId = unblockMatch.group(1);
      final card = mockCards.firstWhere(
        (c) => c['id'] == cardId || c['physicalCardNumber'] == cardId,
        orElse: () => <String, dynamic>{},
      );

      if (card.isEmpty) {
        return _reject(handler, options, 404, 'NOT_FOUND', 'Card not found');
      }

      card['status'] = 'AVAILABLE';
      card['updatedAt'] = DateTime.now().toIso8601String();

      return _resolve(handler, options, card);
    }

    // Card Details: GET /cards/:id
    final cardDetailRegex = RegExp(r'/cards/([a-zA-Z0-9_-]+)$');
    final cardDetailMatch = cardDetailRegex.firstMatch(path);
    if (cardDetailMatch != null && method == 'GET' && !path.endsWith('/cards')) {
      final cardId = cardDetailMatch.group(1);
      final card = mockCards.firstWhere(
        (c) => c['id'] == cardId || c['physicalCardNumber'] == cardId,
        orElse: () => <String, dynamic>{},
      );

      if (card.isEmpty) {
        return _reject(handler, options, 404, 'NOT_FOUND', 'Card not found');
      }

      return _resolve(handler, options, card);
    }

    // Cards list: GET /cards
    if ((path.endsWith('/cards') || path.endsWith(ApiEndpoints.cards)) && method == 'GET') {
      final branchId = options.queryParameters['branchId'];
      final status = options.queryParameters['status'];
      final search = options.queryParameters['search']?.toString().toLowerCase().trim();

      final userOrg = currentActiveUser['organizationId'];
      var result = mockCards
          .where((c) => userOrg == null || c['organizationId'] == userOrg)
          .toList();

      if (branchId != null && branchId.toString().isNotEmpty) {
        result = result
            .where((c) => c['currentBranchId'] == branchId || c['currentBranchId'] == null)
            .toList();
      }
      if (status != null && status.toString().isNotEmpty) {
        result = result
            .where((c) => c['status'] == status.toString().toUpperCase())
            .toList();
      }
      if (search != null && search.isNotEmpty) {
        result = result.where((c) {
          final pcn = (c['physicalCardNumber'] as String? ?? '').toLowerCase();
          final id = (c['id'] as String? ?? '').toLowerCase();
          return pcn.contains(search) || id.contains(search);
        }).toList();
      }

      return _resolve(handler, options, result);
    }

    // ==========================================
    // 4. SESSION ENDPOINTS
    // ==========================================
    // Purchase: POST /card-sessions/:id/purchase
    final purchaseRegex = RegExp(r'/card-sessions/([a-zA-Z0-9_-]+)/purchase$');
    final purchaseMatch = purchaseRegex.firstMatch(path);
    if (purchaseMatch != null && method == 'POST') {
      if (!_hasPermission(AppPermission.purchase)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot perform purchase');
      }

      final sessionId = purchaseMatch.group(1);
      final session = mockSessions.firstWhere(
        (s) => s['id'] == sessionId,
        orElse: () => mockSessions.first,
      );

      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final items = (data?['items'] as List<dynamic>?) ?? [];

      double total = 0.0;
      for (final item in items) {
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        final price = (item['unitPrice'] as num?)?.toDouble() ?? 0.0;
        total += qty * price;
      }

      final currentBalance = (session['balance'] as num).toDouble();
      if (currentBalance < total) {
        return _reject(
          handler,
          options,
          400,
          'INSUFFICIENT_BALANCE',
          'Insufficient balance (Available: ₹${currentBalance.toStringAsFixed(2)}, Required: ₹${total.toStringAsFixed(2)})',
        );
      }

      final updatedBalance = currentBalance - total;
      session['balance'] = updatedBalance;
      session['updatedAt'] = DateTime.now().toIso8601String();

      // Deduct inventory items
      for (final item in items) {
        final prodId = item['productId'] as String?;
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        final inv = mockInventory.firstWhere(
          (i) => i['productId'] == prodId,
          orElse: () => <String, dynamic>{},
        );
        if (inv.isNotEmpty) {
          final cur = (inv['currentStock'] as num).toInt();
          final next = (cur - qty).clamp(0, 99999);
          inv['currentStock'] = next;
          if (next <= 0) {
            inv['status'] = 'OUT_OF_STOCK';
          } else if (next <= (inv['reorderLevel'] as num).toInt()) {
            inv['status'] = 'LOW_STOCK';
          }
        }
      }

      final detailedItems = <Map<String, dynamic>>[];
      for (final it in items) {
        final pid = it['productId'] as String? ?? '';
        final qty = (it['quantity'] as num?)?.toInt() ?? 1;
        final p = mockProducts.firstWhere(
          (prod) => prod['id'] == pid,
          orElse: () => <String, dynamic>{},
        );
        final unitPrice = (p['price'] as num?)?.toDouble() ?? 0.0;
        detailedItems.add({
          'productId': pid,
          'itemName': p['name'] ?? p['itemName'] ?? 'Cafeteria Item',
          'quantity': qty,
          'unitPrice': unitPrice,
          'totalAmount': unitPrice * qty,
        });
      }

      final tx = {
        'id': 'tx-${DateTime.now().millisecondsSinceEpoch}',
        'sessionId': sessionId,
        'type': 'PURCHASE',
        'amount': total,
        'balanceAfter': updatedBalance,
        'items': detailedItems,
        'status': 'SUCCESS',
        'createdAt': DateTime.now().toIso8601String(),
      };
      mockTransactions.insert(0, tx);

      return _resolve(handler, options, {
        'transactionId': tx['id'],
        'amount': total,
        'totalAmount': total,
        'balance': updatedBalance,
        'status': 'SUCCESS',
      });
    }

    // Recharge: POST /card-sessions/:id/recharge
    final rechargeRegex = RegExp(r'/card-sessions/([a-zA-Z0-9_-]+)/recharge$');
    final rechargeMatch = rechargeRegex.firstMatch(path);
    if (rechargeMatch != null && method == 'POST') {
      if (!_hasPermission(AppPermission.recharge)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot recharge session');
      }

      final sessionId = rechargeMatch.group(1);
      final session = mockSessions.firstWhere(
        (s) => s['id'] == sessionId,
        orElse: () => mockSessions.first,
      );

      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final amount = (data?['amount'] as num?)?.toDouble() ?? 0.0;
      final methodStr = data?['paymentMethod'] as String? ?? 'CASH';

      if (amount <= 0) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Recharge amount must be greater than 0');
      }

      final currentBalance = (session['balance'] as num).toDouble();
      final updatedBalance = currentBalance + amount;
      session['balance'] = updatedBalance;
      session['updatedAt'] = DateTime.now().toIso8601String();

      final tx = {
        'id': 'tx-rec-${DateTime.now().millisecondsSinceEpoch}',
        'sessionId': sessionId,
        'type': 'RECHARGE',
        'paymentMethod': methodStr,
        'amount': amount,
        'balanceAfter': updatedBalance,
        'status': 'SUCCESS',
        'createdAt': DateTime.now().toIso8601String(),
      };
      mockTransactions.insert(0, tx);

      return _resolve(handler, options, {
        'transactionId': tx['id'],
        'amount': amount,
        'balance': updatedBalance,
        'paymentMethod': methodStr,
        'status': 'SUCCESS',
      });
    }

    // Return & Settle: POST /card-sessions/:id/return
    final returnRegex = RegExp(r'/card-sessions/([a-zA-Z0-9_-]+)/return$');
    final returnMatch = returnRegex.firstMatch(path);
    if (returnMatch != null && method == 'POST') {
      if (!_hasPermission(AppPermission.cardReturn)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot return card session');
      }

      final sessionId = returnMatch.group(1);
      final session = mockSessions.firstWhere(
        (s) => s['id'] == sessionId,
        orElse: () => mockSessions.first,
      );

      final refundAmount = (session['balance'] as num).toDouble();
      session['balance'] = 0.0;
      session['status'] = 'SETTLED';
      session['endedAt'] = DateTime.now().toIso8601String();
      session['updatedAt'] = DateTime.now().toIso8601String();

      // Reset card to AVAILABLE
      final card = mockCards.firstWhere(
        (c) => c['id'] == session['cardId'],
        orElse: () => <String, dynamic>{},
      );
      if (card.isNotEmpty) {
        card['status'] = 'AVAILABLE';
      }

      return _resolve(handler, options, {
        'sessionId': sessionId,
        'refundedAmount': refundAmount,
        'sessionStatus': 'SETTLED',
        'cardStatus': 'AVAILABLE',
      });
    }

    // Session Details: GET /card-sessions/:id
    final sessionDetailRegex = RegExp(r'/card-sessions/([a-zA-Z0-9_-]+)$');
    final sessionDetailMatch = sessionDetailRegex.firstMatch(path);
    if (sessionDetailMatch != null && method == 'GET') {
      final sessionId = sessionDetailMatch.group(1);
      final session = mockSessions.firstWhere(
        (s) => s['id'] == sessionId,
        orElse: () => <String, dynamic>{},
      );

      if (session.isEmpty) {
        return _reject(handler, options, 404, 'NOT_FOUND', 'Session not found');
      }

      // Check card org isolation
      final card = mockCards.firstWhere(
        (c) => c['id'] == session['cardId'],
        orElse: () => <String, dynamic>{},
      );
      final userOrg = currentActiveUser['organizationId'];
      if (userOrg != null && card.isNotEmpty && card['organizationId'] != userOrg) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Access denied: Session belongs to another organization');
      }

      // Check branch assignment isolation
      final assignedBranches = List<String>.from(currentActiveUser['assignedBranchIds'] ?? []);
      if (assignedBranches.isNotEmpty && !assignedBranches.contains(session['branchId'])) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Access denied: Session belongs to unauthorized branch');
      }

      final enriched = Map<String, dynamic>.from(session);
      if (card.isNotEmpty && card['physicalCardNumber'] != null) {
        enriched['physicalCardNumber'] = card['physicalCardNumber'];
      }
      enriched['transactions'] = mockTransactions.where((t) => t['sessionId'] == sessionId).toList();

      return _resolve(handler, options, enriched);
    }

    // Sessions List: GET /card-sessions
    if ((path.endsWith('/card-sessions') || path.endsWith(ApiEndpoints.cardSessions)) && method == 'GET') {
      final branchId = options.queryParameters['branchId'];
      final status = options.queryParameters['status'];

      final userOrg = currentActiveUser['organizationId'];
      final assignedBranches = List<String>.from(currentActiveUser['assignedBranchIds'] ?? []);

      // If specific branch queried, verify authorization
      if (branchId != null && assignedBranches.isNotEmpty && !assignedBranches.contains(branchId)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Access denied: Unauthorized branch');
      }

      var result = mockSessions.where((s) {
        final card = mockCards.firstWhere(
          (c) => c['id'] == s['cardId'],
          orElse: () => <String, dynamic>{},
        );

        // Filter by organization
        if (userOrg != null && card.isNotEmpty && card['organizationId'] != userOrg) {
          return false;
        }

        // Filter by assigned branch
        if (assignedBranches.isNotEmpty && !assignedBranches.contains(s['branchId'])) {
          return false;
        }

        // Filter by query branchId
        if (branchId != null && s['branchId'] != branchId) {
          return false;
        }

        // Filter by status (default ACTIVE when queried or passed)
        if (status != null && status.toString().isNotEmpty && status.toString().toUpperCase() != 'ALL') {
          if (s['status'] != status.toString().toUpperCase()) {
            return false;
          }
        }

        return true;
      }).map((s) {
        final enriched = Map<String, dynamic>.from(s);
        final card = mockCards.firstWhere(
          (c) => c['id'] == s['cardId'],
          orElse: () => <String, dynamic>{},
        );
        if (card.isNotEmpty && card['physicalCardNumber'] != null) {
          enriched['physicalCardNumber'] = card['physicalCardNumber'];
        }
        return enriched;
      }).toList();

      return _resolve(handler, options, result);
    }

    // Create Session: POST /card-sessions
    if ((path.endsWith('/card-sessions') || path.endsWith(ApiEndpoints.cardSessions)) && method == 'POST') {
      if (!_hasPermission(AppPermission.cardIssue)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot issue card');
      }

      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final cardId = data?['cardId'] as String?;
      final branchId = data?['branchId'] as String? ?? 'branch-001';
      final initialBalance = (data?['initialBalance'] as num?)?.toDouble() ?? 0.0;

      if (cardId == null || cardId.isEmpty) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Card ID is required');
      }

      final card = mockCards.firstWhere(
        (c) => c['id'] == cardId || c['physicalCardNumber'] == cardId,
        orElse: () => <String, dynamic>{},
      );

      if (card.isEmpty) {
        return _reject(handler, options, 404, 'NOT_FOUND', 'Card not registered');
      }

      // Enforce organization isolation
      final userOrg = currentActiveUser['organizationId'];
      if (userOrg != null && card['organizationId'] != userOrg) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Access denied: Card belongs to another organization');
      }

      // Enforce AVAILABLE state
      if (card['status'] != 'AVAILABLE') {
        return _reject(
          handler,
          options,
          400,
          'INVALID_CARD_STATE',
          'Card is not available for issue (current status: ${card['status']})',
        );
      }

      // Transition card to ACTIVE and assign branch
      card['status'] = 'ACTIVE';
      card['currentBranchId'] = branchId;
      card['updatedAt'] = DateTime.now().toIso8601String();

      final session = {
        'id': 'session-${DateTime.now().millisecondsSinceEpoch}',
        'cardId': card['id'],
        'branchId': branchId,
        'status': 'ACTIVE',
        'balance': initialBalance,
        'startedAt': DateTime.now().toIso8601String(),
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };
      mockSessions.insert(0, session);

      return _resolve(handler, options, session);
    }

    // ==========================================
    // 5. PRODUCT ENDPOINTS
    // ==========================================
    if ((path.endsWith('/products') || path.endsWith(ApiEndpoints.products)) && method == 'GET') {
      final branchId = options.queryParameters['branchId'];
      final category = options.queryParameters['category']?.toString().toLowerCase();

      var result = List<Map<String, dynamic>>.from(mockProducts);
      if (branchId != null) {
        result = result.where((p) => p['branchId'] == branchId).toList();
      }
      if (category != null && category.isNotEmpty && category != 'all') {
        result = result.where((p) {
          final cats = (p['category'] as List<dynamic>).map((c) => c.toString().toLowerCase());
          return cats.contains(category);
        }).toList();
      }

      return _resolve(handler, options, result);
    }

    // Create Product: POST /products
    if ((path.endsWith('/products') || path.endsWith(ApiEndpoints.products)) && method == 'POST') {
      if (!_hasPermission(AppPermission.productManage) && !_hasPermission(AppPermission.inventoryManage)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot create products');
      }

      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final itemName = (data?['itemName'] as String?)?.trim();
      final branchId = data?['branchId'] as String? ?? 'branch-001';
      final price = (data?['price'] as num?)?.toDouble();
      final status = data?['status'] as String? ?? 'ACTIVE';
      final categoryData = data?['category'];

      List<String> categories = [];
      if (categoryData is List) {
        categories = categoryData.map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
      }

      if (itemName == null || itemName.isEmpty) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Product name is required');
      }

      if (categories.isEmpty) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'At least one category is required');
      }

      if (price == null || price <= 0) {
        return _reject(handler, options, 400, 'VALIDATION_ERROR', 'Price must be greater than zero');
      }

      final newProduct = {
        'id': 'prod-${DateTime.now().millisecondsSinceEpoch}',
        'branchId': branchId,
        'itemName': itemName,
        'category': categories,
        'price': price,
        'status': status,
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      };

      mockProducts.insert(0, newProduct);

      // Auto-create initial inventory item for the product
      final newInventory = {
        'id': 'inv-${DateTime.now().millisecondsSinceEpoch}',
        'productId': newProduct['id'],
        'branchId': branchId,
        'currentStock': 50,
        'minStockAlert': 10,
        'lastRestocked': DateTime.now().toIso8601String(),
      };
      mockInventory.insert(0, newInventory);

      return _resolve(handler, options, newProduct);
    }

    // ==========================================
    // 6. INVENTORY ENDPOINTS
    // ==========================================
    if ((path.endsWith('/inventory/movements') || path.endsWith('/movements')) && method == 'GET') {
      if (!_hasPermission(AppPermission.inventoryView)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot view inventory movements');
      }

      final branchId = options.queryParameters['branchId'];
      final inventoryId = options.queryParameters['inventoryId'];

      var result = List<Map<String, dynamic>>.from(mockMovements);
      if (branchId != null) {
        result = result.where((m) => m['branchId'] == branchId).toList();
      }
      if (inventoryId != null) {
        result = result.where((m) => m['inventoryId'] == inventoryId).toList();
      }

      return _resolve(handler, options, result);
    }

    // Adjust Stock: POST /inventory/:id/adjust
    final adjustRegex = RegExp(r'/inventory/([a-zA-Z0-9_-]+)/adjust$');
    final adjustMatch = adjustRegex.firstMatch(path);
    if (adjustMatch != null && method == 'POST') {
      if (!_hasPermission(AppPermission.inventoryManage)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot adjust inventory stock');
      }

      final inventoryId = adjustMatch.group(1);
      final item = mockInventory.firstWhere(
        (i) => i['id'] == inventoryId,
        orElse: () => mockInventory.first,
      );

      final data = options.data is String ? jsonDecode(options.data) : options.data;
      final adjustment = (data?['adjustment'] as num?)?.toInt() ?? 0;
      final reason = data?['reason'] as String? ?? 'Manual adjustment by staff';

      final current = (item['currentStock'] as num).toInt();
      final newStock = (current + adjustment).clamp(0, 99999);
      final reorder = (item['reorderLevel'] as num).toInt();

      item['currentStock'] = newStock;
      if (newStock <= 0) {
        item['status'] = 'OUT_OF_STOCK';
      } else if (newStock <= reorder) {
        item['status'] = 'LOW_STOCK';
      } else {
        item['status'] = 'IN_STOCK';
      }
      item['updatedAt'] = DateTime.now().toIso8601String();

      // Record movement
      final movement = {
        'id': 'mov-${DateTime.now().millisecondsSinceEpoch}',
        'inventoryId': inventoryId,
        'productId': item['productId'],
        'productName': item['productName'],
        'branchId': item['branchId'],
        'changeQuantity': adjustment,
        'balanceAfter': newStock,
        'type': adjustment >= 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
        'reason': reason,
        'createdAt': DateTime.now().toIso8601String(),
        'staffName': currentActiveUser['name'] ?? 'Alex Morgan',
      };
      mockMovements.insert(0, movement);

      return _resolve(handler, options, item);
    }

    if ((path.endsWith('/inventory') || path.endsWith(ApiEndpoints.inventory)) && method == 'GET') {
      if (!_hasPermission(AppPermission.inventoryView)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot view inventory');
      }

      final branchId = options.queryParameters['branchId'];
      final search = options.queryParameters['search']?.toString().toLowerCase();
      final status = options.queryParameters['status']?.toString().toUpperCase();

      var result = List<Map<String, dynamic>>.from(mockInventory);
      if (branchId != null) {
        result = result.where((i) => i['branchId'] == branchId).toList();
      }
      if (search != null && search.isNotEmpty) {
        result = result
            .where((i) => (i['productName'] as String).toLowerCase().contains(search))
            .toList();
      }
      if (status != null && status != 'ALL') {
        result = result.where((i) => i['status'] == status).toList();
      }

      return _resolve(handler, options, result);
    }

    // ==========================================
    // 7. ANALYTICS ENDPOINTS
    // ==========================================
    if ((path.endsWith('/analytics') || path.endsWith(ApiEndpoints.analytics)) && method == 'GET') {
      if (!_hasPermission(AppPermission.viewAnalytics)) {
        return _reject(handler, options, 403, 'FORBIDDEN', 'Permission denied: Cannot view analytics');
      }

      final branchId = options.queryParameters['branchId'] ?? 'branch-001';
      final branch = mockBranches.firstWhere(
        (b) => b['id'] == branchId,
        orElse: () => mockBranches.first,
      );

      final branchAnalytics = {
        'branchId': branchId,
        'branchName': branch['name'] ?? 'Main Cafeteria',
        'status': 'ACTIVE',
        'transactionCount': 148,
        'purchaseCount': 96,
        'purchaseVolume': 18450.0,
        'rechargeCount': 52,
        'rechargeVolume': 24800.0,
        'refundCount': 4,
        'refundVolume': 650.0,
        'totalRevenue': 43250.0,
        'sessionCount': 96,
        'activeSessionsCount': 12,
        'settledSessionsCount': 84,
        'avgTransactionValue': 292.23,
        'avgPurchaseValue': 192.19,
        'productsSoldCount': 245,
        'inventoryItemCount': mockInventory.length,
        'lowStockItemCount': mockInventory.where((i) => i['status'] == 'LOW_STOCK').length,
        'productDemand': [
          {
            'productId': 'prod-001',
            'productName': 'Veg Rice',
            'quantitySold': 42,
            'totalRevenue': 3360.0,
          },
          {
            'productId': 'prod-002',
            'productName': 'Chicken Curry',
            'quantitySold': 35,
            'totalRevenue': 4200.0,
          },
          {
            'productId': 'prod-004',
            'productName': 'Sandwich',
            'quantitySold': 28,
            'totalRevenue': 1960.0,
          },
          {
            'productId': 'prod-003',
            'productName': 'Juice',
            'quantitySold': 24,
            'totalRevenue': 960.0,
          },
        ],
        'peakPeriods': [
          {
            'timeSlot': '12:00 PM – 1:00 PM',
            'activityLevel': 'Highest',
            'transactionCount': 54,
            'purchaseVolume': 7200.0,
          },
          {
            'timeSlot': '1:00 PM – 2:00 PM',
            'activityLevel': 'High',
            'transactionCount': 42,
            'purchaseVolume': 5800.0,
          },
          {
            'timeSlot': '8:30 AM – 9:30 AM',
            'activityLevel': 'Moderate',
            'transactionCount': 28,
            'purchaseVolume': 2240.0,
          },
        ],
      };

      return _resolve(handler, options, branchAnalytics);
    }

    // If in mock mode, return a 404 response rather than falling through to network
    _reject(handler, options, 404, 'NOT_FOUND', 'Mock route not implemented: $method $path');
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================
  static bool _hasPermission(AppPermission permission) {
    final permissions = (currentActiveUser['permissions'] as List<dynamic>?)
            ?.map((p) => p.toString())
            .toList() ??
        [];
    return permissions.contains(permission.value);
  }

  static void _resolve(RequestInterceptorHandler handler, RequestOptions options, dynamic data) {
    handler.resolve(
      Response(
        requestOptions: options,
        statusCode: 200,
        data: {
          'success': true,
          'data': data,
        },
      ),
    );
  }

  static void _reject(
    RequestInterceptorHandler handler,
    RequestOptions options,
    int statusCode,
    String errorCode,
    String message,
  ) {
    handler.reject(
      DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: options,
          statusCode: statusCode,
          data: {
            'success': false,
            'error': {
              'code': errorCode,
              'message': message,
            },
          },
        ),
      ),
    );
  }
}
