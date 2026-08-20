import '../models/card_session.dart';
import '../models/transaction.dart';
import '../services/session_service.dart';

class SessionRepository {
  final SessionService _sessionService;

  SessionRepository(this._sessionService);

  Future<CardSession> createSession({
    required String cardId,
    required String branchId,
  }) async {
    return _sessionService.createSession(
      cardId: cardId,
      branchId: branchId,
    );
  }

  Future<CardSession> getSessionById(String id) async {
    return _sessionService.getSessionById(id);
  }

  Future<List<CardSession>> listSessions({
    String? branchId,
    String? status,
    int? page,
    int? limit,
  }) async {
    return _sessionService.listSessions(
      branchId: branchId,
      status: status,
      page: page,
      limit: limit,
    );
  }

  Future<RechargeResult> recharge({
    required String sessionId,
    required double amount,
    required PaymentMethod paymentMethod,
    String? externalReference,
  }) async {
    return _sessionService.recharge(
      sessionId: sessionId,
      amount: amount,
      paymentMethod: paymentMethod,
      externalReference: externalReference,
    );
  }

  Future<PurchaseResult> purchase({
    required String sessionId,
    required List<Map<String, dynamic>> items,
  }) async {
    return _sessionService.purchase(
      sessionId: sessionId,
      items: items,
    );
  }

  Future<SessionReturnResult> returnSession(String sessionId) async {
    return _sessionService.returnSession(sessionId);
  }
}
