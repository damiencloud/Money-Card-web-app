/// Product entity conforming to M0 V10 specification.
/// Note: Product.tags was explicitly removed in M0 V10; category is a multi-select String array.
class Product {
  final String id;
  final String branchId;
  final String itemName;
  final List<String> category;
  final double price;
  final String status; // 'ACTIVE' | 'INACTIVE'
  final String? createdAt;
  final String? updatedAt;

  const Product({
    required this.id,
    required this.branchId,
    required this.itemName,
    this.category = const [],
    required this.price,
    this.status = 'ACTIVE',
    this.createdAt,
    this.updatedAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    List<String> parsedCategories = [];
    if (json['category'] is List) {
      parsedCategories = (json['category'] as List<dynamic>)
          .map((e) => e.toString())
          .toList();
    } else if (json['categories'] is List) {
      parsedCategories = (json['categories'] as List<dynamic>)
          .map((e) => e.toString())
          .toList();
    } else if (json['category'] is String) {
      parsedCategories = [json['category'] as String];
    }

    return Product(
      id: json['id'] as String? ?? '',
      branchId: json['branchId'] as String? ?? json['branch_id'] as String? ?? '',
      itemName: json['itemName'] as String? ?? json['item_name'] as String? ?? '',
      category: parsedCategories,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'ACTIVE',
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
      updatedAt: json['updatedAt'] as String? ?? json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'branchId': branchId,
        'itemName': itemName,
        'category': category,
        'price': price,
        'status': status,
        if (createdAt != null) 'createdAt': createdAt,
        if (updatedAt != null) 'updatedAt': updatedAt,
      };
}

/// Inventory item conforming to M0 V10 specification.
class InventoryItem {
  final String id;
  final String branchId;
  final String productId;
  final int quantity;
  final String? updatedAt;

  const InventoryItem({
    required this.id,
    required this.branchId,
    required this.productId,
    required this.quantity,
    this.updatedAt,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['id'] as String? ?? '',
      branchId: json['branchId'] as String? ?? json['branch_id'] as String? ?? '',
      productId: json['productId'] as String? ?? json['product_id'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      updatedAt: json['updatedAt'] as String? ?? json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'branchId': branchId,
        'productId': productId,
        'quantity': quantity,
        if (updatedAt != null) 'updatedAt': updatedAt,
      };
}

/// Combined product and its active branch inventory quantity
class ProductWithInventory {
  final Product product;
  final int quantity;

  const ProductWithInventory({
    required this.product,
    required this.quantity,
  });

  factory ProductWithInventory.fromJson(Map<String, dynamic> json) {
    return ProductWithInventory(
      product: Product.fromJson(json),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    final map = product.toJson();
    map['quantity'] = quantity;
    return map;
  }
}
