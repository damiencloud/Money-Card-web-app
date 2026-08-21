import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/network/dio_client.dart';
import 'package:money_card_staff/core/network/interceptors/mock_api_interceptor.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/features/pos/pos_scan_purchase_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/repositories/card_repository.dart';
import 'package:money_card_staff/repositories/product_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/card_service.dart';
import 'package:money_card_staff/services/product_service.dart';
import 'package:money_card_staff/services/session_service.dart';
import 'package:money_card_staff/widgets/scanner/qr_scanner_view.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const mockBranch = Branch(
    id: 'branch-001',
    organizationId: 'org-demo-001',
    name: 'Main Cafeteria',
    status: 'ACTIVE',
  );

  const mockFullStaffUser = AuthUser(
    id: 'user-001',
    email: 'staff@example.com',
    name: 'Alex Morgan',
    role: 'STAFF',
    organizationId: 'org-demo-001',
    assignedBranchIds: ['branch-001'],
    permissions: [
      AppPermission.purchase,
      AppPermission.recharge,
      AppPermission.cardView,
      AppPermission.cardIssue,
      AppPermission.cardReturn,
      AppPermission.refund,
      AppPermission.sessionView,
      AppPermission.productView,
    ],
  );

  const mockLimitedStaffUser = AuthUser(
    id: 'user-002',
    email: 'limited@example.com',
    name: 'Sam Limited',
    role: 'STAFF',
    organizationId: 'org-demo-001',
    assignedBranchIds: ['branch-001'],
    permissions: [
      AppPermission.cardView,
      AppPermission.purchase, // only purchase, no recharge, no sessionView, no refund
    ],
  );

  late CardRepository cardRepository;
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
    cardRepository = CardRepository(CardService(apiService));
    sessionRepository = SessionRepository(SessionService(apiService));
    productRepository = ProductRepository(ProductService(apiService));
  });

  group('Active Card Action Hub & Scan QR Workflow Tests', () {
    testWidgets('Scanning QR-MOCK-001 (ACTIVE card) opens Action Hub with all authorized actions', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockFullStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Initial scanner view is present
      expect(find.text('Scan QR Card'), findsOneWidget);

      // Simulate scanning QR-MOCK-001
      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-MOCK-001');
      await tester.pumpAndSettle();

      // Verify Active Card Action Hub is opened
      expect(find.text('Card: MC-001'), findsWidgets);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.textContaining('Balance: ₹750.00'), findsOneWidget);
      expect(find.text('Session Active'), findsOneWidget);

      // Verify all authorized action tiles are present
      expect(find.text('Add Products (POS Sale)'), findsOneWidget);
      expect(find.text('Recharge Card'), findsOneWidget);
      expect(find.text('View Session Details'), findsOneWidget);
      expect(find.text('Transactions History'), findsOneWidget);
      expect(find.text('Settle / Return Card'), findsOneWidget);

      // Test Transactions Bottom Sheet
      await tester.tap(find.text('Transactions History'));
      await tester.pumpAndSettle();

      expect(find.text('Session Transactions (MC-001)'), findsOneWidget);
      expect(find.text('Live Available Funds'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      // Test Settle / Return Card
      await tester.tap(find.text('Settle / Return Card'));
      await tester.pumpAndSettle();

      // Confirm dialog appears with refund calculation
      expect(find.text('Confirm Card Return & Settlement'), findsOneWidget);
      expect(find.textContaining('Refund remaining balance of ₹750.00'), findsOneWidget);

      // Confirm settlement
      await tester.tap(find.text('Confirm & Settle'));
      await tester.pumpAndSettle();

      // Action Hub transitions to Card Returned Successfully state
      expect(find.text('Card Returned Successfully'), findsOneWidget);
      expect(find.text('Refunded Amount:'), findsOneWidget);
      expect(find.text('₹750.00'), findsOneWidget);
      expect(find.text('AVAILABLE'), findsOneWidget);
      expect(find.text('SETTLED'), findsOneWidget);
      expect(find.text('Scan Another Card'), findsOneWidget);
    });

    testWidgets('Action Hub enforces granular Staff permissions (hides unauthorized actions)', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockLimitedStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Simulate scanning QR-MOCK-001
      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-MOCK-001');
      await tester.pumpAndSettle();

      // Staff has PURCHASE permission -> Add Products is visible
      expect(find.text('Add Products (POS Sale)'), findsOneWidget);

      // Staff lacks RECHARGE, SESSION_VIEW, and REFUND permissions -> They are NOT shown
      expect(find.text('Recharge Card'), findsNothing);
      expect(find.text('View Session Details'), findsNothing);
      expect(find.text('Transactions History'), findsNothing);
      expect(find.text('Settle / Return Card'), findsNothing);
    });

    testWidgets('Scanning QR-MOCK-004 (AVAILABLE card with no session) shows Issue Card option', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockFullStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Simulate scanning QR-MOCK-004
      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-MOCK-004');
      await tester.pumpAndSettle();

      // Verify available card warning state
      expect(find.text('MC-004'), findsOneWidget);
      expect(find.text('AVAILABLE'), findsOneWidget);
      expect(find.text('Card has no active session.'), findsOneWidget);
      expect(find.text('Issue Card Session First'), findsOneWidget);
      expect(find.text('Scan Another Card'), findsOneWidget);
    });

    testWidgets('Scanning QR-MOCK-003 (BLOCKED card) displays blocked state and prevents operations', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockFullStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Simulate scanning QR-MOCK-003
      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-MOCK-003');
      await tester.pumpAndSettle();

      // Verify blocked state
      expect(find.text('MC-003'), findsOneWidget);
      expect(find.text('BLOCKED'), findsOneWidget);
      expect(find.textContaining('Cannot perform operations on a blocked card'), findsOneWidget);
      expect(find.text('Scan Another'), findsOneWidget);
    });

    testWidgets('Scanning unregistered QR displays error state with Cancel and Scan Another', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockFullStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Simulate scanning unregistered QR
      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-UNKNOWN-999');
      await tester.pumpAndSettle();

      // Verify unregistered error state
      expect(find.text('Card Not Registered'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Scan Another'), findsOneWidget);

      // Pressing Scan Another resets scanner
      await tester.tap(find.text('Scan Another'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('Scan QR Card'), findsOneWidget);
    });

    testWidgets('Compact Card Summary renders correctly without overflow on 320px narrow Android screen', (tester) async {
      tester.view.physicalSize = const Size(320.0, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockFullStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-MOCK-001');
      await tester.pumpAndSettle();

      // Verify Compact Summary elements
      expect(find.text('MC-001'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.textContaining('Balance: ₹750.00'), findsOneWidget);
      expect(find.text('Session Active'), findsOneWidget);

      // Verify prominent action buttons are visible immediately below it
      expect(find.text('Add Products (POS Sale)'), findsOneWidget);
      expect(find.text('Recharge Card'), findsOneWidget);
      expect(find.text('Settle / Return Card'), findsOneWidget);
    });

    testWidgets('Compact Card Summary renders correctly on 412px standard Android screen', (tester) async {
      tester.view.physicalSize = const Size(412.0, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockFullStaffUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            cardRepositoryProvider.overrideWithValue(cardRepository),
            sessionRepositoryProvider.overrideWithValue(sessionRepository),
            productRepositoryProvider.overrideWithValue(productRepository),
          ],
          child: const MaterialApp(
            home: PosScanPurchaseScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      final scanner = tester.widget<QrScannerView>(find.byType(QrScannerView));
      scanner.onQrScanned('QR-MOCK-001');
      await tester.pumpAndSettle();

      // Verify Compact Summary elements
      expect(find.text('MC-001'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.textContaining('Balance: ₹750.00'), findsOneWidget);
      expect(find.text('Session Active'), findsOneWidget);

      expect(find.text('Add Products (POS Sale)'), findsOneWidget);
      expect(find.text('Recharge Card'), findsOneWidget);
      expect(find.text('Settle / Return Card'), findsOneWidget);
    });
  });
}
