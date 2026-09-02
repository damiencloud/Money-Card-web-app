import 'transaction.dart';

/// Cleans internal cycle suffixes like `_1`, `_2`, `_10` from a card number for user-facing display.
/// Example: "MC 105_2" -> "MC 105", "MC-104_1" -> "MC-104".
/// Uses a regex `r'_\d+$'` to safely strip only trailing numeric cycle suffixes.
String cleanDisplayCardNumber(String? raw) {
  if (raw == null || raw.trim().isEmpty) return '';
  final trimmed = raw.trim();
  return trimmed.replaceAll(RegExp(r'_\d+$'), '');
}




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
  /// Clean user-facing card display number without internal cycle suffixes (e.g. "MC 105" instead of "MC 105_2").
  String get displayCardNumber {
    if (physicalCardNumber != null && physicalCardNumber!.trim().isNotEmpty) {
      return cleanDisplayCardNumber(physicalCardNumber);
    }
    if (sessionCardNumber != null && sessionCardNumber!.trim().isNotEmpty) {
      return cleanDisplayCardNumber(sessionCardNumber);
    }
    return 'Card';
  }

  final String id;
  final String cardId;
  final String? physicalCardNumber;
  final String branchId;
  final String? branchName;
  final SessionStatus status;
  final double balance;
  final int? cycleNumber;
  final String? sessionCardNumber;
  final String? customerName;
  final String? customerPhone;
  final String startedAt;
  final String? settledAt;
  final List<Transaction>? transactions;
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
    this.cycleNumber,
    this.sessionCardNumber,
    this.customerName,
    this.customerPhone,
    required this.startedAt,
    this.settledAt,
    this.transactions,
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
      cycleNumber: (json['cycleNumber'] as num?)?.toInt(),
      sessionCardNumber: json['sessionCardNumber'] as String?,
      customerName: json['customerName'] as String? ?? json['userName'] as String?,
      customerPhone: json['customerPhone'] as String? ?? json['phone'] as String?,
      startedAt: json['startedAt'] as String? ?? '',
      transactions: (json['transactions'] as List<dynamic>?)?.map((t) => Transaction.fromJson(t as Map<String, dynamic>)).toList(),
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
        if (cycleNumber != null) 'cycleNumber': cycleNumber,
        if (sessionCardNumber != null) 'sessionCardNumber': sessionCardNumber,
        if (customerName != null) 'customerName': customerName,
        if (customerPhone != null) 'customerPhone': customerPhone,
        'startedAt': startedAt,
        if (settledAt != null) 'settledAt': settledAt,
        if (transactions != null) 'transactions': transactions!.map((t) => t.toJson()).toList(),
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
    int? cycleNumber,
    String? sessionCardNumber,
    String? customerName,
    String? customerPhone,
    String? startedAt,
    String? settledAt,
    List<Transaction>? transactions,
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
      cycleNumber: cycleNumber ?? this.cycleNumber,
      sessionCardNumber: sessionCardNumber ?? this.sessionCardNumber,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      startedAt: startedAt ?? this.startedAt,
      settledAt: settledAt ?? this.settledAt,
      transactions: transactions ?? this.transactions,
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
  final double? balanceBefore;
  final PaymentMethod paymentMethod;
  final String status;

  const RechargeResult({
    required this.transactionId,
    required this.amount,
    required this.balance,
    this.balanceBefore,
    required this.paymentMethod,
    required this.status,
  });

  factory RechargeResult.fromJson(Map<String, dynamic> json) {
    final amt = (json['amount'] as num?)?.toDouble() ?? 0.0;
    final bal = (json['balance'] as num? ?? json['balanceAfter'] as num?)?.toDouble() ?? 0.0;
    final before = (json['balanceBefore'] as num? ?? json['previousBalance'] as num?)?.toDouble() ??
        (bal - amt).clamp(0.0, double.infinity);

    return RechargeResult(
      transactionId: json['transactionId'] as String? ?? json['id'] as String? ?? '',
      amount: amt,
      balance: bal,
      balanceBefore: before,
      paymentMethod: PaymentMethod.fromString(json['paymentMethod'] as String?),
      status: json['status'] as String? ?? 'SUCCESS',
    );
  }

  Map<String, dynamic> toJson() => {
        'transactionId': transactionId,
        'amount': amount,
        'balance': balance,
        'balanceBefore': balanceBefore,
        'paymentMethod': paymentMethod.value,
        'status': status,
      };
}

/// Result of a purchase operation (POST /api/v1/card-sessions/:id/purchase)
class PurchaseResult {
  final String transactionId;
  final double amount;
  final double balance;
  final double? balanceBefore;
  final String status;

  const PurchaseResult({
    required this.transactionId,
    required this.amount,
    required this.balance,
    this.balanceBefore,
    required this.status,
  });

  factory PurchaseResult.fromJson(Map<String, dynamic> json) {
    final tx = json['transaction'] is Map<String, dynamic>
        ? json['transaction'] as Map<String, dynamic>
        : null;
    final sess = json['session'] is Map<String, dynamic>
        ? json['session'] as Map<String, dynamic>
        : null;

    final txId = tx?['id'] as String? ??
        json['transactionId'] as String? ??
        json['id'] as String? ??
        '';
    final amt = (tx?['amount'] as num?)?.toDouble() ??
        (json['amount'] as num?)?.toDouble() ??
        0.0;
    final bal = (sess?['balance'] as num?)?.toDouble() ??
        (tx?['balanceAfter'] as num?)?.toDouble() ??
        (json['balance'] as num?)?.toDouble() ??
        (json['remainingBalance'] as num?)?.toDouble() ??
        0.0;
    final before = (tx?['balanceBefore'] as num?)?.toDouble() ??
        (json['balanceBefore'] as num?)?.toDouble() ??
        (json['previousBalance'] as num?)?.toDouble() ??
        (bal + amt);

    return PurchaseResult(
      transactionId: txId,
      amount: amt,
      balance: bal,
      balanceBefore: before,
      status: json['status'] as String? ?? 'SUCCESS',
    );
  }

  Map<String, dynamic> toJson() => {
        'transactionId': transactionId,
        'amount': amount,
        'balance': balance,
        'balanceBefore': balanceBefore,
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
