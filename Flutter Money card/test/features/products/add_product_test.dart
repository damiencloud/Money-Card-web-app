import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/features/products/products_screen.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/product.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/pos_cart_provider.dart';
import 'package:money_card_staff/repositories/product_repository.dart';

class FakeProductRepository implements ProductRepository {
  List<Product> products = [
    const Product(
      id: 'prod-001',
      branchId: 'branch-001',
      itemName: 'Veg Rice',
      category: ['Veg', 'Main Course', 'Rice'],
      price: 80.0,
      status: 'ACTIVE',
    ),
    const Product(
      id: 'prod-002',
      branchId: 'branch-001',
      itemName: 'Chicken Curry',
      category: ['Non-Veg', 'Main Course', 'Curry'],
      price: 120.0,
      status: 'ACTIVE',
    ),
  ];

  bool shouldThrowError = false;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<Product>> getProducts({
    required String branchId,
    String? status,
    String? category,
    int? page,
    int? limit,
  }) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Network connection failed',
      );
    }
    var result = products.where((p) => p.branchId == branchId).toList();
    if (status != null && status != 'ALL') {
      result = result.where((p) => p.status == status).toList();
    }
    if (category != null && category.isNotEmpty && category.toLowerCase() != 'all') {
      result = result.where((p) =>
          p.category.any((c) => c.toLowerCase() == category.toLowerCase())).toList();
    }
    return result;
  }

  @override
  Future<Product> getProductById(String id) async {
    return products.firstWhere((p) => p.id == id);
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Products & Menu View-Only Catalog Tests', () {
    late FakeProductRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeProductRepository();
    });

    testWidgets('ProductsScreen displays catalog items, search, and category filters without product creation', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final catalogNotifier = PosCatalogNotifier(fakeRepo, 'branch-001');
      await catalogNotifier.loadProducts();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            productRepositoryProvider.overrideWithValue(fakeRepo),
            posCatalogNotifierProvider.overrideWith((ref) => catalogNotifier),
          ],
          child: const MaterialApp(
            home: ProductsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Products Screen Content
      expect(find.text('Products & Menu'), findsOneWidget);
      expect(find.text('Branch: Main Cafeteria'), findsOneWidget);
      expect(find.text('Veg Rice'), findsOneWidget);
      expect(find.text('Chicken Curry'), findsOneWidget);
      expect(find.text('₹80.00'), findsOneWidget);
      expect(find.text('₹120.00'), findsOneWidget);

      // Verify NO "+ Add Product" buttons exist
      expect(find.text('Add Product'), findsNothing);
      expect(find.byType(FloatingActionButton), findsNothing);

      // Test Search
      await tester.enterText(find.byType(TextField), 'Chicken');
      await tester.pumpAndSettle();

      expect(find.text('Chicken Curry'), findsOneWidget);
      expect(find.text('Veg Rice'), findsNothing);

      // Clear Search
      await tester.enterText(find.byType(TextField), '');
      await tester.pumpAndSettle();

      expect(find.text('Veg Rice'), findsOneWidget);
      expect(find.text('Chicken Curry'), findsOneWidget);
    });
  });
}
