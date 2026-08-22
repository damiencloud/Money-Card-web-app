import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/models/analytics.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/inventory.dart';
import 'package:money_card_staff/models/card.dart' as model_card;
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/repositories/analytics_repository.dart';
import 'package:money_card_staff/repositories/inventory_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';
import 'package:money_card_staff/repositories/card_repository.dart';
import 'package:money_card_staff/routing/app_router.dart';

class FakeAnalyticsRepository implements AnalyticsRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<BranchPerformanceMetric> getBranchAnalytics({required String branchId, String? range}) async {
    return const BranchPerformanceMetric(
      branchId: 'branch-001',
      branchName: 'Main Cafeteria',
      transactionCount: 10,
      purchaseCount: 5,
      purchaseVolume: 500.0,
      rechargeCount: 5,
      rechargeVolume: 1000.0,
      totalRevenue: 1500.0,
      activeSessionsCount: 2,
      settledSessionsCount: 8,
      avgTransactionValue: 150.0,
      avgPurchaseValue: 100.0,
      inventoryItemCount: 4,
      lowStockItemCount: 0,
      productDemand: [],
      peakPeriods: [],
    );
  }
}

class FakeInventoryRepository implements InventoryRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<InventoryItem>> getInventory({required String branchId, String? search, String? status, int? page, int? limit}) async {
    return [];
  }

  @override
  Future<List<InventoryMovement>> getInventoryMovements({required String branchId, String? inventoryId, int? limit, int? page}) async {
    return [];
  }
}

class FakeSessionRepository implements SessionRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  @override
  Future<List<CardSession>> listSessions({String? branchId, String? status, int? page, int? limit}) async => [];

  @override
  Future<CardSession> getSessionById(String id) async => const CardSession(
    id: 's-1',
    cardId: 'c-1',
    branchId: 'b-1',
    status: SessionStatus.active,
    balance: 100.0,
    startedAt: '',
  );
}

class FakeCardRepository implements CardRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<model_card.Card>> getCards({String? branchId, String? status, String? search, int? page, int? limit}) async => [];
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const mockUser = AuthUser(
    id: 'user-001',
    email: 'staff@example.com',
    name: 'Alex Morgan',
    role: 'STAFF',
    organizationId: 'org-demo-001',
    assignedBranchIds: ['branch-001'],
    permissions: [
      AppPermission.viewAnalytics,
      AppPermission.viewReports,
      AppPermission.inventoryView,
      AppPermission.inventoryManage,
    ],
  );

  const mockBranch = Branch(
    id: 'branch-001',
    organizationId: 'org-demo-001',
    name: 'Main Cafeteria',
    status: 'ACTIVE',
  );

  group('Single Back Button & Navigation Integrity Tests', () {
    testWidgets('/app/analytics has exactly ONE AppBar and exactly ONE Back button', (tester) async {
      final container = ProviderContainer(
        overrides: [
          currentUserProvider.overrideWithValue(mockUser),
          currentBranchProvider.overrideWithValue(mockBranch),
          sessionRepositoryProvider.overrideWithValue(FakeSessionRepository()),
          cardRepositoryProvider.overrideWithValue(FakeCardRepository()),
          analyticsRepositoryProvider.overrideWithValue(FakeAnalyticsRepository()),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            routerConfig: router,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Navigate to /app/analytics
      router.push('/app/analytics');
      await tester.pumpAndSettle();

      // Verify exactly ONE AppBar exists on the screen
      expect(find.byType(AppBar), findsOneWidget);

      // Verify exactly ONE Back button exists
      final backButtons = find.byType(BackButton);
      expect(backButtons, findsOneWidget);

      // Tap back button and verify navigation back to caller
      await tester.tap(backButtons);
      await tester.pumpAndSettle();

      expect(find.text('Branch Analytics'), findsNothing);
    });

    testWidgets('/app/inventory has exactly ONE AppBar and exactly ONE Back button', (tester) async {
      final container = ProviderContainer(
        overrides: [
          currentUserProvider.overrideWithValue(mockUser),
          currentBranchProvider.overrideWithValue(mockBranch),
          sessionRepositoryProvider.overrideWithValue(FakeSessionRepository()),
          cardRepositoryProvider.overrideWithValue(FakeCardRepository()),
          inventoryRepositoryProvider.overrideWithValue(FakeInventoryRepository()),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            routerConfig: router,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Navigate to /app/inventory
      router.push('/app/inventory');
      await tester.pumpAndSettle();

      // Verify exactly ONE AppBar exists on the screen
      expect(find.byType(AppBar), findsOneWidget);

      // Verify exactly ONE Back button exists
      final backButtons = find.byType(BackButton);
      expect(backButtons, findsOneWidget);

      // Tap back button and verify navigation back to caller
      await tester.tap(backButtons);
      await tester.pumpAndSettle();

      expect(find.text('Branch Inventory'), findsNothing);
    });
  });
}
