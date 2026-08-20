enum TransactionType {
  recharge('RECHARGE'),
  purchase('PURCHASE'),
  refund('REFUND');

  const TransactionType(this.value);

  final String value;

  static TransactionType fromString(String? val) {
    if (val == null) return TransactionType.purchase;
    for (final type in TransactionType.values) {
      if (type.value == val) return type;
    }
    return TransactionType.purchase;
  }
}

enum TransactionStatus {
  pending('PENDING'),
  success('SUCCESS'),
  failed('FAILED'),
  refunded('REFUNDED');

  const TransactionStatus(this.value);

  final String value;

  static TransactionStatus fromString(String? val) {
    if (val == null) return TransactionStatus.pending;
    for (final status in TransactionStatus.values) {
      if (status.value == val) return status;
    }
    return TransactionStatus.pending;
  }
}

enum PaymentMethod {
  cash('CASH'),
  upi('UPI');

  const PaymentMethod(this.value);

  final String value;

  static PaymentMethod fromString(String? val) {
    if (val == null) return PaymentMethod.cash;
    for (final method in PaymentMethod.values) {
      if (method.value == val) return method;
    }
    return PaymentMethod.cash;
  }
}

class PurchaseItem {
  final String productId;
  final int quantity;
  final String? itemName;
  final double? unitPrice;
  final double? totalAmount;

  const PurchaseItem({
    required this.productId,
    required this.quantity,
    this.itemName,
    this.unitPrice,
    this.totalAmount,
  });

  factory PurchaseItem.fromJson(Map<String, dynamic> json) {
    return PurchaseItem(
      productId: json['productId'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      itemName: json['itemName'] as String?,
      unitPrice: (json['unitPrice'] as num?)?.toDouble(),
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'quantity': quantity,
        if (itemName != null) 'itemName': itemName,
        if (unitPrice != null) 'unitPrice': unitPrice,
        if (totalAmount != null) 'totalAmount': totalAmount,
      };
}

class Transaction {
  final String id;
  final String sessionId;
  final String branchId;
  final TransactionType type;
  final double amount;
  final double? balanceAfter;
  final TransactionStatus status;
  final List<PurchaseItem>? items;
  final PaymentMethod? paymentMethod;
  final String? externalReference;
  final String? createdAt;

  const Transaction({
    required this.id,
    required this.sessionId,
    required this.branchId,
    required this.type,
    required this.amount,
    this.balanceAfter,
    required this.status,
    this.items,
    this.paymentMethod,
    this.externalReference,
    this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? '',
      branchId: json['branchId'] as String? ?? '',
      type: TransactionType.fromString(json['type'] as String?),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balanceAfter: (json['balanceAfter'] as num?)?.toDouble(),
      status: TransactionStatus.fromString(json['status'] as String?),
      items: (json['items'] as List<dynamic>?)
          ?.map((item) => PurchaseItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      paymentMethod: json['paymentMethod'] != null
          ? PaymentMethod.fromString(json['paymentMethod'] as String?)
          : null,
      externalReference: json['externalReference'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'branchId': branchId,
        'type': type.value,
        'amount': amount,
        if (balanceAfter != null) 'balanceAfter': balanceAfter,
        'status': status.value,
        if (items != null) 'items': items!.map((i) => i.toJson()).toList(),
        if (paymentMethod != null) 'paymentMethod': paymentMethod!.value,
        if (externalReference != null) 'externalReference': externalReference,
        if (createdAt != null) 'createdAt': createdAt,
      };
}
