import 'transaction.dart';

class Payment {
  final String id;
  final String transactionId;
  final double amount;
  final String status; // 'SUCCESS' | 'FAILED'
  final PaymentMethod paymentMethod;
  final String? externalReference;
  final String? createdAt;

  const Payment({
    required this.id,
    required this.transactionId,
    required this.amount,
    required this.status,
    required this.paymentMethod,
    this.externalReference,
    this.createdAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'] as String? ?? '',
      transactionId: json['transactionId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'SUCCESS',
      paymentMethod: PaymentMethod.fromString(json['paymentMethod'] as String?),
      externalReference: json['externalReference'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'transactionId': transactionId,
        'amount': amount,
        'status': status,
        'paymentMethod': paymentMethod.value,
        if (externalReference != null) 'externalReference': externalReference,
        if (createdAt != null) 'createdAt': createdAt,
      };
}
