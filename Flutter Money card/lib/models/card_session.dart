import 'transaction.dart';

enum SessionStatus {
  active('ACTIVE'),
  settled('SETTLED');

  const SessionStatus(this.value);

  final String value;

  static SessionStatus fromString(String? val) {
    if (val == null) return SessionStatus.active;
    for (final status in SessionStatus.values) {
      if (status.value == val) return status;
    }
    return SessionStatus.active;
  }
}

/// Active or settled wallet session for a card according to M0 V10.
class CardSession {
  final String id;
  final String cardId;
  final String? physicalCardNumber;
  final String branchId;
  final String? branchName;
  final SessionStatus status;
  final double balance;
  final String startedAt;
  final String? settledAt;
  final String? createdAt;
  final String? updatedAt;

  const CardSession({
    required this.id,
    required this.cardId,
    this.physicalCardNumber,
    required this.branchId,
    this.branchName,
    required this.status,
    required this.balance,
    required this.startedAt,
    this.settledAt,
    this.createdAt,
    this.updatedAt,
  });

  factory CardSession.fromJson(Map<String, dynamic> json) {
    return CardSession(
      id: json['id'] as String? ?? json['sessionId'] as String? ?? '',
      cardId: json['cardId'] as String? ?? '',
      physicalCardNumber: json['physicalCardNumber'] as String?,
      branchId: json['branchId'] as String? ?? '',
      branchName: json['branchName'] as String? ?? (json['branch'] != null && json['branch'] is Map ? json['branch']['name'] as String? : null),
      status: SessionStatus.fromString(json['status'] as String? ?? json['sessionStatus'] as String?),
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      startedAt: json['startedAt'] as String? ?? '',
      settledAt: json['settledAt'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'cardId': cardId,
        if (physicalCardNumber != null) 'physicalCardNumber': physicalCardNumber,
        'branchId': branchId,
        'status': status.value,
        'balance': balance,
        'startedAt': startedAt,
        if (settledAt != null) 'settledAt': settledAt,
        if (createdAt != null) 'createdAt': createdAt,
        if (updatedAt != null) 'updatedAt': updatedAt,
      };

  CardSession copyWith({
    String? id,
    String? cardId,
    String? physicalCardNumber,
    String? branchId,
    SessionStatus? status,
    double? balance,
    String? startedAt,
    String? settledAt,
    String? createdAt,
    String? updatedAt,
  }) {
    return CardSession(
      id: id ?? this.id,
      cardId: cardId ?? this.cardId,
      physicalCardNumber: physicalCardNumber ?? this.physicalCardNumber,
      branchId: branchId ?? this.branchId,
      status: status ?? this.status,
      balance: balance ?? this.balance,
      startedAt: startedAt ?? this.startedAt,
      settledAt: settledAt ?? this.settledAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Result of a recharge operation (POST /api/v1/card-sessions/:id/recharge)
class RechargeResult {
  final String transactionId;
  final double amount;
  final double balance;
  final PaymentMethod paymentMethod;
  final String status;

  const RechargeResult({
    required this.transactionId,
    required this.amount,
    required this.balance,
    required this.paymentMethod,
    required this.status,
  });

  factory RechargeResult.fromJson(Map<String, dynamic> json) {
    return RechargeResult(
      transactionId: json['transactionId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balance: (json['balance'] as num? ?? json['balanceAfter'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: PaymentMethod.fromString(json['paymentMethod'] as String?),
      status: json['status'] as String? ?? 'SUCCESS',
    );
  }

  Map<String, dynamic> toJson() => {
        'transactionId': transactionId,
        'amount': amount,
        'balance': balance,
        'paymentMethod': paymentMethod.value,
        'status': status,
      };
}

/// Result of a purchase operation (POST /api/v1/card-sessions/:id/purchase)
class PurchaseResult {
  final String transactionId;
  final double amount;
  final double balance;
  final String status;

  const PurchaseResult({
    required this.transactionId,
    required this.amount,
    required this.balance,
    required this.status,
  });

  factory PurchaseResult.fromJson(Map<String, dynamic> json) {
    return PurchaseResult(
      transactionId: json['transactionId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'SUCCESS',
    );
  }

  Map<String, dynamic> toJson() => {
        'transactionId': transactionId,
        'amount': amount,
        'balance': balance,
        'status': status,
      };
}

/// Result of a session return / settlement operation (POST /api/v1/card-sessions/:id/return)
class SessionReturnResult {
  final String sessionId;
  final double refundedAmount;
  final String sessionStatus;
  final String cardStatus;

  const SessionReturnResult({
    required this.sessionId,
    required this.refundedAmount,
    required this.sessionStatus,
    required this.cardStatus,
  });

  factory SessionReturnResult.fromJson(Map<String, dynamic> json) {
    return SessionReturnResult(
      sessionId: json['sessionId'] as String? ?? '',
      refundedAmount: (json['refundedAmount'] as num? ?? json['refundAmount'] as num?)?.toDouble() ?? 0.0,
      sessionStatus: json['sessionStatus'] as String? ?? 'SETTLED',
      cardStatus: json['cardStatus'] as String? ?? 'AVAILABLE',
    );
  }

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'refundedAmount': refundedAmount,
        'sessionStatus': sessionStatus,
        'cardStatus': cardStatus,
      };
}
