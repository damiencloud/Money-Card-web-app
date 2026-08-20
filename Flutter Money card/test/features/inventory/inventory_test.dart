import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/features/inventory/inventory_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/inventory.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/inventory_provider.dart';
import 'package:money_card_staff/repositories/inventory_repository.dart';

class FakeInventoryRepository implements InventoryRepository {
  List<InventoryItem> items = [
    const InventoryItem(
      id: 'inv-1',
      productId: 'p-1',
      productName: 'Veg Burger',
      branchId: 'b-1',
      currentStock: 42,
      reorderLevel: 10,
      status: StockStatus.inStock,
    ),
    const InventoryItem(
      id: 'inv-2',
      productId: 'p-2',
      productName: 'Paneer Roll',
      branchId: 'b-1',
      currentStock: 8,
      reorderLevel: 10,
      status: StockStatus.lowStock,
    ),
  ];

  List<InventoryMovement> movements = [
    const InventoryMovement(
      id: 'mov-1',
      inventoryId: 'inv-1',
      productId: 'p-1',
      productName: 'Veg Burger',
      branchId: 'b-1',
      changeQuantity: 20,
      balanceAfter: 42,
      type: MovementType.restock,
      reason: 'Weekly delivery',
      createdAt: '2026-08-14T08:00:00Z',
    ),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<InventoryItem>> getInventory({
    required String branchId,
    String? search,
    String? status,
    int? page,
    int? limit,
  }) async {
    var result = List<InventoryItem>.from(items);
    if (search != null && search.isNotEmpty) {
      result = result.where((i) => i.productName.toLowerCase().contains(search.toLowerCase())).toList();
    }
    if (status != null && status != 'ALL') {
      result = result.where((i) => i.status.value == status).toList();
    }
    return result;
  }

  @override
  Future<InventoryItem> adjustStock({
    required String inventoryId,
    required int adjustment,
    String? reason,
  }) async {
    final idx = items.indexWhere((i) => i.id == inventoryId);
    final current = items[idx];
    final newStock = (current.currentStock + adjustment).clamp(0, 99999);
    final updated = current.copyWith(
      currentStock: newStock,
      status: newStock <= 0 ? StockStatus.outOfStock : newStock <= current.reorderLevel ? StockStatus.lowStock : StockStatus.inStock,
    );
    items[idx] = updated;

    movements.insert(
      0,
      InventoryMovement(
        id: 'mov-${movements.length + 1}',
        inventoryId: inventoryId,
        productId: current.productId,
        productName: current.productName,
        branchId: current.branchId,
        changeQuantity: adjustment,
        balanceAfter: newStock,
        type: adjustment >= 0 ? MovementType.restock : MovementType.manualAdjustment,
        reason: reason,
        createdAt: DateTime.now().toIso8601String(),
      ),
    );

    return updated;
  }

  @override
  Future<List<InventoryMovement>> getInventoryMovements({
    required String branchId,
    String? inventoryId,
    int? limit,
  }) async {
    return movements;
  }
}

void main() {
  group('Inventory Operations Unit & Widget Tests', () {
    late FakeInventoryRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeInventoryRepository();
    });

    test('InventoryNotifier loads, searches, and adjusts stock', () async {
      final notifier = InventoryNotifier(fakeRepo, 'b-1');
      await notifier.loadInventory();

      expect(notifier.state.items.length, 2);

      // Status filter
      notifier.setStatusFilter('LOW_STOCK');
      expect(notifier.state.filteredItems.length, 1);
      expect(notifier.state.filteredItems.first.productName, 'Paneer Roll');

      // Adjust Stock (+10 on Paneer Roll)
      final success = await notifier.adjustStock(
        inventoryId: 'inv-2',
        adjustment: 10,
        reason: 'Restock',
      );
      expect(success, isTrue);

      final updated = notifier.state.items.firstWhere((i) => i.id == 'inv-2');
      expect(updated.currentStock, 18);
      expect(updated.status, StockStatus.inStock);
    });

    testWidgets('InventoryScreen renders stock items and adjusts quantity', (tester) async {
      const mockUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.inventoryView, AppPermission.inventoryManage],
        assignedBranchIds: ['b-1'],
      );

      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
      );

      final inventoryNotifier = InventoryNotifier(fakeRepo, 'b-1');
      await inventoryNotifier.loadInventory();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            inventoryNotifierProvider.overrideWith((ref) => inventoryNotifier),
          ],
          child: const MaterialApp(
            home: InventoryScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Veg Burger'), findsOneWidget);
      expect(find.text('Paneer Roll'), findsOneWidget);
      expect(find.text('Stock: 42 units'), findsOneWidget);
      expect(find.text('LOW STOCK'), findsOneWidget);

      // Tap Adjust Stock icon button on first item
      await tester.tap(find.byTooltip('Adjust Stock').first);
      await tester.pumpAndSettle();

      // Bottom sheet renders
      expect(find.text('Adjust Stock'), findsOneWidget);
      expect(find.text('+5'), findsOneWidget);

      // Tap +5
      await tester.tap(find.text('+5'));
      await tester.pumpAndSettle();

      expect(find.text('47 units'), findsOneWidget);

      // Confirm Adjustment
      await tester.tap(find.text('Confirm Adjustment'));
      await tester.pumpAndSettle();

      expect(find.text('Stock updated to 47 units.'), findsOneWidget);
    });
  });
}
