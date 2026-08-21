import 'transaction.dart';

class ReceiptBillItem {
  final String name;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  const ReceiptBillItem({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'subtotal': subtotal,
      };

  factory ReceiptBillItem.fromJson(Map<String, dynamic> json) {
    final qty = json['quantity'] as int? ?? 1;
    final unitPrice = (json['unitPrice'] as num?)?.toDouble() ?? 
        ((json['price'] as num?)?.toDouble() ?? 0.0);
    final total = (json['subtotal'] as num?)?.toDouble() ?? 
        ((json['total'] as num?)?.toDouble() ?? (qty * unitPrice));

    return ReceiptBillItem(
      name: json['name'] as String? ?? 'Item',
      quantity: qty,
      unitPrice: unitPrice,
      subtotal: total,
    );
  }
}

/// Unified, production-ready Receipt Bill Model consumed by both On-Screen Preview & PDF Engine
class ReceiptBill {
  final String organizationName;
  final String branchName;
  final String receiptTitle;
  final String transactionId;
  final DateTime timestamp;
  final String cardIdentifier;
  final String? sessionId;
  final String? staffName;
  final List<ReceiptBillItem> items;
  final double subtotal;
  final double totalAmount;
  final double previousBalance;
  final double amountDeducted;
  final double remainingBalance;
  final String paymentMethod;
  final String? paymentReference;
  final String sessionStatus;

  const ReceiptBill({
    this.organizationName = 'MONEY CARD',
    required this.branchName,
    this.receiptTitle = 'SALES RECEIPT',
    required this.transactionId,
    required this.timestamp,
    required this.cardIdentifier,
    this.sessionId,
    this.staffName,
    required this.items,
    required this.subtotal,
    required this.totalAmount,
    required this.previousBalance,
    required this.amountDeducted,
    required this.remainingBalance,
    this.paymentMethod = 'Card Session',
    this.paymentReference,
    this.sessionStatus = 'ACTIVE',
  });

  
  bool get isRecharge => receiptTitle.toUpperCase().contains('RECHARGE');

  String get displayCardId {
    final raw = cardIdentifier.trim();
    if (raw.isEmpty) return 'MC-CARD';
    if (raw.toUpperCase().startsWith('MC-')) return raw.toUpperCase();
    if (raw.contains('-') && raw.length > 20) {
      final clean = raw.replaceAll('-', '');
      return 'MC-${clean.length > 6 ? clean.substring(0, 6).toUpperCase() : clean.toUpperCase()}';
    }
    return raw.toUpperCase().startsWith('MC-') ? raw.toUpperCase() : 'MC-$raw';
  }

  String get displayBillNo {
    final raw = transactionId.trim();
    if (raw.isEmpty) return 'BILL-#001';
    if (raw.contains('-') && raw.length > 20) {
      final prefix = isRecharge
          ? 'RCH'
          : (receiptTitle.toUpperCase().contains('SETTLE') || receiptTitle.toUpperCase().contains('RETURN')
              ? 'RET'
              : 'BILL');
      final clean = raw.replaceAll('-', '');
      return '$prefix-#${clean.length > 8 ? clean.substring(0, 8).toUpperCase() : clean.toUpperCase()}';
    }
    return raw;
  }


  /// Factory constructor to create a standard mock purchase bill for offline development and testing
  factory ReceiptBill.mockPurchase() {
    return ReceiptBill(
      organizationName: 'MONEY CARD',
      branchName: 'Main Cafeteria',
      receiptTitle: 'SALES RECEIPT',
      transactionId: 'TXN-MOCK-001',
      timestamp: DateTime(2026, 8, 17, 16, 32),
      cardIdentifier: 'MC-001',
      sessionId: 'SESSION-MOCK-001',
      staffName: 'Staff Cashier',
      items: const [
        ReceiptBillItem(
          name: 'Veg Burger',
          quantity: 2,
          unitPrice: 120.0,
          subtotal: 240.0,
        ),
        ReceiptBillItem(
          name: 'Fresh Juice',
          quantity: 1,
          unitPrice: 60.0,
          subtotal: 60.0,
        ),
      ],
      subtotal: 300.0,
      totalAmount: 300.0,
      previousBalance: 750.0,
      amountDeducted: 300.0,
      remainingBalance: 450.0,
      paymentMethod: 'Card Session',
      sessionStatus: 'ACTIVE',
    );
  }

  /// Factory constructor for mock recharge bills (supporting CASH and UPI)
  factory ReceiptBill.mockRecharge({
    PaymentMethod paymentMethod = PaymentMethod.upi,
    String? paymentReference = 'UPI-MOCK-001',
  }) {
    return ReceiptBill(
      organizationName: 'MONEY CARD',
      branchName: 'Main Cafeteria',
      receiptTitle: 'RECHARGE RECEIPT',
      transactionId: 'TXN-MOCK-RCH-001',
      timestamp: DateTime(2026, 8, 18, 16, 32),
      cardIdentifier: 'MC-001',
      sessionId: 'SESSION-MOCK-001',
      staffName: 'Staff Cashier',
      items: [
        ReceiptBillItem(
          name: 'Card Balance Recharge (${paymentMethod.value})',
          quantity: 1,
          unitPrice: 500.0,
          subtotal: 500.0,
        ),
      ],
      subtotal: 500.0,
      totalAmount: 500.0,
      previousBalance: 250.0,
      amountDeducted: 500.0,
      remainingBalance: 750.0,
      paymentMethod: paymentMethod.value,
      paymentReference: paymentMethod == PaymentMethod.upi ? paymentReference : null,
      sessionStatus: 'ACTIVE',
    );
  }

  Map<String, dynamic> toJson() => {
        'organizationName': organizationName,
        'branchName': branchName,
        'receiptTitle': receiptTitle,
        'transactionId': transactionId,
        'timestamp': timestamp.toIso8601String(),
        'cardIdentifier': cardIdentifier,
        'sessionId': sessionId,
        'staffName': staffName,
        'items': items.map((e) => e.toJson()).toList(),
        'subtotal': subtotal,
        'totalAmount': totalAmount,
        'previousBalance': previousBalance,
        'amountDeducted': amountDeducted,
        'remainingBalance': remainingBalance,
        'paymentMethod': paymentMethod,
        if (paymentReference != null) 'paymentReference': paymentReference,
        'sessionStatus': sessionStatus,
      };

  factory ReceiptBill.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return ReceiptBill(
      organizationName: json['organizationName'] as String? ?? 'MONEY CARD',
      branchName: json['branchName'] as String? ?? 'Main Cafeteria',
      receiptTitle: json['receiptTitle'] as String? ?? 'SALES RECEIPT',
      transactionId: json['transactionId'] as String? ?? 'TXN-001',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      cardIdentifier: json['cardIdentifier'] as String? ?? 'MC-001',
      sessionId: json['sessionId'] as String?,
      staffName: json['staffName'] as String?,
      items: rawItems
          .map((item) => ReceiptBillItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      previousBalance: (json['previousBalance'] as num?)?.toDouble() ?? 0.0,
      amountDeducted: (json['amountDeducted'] as num?)?.toDouble() ?? 0.0,
      remainingBalance: (json['remainingBalance'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod'] as String? ?? 'Card Session',
      paymentReference: json['paymentReference'] as String?,
      sessionStatus: json['sessionStatus'] as String? ?? 'ACTIVE',
    );
  }
}
