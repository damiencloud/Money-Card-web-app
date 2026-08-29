import 'package:money_card_staff/core/config/app_config.dart';
import 'package:money_card_staff/widgets/states/app_unauthorized_state.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/providers/permission_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/features/pos/pos_checkout_screen.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/product.dart';
import 'package:money_card_staff/providers/pos_cart_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/product_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeProductRepository implements ProductRepository {
  List<Product> products = const [
    Product(
      id: 'p-1',
      branchId: 'b-1',
      itemName: 'Veg Burger',
      category: ['Veg', 'Fast Food'],
      price: 120.0,
    ),
    Product(
      id: 'p-2',
      branchId: 'b-1',
      itemName: 'Cold Coffee',
      category: ['Beverage', 'Sweet'],
      price: 60.0,
    ),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<Product>> getProducts({required String branchId, String? status, String? category, int? page, int? limit}) async {
    return products;
  }
}

class FakeSessionRepository implements SessionRepository {
  double currentBalance = 300.0;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<CardSession> getSessionById(String id) async {
    return CardSession(
      id: id,
      cardId: 'card-1',
      branchId: 'b-1',
      status: SessionStatus.active,
      balance: currentBalance,
      startedAt: '2026-08-14T10:00:00Z',
    );
  }

  @override
  Future<PurchaseResult> purchase({required String sessionId, required List<Map<String, dynamic>> items}) async {
    double total = 0;
    for (final i in items) {
      if (i['productId'] == 'p-1') total += 120.0 * (i['quantity'] as int);
      if (i['productId'] == 'p-2') total += 60.0 * (i['quantity'] as int);
    }

    if (currentBalance < total) {
      throw const ApiException(
        code: ApiErrorCode.insufficientBalance,
        message: 'Insufficient card balance.',
        statusCode: 422,
      );
    }

    currentBalance -= total;
    return PurchaseResult(
      transactionId: 'tx-101',
      amount: total,
      balance: currentBalance,
      status: 'SUCCESS',
    );
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('POS Catalog, Cart & Purchase Tests', () {
    late FakeProductRepository fakeProductRepo;
    late FakeSessionRepository fakeSessionRepo;

    setUp(() {
      fakeProductRepo = FakeProductRepository();
      fakeSessionRepo = FakeSessionRepository();
    });

    test('PosCatalogNotifier filters products by category', () async {
      final notifier = PosCatalogNotifier(fakeProductRepo, 'b-1');
      await notifier.loadProducts();

      expect(notifier.state.products.length, 2);

      notifier.setCategoryFilter('Veg');
      expect(notifier.state.filteredProducts.length, 1);
      expect(notifier.state.filteredProducts.first.itemName, 'Veg Burger');

      notifier.setCategoryFilter('Beverage');
      expect(notifier.state.filteredProducts.length, 1);
      expect(notifier.state.filteredProducts.first.itemName, 'Cold Coffee');
    });

    test('PosCartNotifier manages items, quantities, and calculates totals correctly', () {
      final notifier = PosCartNotifier(fakeSessionRepo);
      const prod1 = Product(id: 'p-1', branchId: 'b-1', itemName: 'Veg Burger', price: 120.0);
      const prod2 = Product(id: 'p-2', branchId: 'b-1', itemName: 'Cold Coffee', price: 60.0);

      notifier.addToCart(prod1);
      notifier.addToCart(prod2);
      expect(notifier.state.totalItemCount, 2);
      expect(notifier.state.totalAmount, 180.0);

      // Increase quantity
      notifier.increaseQuantity('p-1');
      expect(notifier.state.totalItemCount, 3);
      expect(notifier.state.totalAmount, 300.0);

      // Decrease quantity
      notifier.decreaseQuantity('p-1');
      expect(notifier.state.totalItemCount, 2);
      expect(notifier.state.totalAmount, 180.0);

      // Remove item
      notifier.removeItem('p-2');
      expect(notifier.state.totalItemCount, 1);
      expect(notifier.state.totalAmount, 120.0);

      // Clear cart
      notifier.clearCart();
      expect(notifier.state.isEmpty, isTrue);
    });

    test('PosCartNotifier executes purchase and deducts balance', () async {
      final notifier = PosCartNotifier(fakeSessionRepo);
      const prod1 = Product(id: 'p-1', branchId: 'b-1', itemName: 'Veg Burger', price: 120.0);

      notifier.addToCart(prod1);
      final result = await notifier.executePurchase('sess-1');

      expect(result, isNotNull);
      expect(result?.amount, 120.0);
      expect(result?.balance, 180.0);
      expect(result?.status, 'SUCCESS');
    });

    test('PosCartNotifier handles insufficient balance error gracefully', () async {
      fakeSessionRepo.currentBalance = 50.0; // Balance less than 120
      final notifier = PosCartNotifier(fakeSessionRepo);
      const prod1 = Product(id: 'p-1', branchId: 'b-1', itemName: 'Veg Burger', price: 120.0);

      notifier.addToCart(prod1);
      final result = await notifier.executePurchase('sess-1');

      expect(result, isNull);
      expect(notifier.state.errorMessage, 'Insufficient card balance.');
    });

    testWidgets('PosCheckoutScreen renders catalog and adds item to cart when staff has PURCHASE permission', (tester) async {
      final catalogNotifier = PosCatalogNotifier(fakeProductRepo, 'b-1');
      await catalogNotifier.loadProducts();

      final cartNotifier = PosCartNotifier(fakeSessionRepo);
      final sessionNotifier = SessionDetailsNotifier(fakeSessionRepo);
      await sessionNotifier.loadSessionById('sess-1');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userPermissionsProvider.overrideWithValue([AppPermission.purchase, AppPermission.productView]),
            posCatalogNotifierProvider.overrideWith((ref) => catalogNotifier),
            posCartNotifierProvider.overrideWith((ref) => cartNotifier),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'sess-1'),
          ),
        ),
      );

      expect(find.text('Veg Burger'), findsOneWidget);
      expect(find.text('Cold Coffee'), findsOneWidget);
      expect(find.text('Add'), findsNWidgets(2));

      // Tap Add on Veg Burger
      await tester.tap(find.text('Add').first);
      await tester.pumpAndSettle();

      expect(find.text('View Cart (1)'), findsOneWidget);
    });

    testWidgets('PosCheckoutScreen renders AppUnauthorizedState when staff lacks PURCHASE permission', (tester) async {
      final catalogNotifier = PosCatalogNotifier(fakeProductRepo, 'b-1');
      final cartNotifier = PosCartNotifier(fakeSessionRepo);
      final sessionNotifier = SessionDetailsNotifier(fakeSessionRepo);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userPermissionsProvider.overrideWithValue([AppPermission.cardView]), // No PURCHASE permission
            posCatalogNotifierProvider.overrideWith((ref) => catalogNotifier),
            posCartNotifierProvider.overrideWith((ref) => cartNotifier),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'sess-1'),
          ),
        ),
      );

      expect(find.text('Veg Burger'), findsNothing);
      expect(find.byType(AppUnauthorizedState), findsOneWidget);
      expect(find.text('Access Restricted'), findsOneWidget);
    });
  });
}
