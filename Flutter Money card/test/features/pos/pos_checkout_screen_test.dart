import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/network/dio_client.dart';
import 'package:money_card_staff/core/network/interceptors/mock_api_interceptor.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/features/pos/pos_checkout_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/repositories/product_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/product_service.dart';
import 'package:money_card_staff/services/session_service.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  TestWidgetsFlutterBinding.ensureInitialized();

  const mockBranch = Branch(
    id: 'branch-001',
    organizationId: 'org-demo-001',
    name: 'Main Cafeteria',
    status: 'ACTIVE',
  );

  const mockUser = AuthUser(
    id: 'user-001',
    email: 'staff@example.com',
    name: 'Alex Morgan',
    role: 'STAFF',
    organizationId: 'org-demo-001',
    assignedBranchIds: ['branch-001'],
    permissions: [AppPermission.purchase],
  );

  late SessionRepository sessionRepository;
  late ProductRepository productRepository;

  setUp(() {
    MockApiInterceptor.resetMockData();
    final tokenStorage = InMemoryTokenStorage();
    final dioClient = DioClient.create(
      tokenStorage: tokenStorage,
      useMockApi: true,
    );
    final apiService = ApiService(dioClient.dio);
    sessionRepository = SessionRepository(SessionService(apiService));
    productRepository = ProductRepository(ProductService(apiService));
  });

  group('PosCheckoutScreen Search & Category Filtering Tests', () {
    testWidgets('Prominent search bar renders with placeholder "Search food or products"', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'session-001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Search food or products'), findsOneWidget);
      expect(find.byIcon(Icons.search), findsOneWidget);
    });

    testWidgets('Searching "burger" filters and displays all burger items', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'session-001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Search for "burger"
      await tester.enterText(find.widgetWithText(TextField, 'Search food or products'), 'burger');
      await tester.pumpAndSettle();

      expect(find.text('Veg Burger'), findsOneWidget);
      expect(find.text('Chicken Burger'), findsOneWidget);
      expect(find.text('Cheese Burger'), findsOneWidget);
      expect(find.text('Fresh Juice'), findsNothing);
      expect(find.text('French Fries'), findsNothing);
    });

    testWidgets('Searching "rice" filters and displays rice items', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'session-001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Search for "rice"
      await tester.enterText(find.widgetWithText(TextField, 'Search food or products'), 'rice');
      await tester.pumpAndSettle();

      expect(find.text('Chicken Rice'), findsOneWidget);
      expect(find.text('Veg Fried Rice'), findsOneWidget);
      expect(find.text('Veg Burger'), findsNothing);
    });

    testWidgets('Searching "xyz" shows "No products found" without error', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'session-001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextField, 'Search food or products'), 'xyz');
      await tester.pumpAndSettle();

      expect(find.text('No products found'), findsOneWidget);
      expect(find.text('No food items match your search or filter.'), findsOneWidget);
    });

    testWidgets('Search combined with Category filter displays only matching category items', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'session-001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Search "burger"
      await tester.enterText(find.widgetWithText(TextField, 'Search food or products'), 'burger');
      await tester.pumpAndSettle();

      // Select "Veg" category
      await tester.tap(find.widgetWithText(ChoiceChip, 'Veg'));
      await tester.pumpAndSettle();

      // Veg Burger and Cheese Burger appear; Chicken Burger is excluded
      expect(find.text('Veg Burger'), findsOneWidget);
      expect(find.text('Cheese Burger'), findsOneWidget);
      expect(find.text('Chicken Burger'), findsNothing);
    });

    testWidgets('Cart persists across search query and category changes', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosCheckoutScreen(sessionId: 'session-001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Search "burger" and add Veg Burger to cart
      await tester.enterText(find.widgetWithText(TextField, 'Search food or products'), 'Veg Burger');
      await tester.pumpAndSettle();

      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();

      // Floating cart bar shows 1 item
      expect(find.text('1 items selected'), findsOneWidget);
      expect(find.text('₹120.00'), findsWidgets);

      // Now change search to "juice"
      await tester.enterText(find.widgetWithText(TextField, 'Search food or products'), 'juice');
      await tester.pumpAndSettle();

      // Fresh Juice appears
      expect(find.text('Fresh Juice'), findsOneWidget);

      // Floating cart bar STILL holds 1 item (Veg Burger)
      expect(find.text('1 items selected'), findsOneWidget);

      // Clear search with clear icon
      await tester.tap(find.byIcon(Icons.clear));
      await tester.pumpAndSettle();

      // Full catalog restored, cart still intact
      expect(find.text('1 items selected'), findsOneWidget);
    });
  });
}
