enum StockStatus {
  inStock('IN_STOCK'),
  lowStock('LOW_STOCK'),
  outOfStock('OUT_OF_STOCK');

  const StockStatus(this.value);

  final String value;

  static StockStatus fromString(String? val) {
    if (val == null) return StockStatus.inStock;
    for (final status in StockStatus.values) {
      if (status.value == val) return status;
    }
    return StockStatus.inStock;
  }
}

enum MovementType {
  manualAdjustment('MANUAL_ADJUSTMENT'),
  purchase('PURCHASE'),
  restock('RESTOCK'),
  damage('DAMAGE');

  const MovementType(this.value);

  final String value;

  static MovementType fromString(String? val) {
    if (val == null) return MovementType.manualAdjustment;
    for (final type in MovementType.values) {
      if (type.value == val) return type;
    }
    return MovementType.manualAdjustment;
  }
}

/// Inventory item representing product stock in a specific branch.
class InventoryItem {
  final String id;
  final String productId;
  final String productName;
  final String branchId;
  final int currentStock;
  final int reorderLevel;
  final StockStatus status;
  final List<String> category;
  final double price;
  final String? updatedAt;

  const InventoryItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.branchId,
    required this.currentStock,
    this.reorderLevel = 10,
    required this.status,
    this.category = const [],
    this.price = 0.0,
    this.updatedAt,
  });

  bool get isLowStock => currentStock <= reorderLevel && currentStock > 0;
  bool get isOutOfStock => currentStock <= 0;

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    final stock = (json['currentStock'] as num?)?.toInt() ?? 0;
    final reorder = (json['reorderLevel'] as num?)?.toInt() ?? 10;

    StockStatus derivedStatus = StockStatus.inStock;
    if (json['status'] != null) {
      derivedStatus = StockStatus.fromString(json['status'] as String?);
    } else {
      if (stock <= 0) {
        derivedStatus = StockStatus.outOfStock;
      } else if (stock <= reorder) {
        derivedStatus = StockStatus.lowStock;
      }
    }

    return InventoryItem(
      id: json['id'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? json['itemName'] as String? ?? '',
      branchId: json['branchId'] as String? ?? '',
      currentStock: stock,
      reorderLevel: reorder,
      status: derivedStatus,
      category: (json['category'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'productId': productId,
        'productName': productName,
        'branchId': branchId,
        'currentStock': currentStock,
        'reorderLevel': reorderLevel,
        'status': status.value,
        'category': category,
        'price': price,
        'updatedAt': ?updatedAt,
      };

  InventoryItem copyWith({
    String? id,
    String? productId,
    String? productName,
    String? branchId,
    int? currentStock,
    int? reorderLevel,
    StockStatus? status,
    List<String>? category,
    double? price,
    String? updatedAt,
  }) {
    return InventoryItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      branchId: branchId ?? this.branchId,
      currentStock: currentStock ?? this.currentStock,
      reorderLevel: reorderLevel ?? this.reorderLevel,
      status: status ?? this.status,
      category: category ?? this.category,
      price: price ?? this.price,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Inventory movement record for auditing stock changes.
class InventoryMovement {
  final String id;
  final String inventoryId;
  final String productId;
  final String productName;
  final String branchId;
  final int changeQuantity;
  final int balanceAfter;
  final MovementType type;
  final String? reason;
  final String createdAt;
  final String? staffName;

  const InventoryMovement({
    required this.id,
    required this.inventoryId,
    required this.productId,
    required this.productName,
    required this.branchId,
    required this.changeQuantity,
    required this.balanceAfter,
    required this.type,
    this.reason,
    required this.createdAt,
    this.staffName,
  });

  factory InventoryMovement.fromJson(Map<String, dynamic> json) {
    return InventoryMovement(
      id: json['id'] as String? ?? '',
      inventoryId: json['inventoryId'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? json['itemName'] as String? ?? '',
      branchId: json['branchId'] as String? ?? '',
      changeQuantity: (json['changeQuantity'] as num?)?.toInt() ?? 0,
      balanceAfter: (json['balanceAfter'] as num?)?.toInt() ?? 0,
      type: MovementType.fromString(json['type'] as String?),
      reason: json['reason'] as String?,
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      staffName: json['staffName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'inventoryId': inventoryId,
        'productId': productId,
        'productName': productName,
        'branchId': branchId,
        'changeQuantity': changeQuantity,
        'balanceAfter': balanceAfter,
        'type': type.value,
        'reason': ?reason,
        'createdAt': createdAt,
        'staffName': ?staffName,
      };
}
