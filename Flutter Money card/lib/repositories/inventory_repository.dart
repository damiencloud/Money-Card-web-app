import '../models/inventory.dart';
import '../services/inventory_service.dart';

class InventoryRepository {
  final InventoryService _inventoryService;

  InventoryRepository(this._inventoryService);

  Future<List<InventoryItem>> getInventory({
    required String branchId,
    String? search,
    String? status,
    int? page,
    int? limit,
  }) async {
    return _inventoryService.getInventory(
      branchId: branchId,
      search: search,
      status: status,
      page: page,
      limit: limit,
    );
  }

  Future<InventoryItem> adjustStock({
    required String inventoryId,
    required int adjustment,
    String? reason,
  }) async {
    return _inventoryService.adjustStock(
      inventoryId: inventoryId,
      adjustment: adjustment,
      reason: reason,
    );
  }

  Future<List<InventoryMovement>> getInventoryMovements({
    required String branchId,
    String? inventoryId,
    int? limit,
  }) async {
    return _inventoryService.getInventoryMovements(
      branchId: branchId,
      inventoryId: inventoryId,
      limit: limit,
    );
  }
}
