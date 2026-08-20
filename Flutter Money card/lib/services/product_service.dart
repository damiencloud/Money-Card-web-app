import '../core/constants/api_endpoints.dart';
import '../models/product.dart';
import 'api_service.dart';

class ProductService {
  final ApiService _apiService;

  ProductService(this._apiService);

  /// List active products for a branch (GET /api/v1/products)
  Future<List<Product>> getProducts({
    required String branchId,
    String? status,
    String? category,
    int? page,
    int? limit,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': branchId,
      'status': ?status,
      if (category != null && category.isNotEmpty) 'category': category,
      'page': ?page,
      'limit': ?limit,
    };

    return _apiService.get<List<Product>>(
      ApiEndpoints.products,
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => Product.fromJson(item as Map<String, dynamic>))
              .toList();
        } else if (data is Map<String, dynamic> && data['items'] is List) {
          return (data['items'] as List)
              .map((item) => Product.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }

  /// Get product details by ID (GET /api/v1/products/:id)
  Future<Product> getProductById(String id) async {
    return _apiService.get<Product>(
      ApiEndpoints.productById(id),
      fromJson: (data) => Product.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Create a new product (POST /api/v1/products)
  Future<Product> createProduct({
    required String branchId,
    required String itemName,
    required List<String> category,
    required double price,
    String status = 'ACTIVE',
  }) async {
    return _apiService.post<Product>(
      ApiEndpoints.products,
      data: {
        'branchId': branchId,
        'itemName': itemName,
        'category': category,
        'price': price,
        'status': status,
      },
      fromJson: (data) => Product.fromJson(data as Map<String, dynamic>),
    );
  }
}
