class ProductDemand {
  final String productId;
  final String productName;
  final int quantitySold;
  final double totalRevenue;

  const ProductDemand({
    required this.productId,
    required this.productName,
    required this.quantitySold,
    required this.totalRevenue,
  });

  factory ProductDemand.fromJson(Map<String, dynamic> json) {
    return ProductDemand(
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? json['itemName'] as String? ?? '',
      quantitySold: (json['quantitySold'] as num?)?.toInt() ?? 0,
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'productName': productName,
        'quantitySold': quantitySold,
        'totalRevenue': totalRevenue,
      };
}

class PeakPeriod {
  final String timeSlot;
  final String activityLevel; // 'Highest', 'High', 'Moderate', 'Normal'
  final int transactionCount;
  final double purchaseVolume;

  const PeakPeriod({
    required this.timeSlot,
    required this.activityLevel,
    required this.transactionCount,
    required this.purchaseVolume,
  });

  factory PeakPeriod.fromJson(Map<String, dynamic> json) {
    return PeakPeriod(
      timeSlot: json['timeSlot'] as String? ?? '',
      activityLevel: json['activityLevel'] as String? ?? 'Normal',
      transactionCount: (json['transactionCount'] as num?)?.toInt() ?? 0,
      purchaseVolume: (json['purchaseVolume'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'timeSlot': timeSlot,
        'activityLevel': activityLevel,
        'transactionCount': transactionCount,
        'purchaseVolume': purchaseVolume,
      };
}

class BranchPerformanceMetric {
  final String branchId;
  final String branchName;
  final String status;
  final int transactionCount;
  final int purchaseCount;
  final double purchaseVolume;
  final int rechargeCount;
  final double rechargeVolume;
  final int refundCount;
  final double refundVolume;
  final double totalRevenue;
  final int sessionCount;
  final int activeSessionsCount;
  final int settledSessionsCount;
  final double avgTransactionValue;
  final double avgPurchaseValue;
  final int productsSoldCount;
  final int inventoryItemCount;
  final int lowStockItemCount;
  final List<ProductDemand>? productDemand;
  final List<PeakPeriod>? peakPeriods;

  const BranchPerformanceMetric({
    required this.branchId,
    required this.branchName,
    this.status = 'ACTIVE',
    this.transactionCount = 0,
    this.purchaseCount = 0,
    this.purchaseVolume = 0.0,
    this.rechargeCount = 0,
    this.rechargeVolume = 0.0,
    this.refundCount = 0,
    this.refundVolume = 0.0,
    this.totalRevenue = 0.0,
    this.sessionCount = 0,
    this.activeSessionsCount = 0,
    this.settledSessionsCount = 0,
    this.avgTransactionValue = 0.0,
    this.avgPurchaseValue = 0.0,
    this.productsSoldCount = 0,
    this.inventoryItemCount = 0,
    this.lowStockItemCount = 0,
    this.productDemand,
    this.peakPeriods,
  });

  factory BranchPerformanceMetric.fromJson(Map<String, dynamic> json) {
    return BranchPerformanceMetric(
      branchId: json['branchId'] as String? ?? '',
      branchName: json['branchName'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      transactionCount: (json['transactionCount'] as num?)?.toInt() ?? 0,
      purchaseCount: (json['purchaseCount'] as num?)?.toInt() ?? 0,
      purchaseVolume: (json['purchaseVolume'] as num?)?.toDouble() ?? 0.0,
      rechargeCount: (json['rechargeCount'] as num?)?.toInt() ?? 0,
      rechargeVolume: (json['rechargeVolume'] as num?)?.toDouble() ?? 0.0,
      refundCount: (json['refundCount'] as num?)?.toInt() ?? 0,
      refundVolume: (json['refundVolume'] as num?)?.toDouble() ?? 0.0,
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
      sessionCount: (json['sessionCount'] as num?)?.toInt() ?? 0,
      activeSessionsCount: (json['activeSessionsCount'] as num?)?.toInt() ?? 0,
      settledSessionsCount: (json['settledSessionsCount'] as num?)?.toInt() ?? 0,
      avgTransactionValue: (json['avgTransactionValue'] as num?)?.toDouble() ?? 0.0,
      avgPurchaseValue: (json['avgPurchaseValue'] as num?)?.toDouble() ?? 0.0,
      productsSoldCount: (json['productsSoldCount'] as num?)?.toInt() ?? 0,
      inventoryItemCount: (json['inventoryItemCount'] as num?)?.toInt() ?? 0,
      lowStockItemCount: (json['lowStockItemCount'] as num?)?.toInt() ?? 0,
      productDemand: (json['productDemand'] as List<dynamic>?)
          ?.map((e) => ProductDemand.fromJson(e as Map<String, dynamic>))
          .toList(),
      peakPeriods: (json['peakPeriods'] as List<dynamic>?)
          ?.map((e) => PeakPeriod.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'branchId': branchId,
        'branchName': branchName,
        'status': status,
        'transactionCount': transactionCount,
        'purchaseCount': purchaseCount,
        'purchaseVolume': purchaseVolume,
        'rechargeCount': rechargeCount,
        'rechargeVolume': rechargeVolume,
        'refundCount': refundCount,
        'refundVolume': refundVolume,
        'totalRevenue': totalRevenue,
        'sessionCount': sessionCount,
        'activeSessionsCount': activeSessionsCount,
        'settledSessionsCount': settledSessionsCount,
        'avgTransactionValue': avgTransactionValue,
        'avgPurchaseValue': avgPurchaseValue,
        'productsSoldCount': productsSoldCount,
        'inventoryItemCount': inventoryItemCount,
        'lowStockItemCount': lowStockItemCount,
        if (productDemand != null)
          'productDemand': productDemand!.map((e) => e.toJson()).toList(),
        if (peakPeriods != null)
          'peakPeriods': peakPeriods!.map((e) => e.toJson()).toList(),
      };
}

class AnalyticsOverview {
  final int totalTransactions;
  final double totalRechargeVolume;
  final double totalPurchaseVolume;
  final double totalRefundVolume;
  final int activeSessionsCount;
  final int activeCardsCount;
  final int lowStockItemsCount;
  final List<BranchPerformanceMetric>? branchPerformance;
  final List<ProductDemand>? topProductDemand;
  final List<PeakPeriod>? peakPeriods;

  const AnalyticsOverview({
    this.totalTransactions = 0,
    this.totalRechargeVolume = 0.0,
    this.totalPurchaseVolume = 0.0,
    this.totalRefundVolume = 0.0,
    this.activeSessionsCount = 0,
    this.activeCardsCount = 0,
    this.lowStockItemsCount = 0,
    this.branchPerformance,
    this.topProductDemand,
    this.peakPeriods,
  });

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) {
    return AnalyticsOverview(
      totalTransactions: (json['totalTransactions'] as num?)?.toInt() ?? 0,
      totalRechargeVolume: (json['totalRechargeVolume'] as num?)?.toDouble() ?? 0.0,
      totalPurchaseVolume: (json['totalPurchaseVolume'] as num?)?.toDouble() ?? 0.0,
      totalRefundVolume: (json['totalRefundVolume'] as num?)?.toDouble() ?? 0.0,
      activeSessionsCount: (json['activeSessionsCount'] as num?)?.toInt() ?? 0,
      activeCardsCount: (json['activeCardsCount'] as num?)?.toInt() ?? 0,
      lowStockItemsCount: (json['lowStockItemsCount'] as num?)?.toInt() ?? 0,
      branchPerformance: (json['branchPerformance'] as List<dynamic>?)
          ?.map((e) => BranchPerformanceMetric.fromJson(e as Map<String, dynamic>))
          .toList(),
      topProductDemand: (json['topProductDemand'] as List<dynamic>?)
          ?.map((e) => ProductDemand.fromJson(e as Map<String, dynamic>))
          .toList(),
      peakPeriods: (json['peakPeriods'] as List<dynamic>?)
          ?.map((e) => PeakPeriod.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'totalTransactions': totalTransactions,
        'totalRechargeVolume': totalRechargeVolume,
        'totalPurchaseVolume': totalPurchaseVolume,
        'totalRefundVolume': totalRefundVolume,
        'activeSessionsCount': activeSessionsCount,
        'activeCardsCount': activeCardsCount,
        'lowStockItemsCount': lowStockItemsCount,
        if (branchPerformance != null)
          'branchPerformance': branchPerformance!.map((e) => e.toJson()).toList(),
        if (topProductDemand != null)
          'topProductDemand': topProductDemand!.map((e) => e.toJson()).toList(),
        if (peakPeriods != null)
          'peakPeriods': peakPeriods!.map((e) => e.toJson()).toList(),
      };
}
