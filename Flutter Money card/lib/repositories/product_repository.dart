import '../models/product.dart';
import '../services/product_service.dart';

class ProductRepository {
  final ProductService _productService;

  ProductRepository(this._productService);

  Future<List<Product>> getProducts({
    required String branchId,
    String? status,
    String? category,
    int? page,
    int? limit,
  }) async {
    return _productService.getProducts(
      branchId: branchId,
      status: status,
      category: category,
      page: page,
      limit: limit,
    );
  }

  Future<Product> getProductById(String id) async {
    return _productService.getProductById(id);
  }

  Future<Product> createProduct({
    required String branchId,
    required String itemName,
    required List<String> category,
    required double price,
    String status = 'ACTIVE',
  }) async {
    return _productService.createProduct(
      branchId: branchId,
      itemName: itemName,
      category: category,
      price: price,
      status: status,
    );
  }
}
