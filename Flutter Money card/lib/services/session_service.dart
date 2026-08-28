import '../core/constants/api_endpoints.dart';
import '../models/card_session.dart';
import '../models/transaction.dart';
import 'api_service.dart';

class SessionService {
  final ApiService _apiService;

  SessionService(this._apiService);

  /// Create an ACTIVE card session for an AVAILABLE card (POST /api/v1/card-sessions)
  Future<CardSession> createSession({
    required String cardId,
    required String branchId,
    String? customerName,
    String? customerPhone,
    double initialAmount = 0,
    String paymentMethod = 'CASH',
  }) async {
    return _apiService.post<CardSession>(
      ApiEndpoints.cardSessions,
      data: {
        'cardId': cardId,
        'branchId': branchId,
        if (customerName != null && customerName.isNotEmpty) 'customerName': customerName,
        if (customerPhone != null && customerPhone.isNotEmpty) 'customerPhone': customerPhone,
        if (initialAmount > 0) 'initialAmount': initialAmount,
        'paymentMethod': paymentMethod,
      },
      fromJson: (data) => CardSession.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Get session details by session ID (GET /api/v1/card-sessions/:id)
  Future<CardSession> getSessionById(String id) async {
    return _apiService.get<CardSession>(
      ApiEndpoints.cardSessionById(id),
      fromJson: (data) => CardSession.fromJson(data as Map<String, dynamic>),
    );
  }

  /// List card sessions with optional branch and status filter (GET /api/v1/card-sessions)
  Future<List<CardSession>> listSessions({
    String? branchId,
    String? status,
    int? page,
    int? limit,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': ?branchId,
      'status': ?status,
      'page': ?page,
      'limit': ?limit,
    };

    return _apiService.get<List<CardSession>>(
      ApiEndpoints.cardSessions,
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => CardSession.fromJson(item as Map<String, dynamic>))
              .toList();
        } else if (data is Map<String, dynamic> && data['items'] is List) {
          return (data['items'] as List)
              .map((item) => CardSession.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }

  /// Recharge an active card session (POST /api/v1/card-sessions/:id/recharge)
  Future<RechargeResult> recharge({
    required String sessionId,
    required double amount,
    required PaymentMethod paymentMethod,
    String? externalReference,
  }) async {
    return _apiService.post<RechargeResult>(
      ApiEndpoints.rechargeCardSession(sessionId),
      data: {
        'amount': amount,
        'paymentMethod': paymentMethod.value,
        'externalReference': ?externalReference,
      },
      fromJson: (data) => RechargeResult.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Execute purchase for active card session (POST /api/v1/card-sessions/:id/purchase)
  Future<PurchaseResult> purchase({
    required String sessionId,
    required List<Map<String, dynamic>> items,
  }) async {
    return _apiService.post<PurchaseResult>(
      ApiEndpoints.purchaseCardSession(sessionId),
      data: {'items': items},
      fromJson: (data) => PurchaseResult.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Return/settle card session (POST /api/v1/card-sessions/:id/return)
  Future<SessionReturnResult> returnSession(String sessionId) async {
    return _apiService.post<SessionReturnResult>(
      ApiEndpoints.returnCardSession(sessionId),
      data: {},
      fromJson: (data) => SessionReturnResult.fromJson(data as Map<String, dynamic>),
    );
  }
}
