import '../core/constants/api_endpoints.dart';
import '../models/inventory.dart';
import 'api_service.dart';

class InventoryService {
  final ApiService _apiService;

  InventoryService(this._apiService);

  /// List inventory items for branch with optional search and status filter (GET /api/v1/inventory)
  Future<List<InventoryItem>> getInventory({
    required String branchId,
    String? search,
    String? status,
    int? page,
    int? limit,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': branchId,
      if (search != null && search.isNotEmpty) 'search': search,
      'status': ?status,
      'page': ?page,
      'limit': ?limit,
    };

    return _apiService.get<List<InventoryItem>>(
      ApiEndpoints.inventory,
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => InventoryItem.fromJson(item as Map<String, dynamic>))
              .toList();
        } else if (data is Map<String, dynamic> && data['items'] is List) {
          return (data['items'] as List)
              .map((item) => InventoryItem.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }

  /// Adjust stock for an inventory item (POST /api/v1/inventory/:id/adjust)
  Future<InventoryItem> adjustStock({
    required String inventoryId,
    required int adjustment,
    String? reason,
  }) async {
    return _apiService.post<InventoryItem>(
      '${ApiEndpoints.inventory}/$inventoryId/adjust',
      data: {
        'adjustment': adjustment,
        'reason': ?reason,
      },
      fromJson: (data) => InventoryItem.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Fetch movement history for branch/inventory item (GET /api/v1/inventory/movements)
  Future<List<InventoryMovement>> getInventoryMovements({
    required String branchId,
    String? inventoryId,
    int? limit,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': branchId,
      'inventoryId': ?inventoryId,
      'limit': ?limit,
    };

    return _apiService.get<List<InventoryMovement>>(
      '${ApiEndpoints.inventory}/movements',
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => InventoryMovement.fromJson(item as Map<String, dynamic>))
              .toList();
        } else if (data is Map<String, dynamic> && data['items'] is List) {
          return (data['items'] as List)
              .map((item) => InventoryMovement.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }
}
