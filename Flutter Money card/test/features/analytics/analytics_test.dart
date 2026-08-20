import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/features/analytics/analytics_screen.dart';
import 'package:money_card_staff/models/analytics.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/providers/analytics_provider.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/repositories/analytics_repository.dart';

class FakeAnalyticsRepository implements AnalyticsRepository {
  BranchPerformanceMetric metric = const BranchPerformanceMetric(
    branchId: 'b-1',
    branchName: 'Main Cafeteria',
    transactionCount: 148,
    purchaseCount: 96,
    purchaseVolume: 18450.0,
    rechargeCount: 52,
    rechargeVolume: 24800.0,
    totalRevenue: 43250.0,
    activeSessionsCount: 12,
    settledSessionsCount: 84,
    avgTransactionValue: 292.23,
    avgPurchaseValue: 192.19,
    inventoryItemCount: 10,
    lowStockItemCount: 2,
    productDemand: [
      ProductDemand(
        productId: 'p-1',
        productName: 'Veg Burger',
        quantitySold: 42,
        totalRevenue: 5040.0,
      ),
    ],
    peakPeriods: [
      PeakPeriod(
        timeSlot: '12:00 PM – 1:00 PM',
        activityLevel: 'Highest',
        transactionCount: 54,
        purchaseVolume: 7200.0,
      ),
    ],
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<BranchPerformanceMetric> getBranchAnalytics({required String branchId, String? range}) async {
    return metric;
  }
}

void main() {
  group('Staff Analytics Unit & Widget Tests', () {
    late FakeAnalyticsRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeAnalyticsRepository();
    });

    test('AnalyticsNotifier loads branch metrics and changes date range', () async {
      final notifier = AnalyticsNotifier(fakeRepo, 'b-1');
      await notifier.loadAnalytics();

      expect(notifier.state.analytics, isNotNull);
      expect(notifier.state.analytics?.totalRevenue, 43250.0);
      expect(notifier.state.analytics?.transactionCount, 148);

      notifier.setRange('This Month');
      expect(notifier.state.selectedRange, 'This Month');
    });

    testWidgets('AnalyticsScreen enforces permission guard and displays metrics without limits', (tester) async {
      const authorizedUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.viewAnalytics],
        assignedBranchIds: ['b-1'],
      );

      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
      );

      final analyticsNotifier = AnalyticsNotifier(fakeRepo, 'b-1');
      await analyticsNotifier.loadAnalytics();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(authorizedUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            analyticsNotifierProvider.overrideWith((ref) => analyticsNotifier),
          ],
          child: const MaterialApp(
            home: AnalyticsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('₹43250.00'), findsOneWidget);
      expect(find.text('148'), findsOneWidget); // Total transactions

      // Scroll to Product Demand & Peak periods
      await tester.scrollUntilVisible(
        find.text('Veg Burger'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Veg Burger'), findsOneWidget); // Product demand

      await tester.scrollUntilVisible(
        find.text('12:00 PM – 1:00 PM'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('12:00 PM – 1:00 PM'), findsOneWidget); // Peak period
      expect(find.text('Highest'), findsOneWidget);

      // Verify NO transaction limits or quotas exist
      expect(find.textContaining(RegExp(r'limit', caseSensitive: false)), findsNothing);
      expect(find.textContaining(RegExp(r'quota', caseSensitive: false)), findsNothing);
    });

    testWidgets('AnalyticsScreen displays unauthorized state when VIEW_ANALYTICS is missing', (tester) async {
      const unauthorizedUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.cardView], // Missing viewAnalytics
        assignedBranchIds: ['b-1'],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(unauthorizedUser),
          ],
          child: const MaterialApp(
            home: AnalyticsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Access Restricted'), findsOneWidget);
    });
  });
}
