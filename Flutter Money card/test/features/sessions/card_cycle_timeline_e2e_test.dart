import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/features/sessions/session_details_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/transaction.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class InMemoryCycleSessionRepository implements SessionRepository {
  final Map<String, CardSession> _sessions = {};
  final Map<String, List<Transaction>> _sessionTransactions = {};

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  void seedCycle1(CardSession session, List<Transaction> transactions) {
    _sessions[session.id] = session.copyWith(transactions: transactions);
    _sessionTransactions[session.id] = transactions;
  }

  void seedCycle2(CardSession session, List<Transaction> transactions) {
    _sessions[session.id] = session.copyWith(transactions: transactions);
    _sessionTransactions[session.id] = transactions;
  }

  @override
  Future<CardSession> getSessionById(String id) async {
    final s = _sessions[id];
    if (s == null) {
      throw Exception('Session not found: $id');
    }
    return s.copyWith(transactions: _sessionTransactions[id] ?? []);
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Card 104 End-to-End Card Cycle & Scoped Timeline Tests', () {
    late InMemoryCycleSessionRepository fakeRepo;

    const mockStaff = AuthUser(
      id: 'staff-alex',
      email: 'alex@moneycard.io',
      name: 'Alex Morgan',
      role: 'STAFF',
      organizationId: 'org-demo-001',
      permissions: [AppPermission.purchase, AppPermission.recharge, AppPermission.cardReturn],
      assignedBranchIds: ['branch-001'],
    );

    const mockBranch = Branch(
      id: 'branch-001',
      organizationId: 'org-demo-001',
      name: 'Main Cafeteria',
    );

    setUp(() {
      fakeRepo = InMemoryCycleSessionRepository();
    });

    testWidgets('Card 104 Cycle 1: renders complete activity timeline with multi-recharge and itemized multi-product purchases', (tester) async {
      // 1. Setup Card 104 Cycle 1 Session
      // Initial state: Card issued, Recharged ₹500, Bought Chicken Roll × 2 & Veg Roll × 1 (-₹170), Recharged ₹300, Bought Burger × 1 (-₹100)
      // Balance progression: 0 -> +500 -> -170 (330) -> +300 (630) -> -100 (530)
      final cycle1Session = const CardSession(
        id: 'session-cycle-104-1',
        cardId: 'card-104',
        physicalCardNumber: 'MC-104',
        sessionCardNumber: 'MC-104_1',
        cycleNumber: 1,
        customerName: 'Rohan Sharma',
        customerPhone: '9876543210',
        branchId: 'branch-001',
        status: SessionStatus.active,
        balance: 530.0,
        startedAt: '2026-08-28T10:00:00Z',
      );

      final cycle1Transactions = [
        // Transaction 4: Purchase Burger x 1 (Newest first: 10:45 AM)
        const Transaction(
          id: 'tx-104-004',
          sessionId: 'session-cycle-104-1',
          branchId: 'branch-001',
          type: TransactionType.purchase,
          amount: 100.0,
          balanceBefore: 630.0,
          balanceAfter: 530.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.cardBalance,
          createdAt: '2026-08-28T10:45:00Z',
          items: [
            PurchaseItem(
              productId: 'prod-burger',
              itemName: 'Burger',
              quantity: 1,
              unitPrice: 100.0,
              totalAmount: 100.0,
            ),
          ],
        ),
        // Transaction 3: Recharge ₹300 via UPI (10:30 AM)
        const Transaction(
          id: 'tx-104-003',
          sessionId: 'session-cycle-104-1',
          branchId: 'branch-001',
          type: TransactionType.recharge,
          amount: 300.0,
          balanceBefore: 330.0,
          balanceAfter: 630.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.upi,
          createdAt: '2026-08-28T10:30:00Z',
        ),
        // Transaction 2: Purchase Chicken Roll x 2 and Veg Roll x 1 (10:15 AM)
        const Transaction(
          id: 'tx-104-002',
          sessionId: 'session-cycle-104-1',
          branchId: 'branch-001',
          type: TransactionType.purchase,
          amount: 170.0,
          balanceBefore: 500.0,
          balanceAfter: 330.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.cardBalance,
          createdAt: '2026-08-28T10:15:00Z',
          items: [
            PurchaseItem(
              productId: 'prod-chk-roll',
              itemName: 'Chicken Roll',
              quantity: 2,
              unitPrice: 60.0,
              totalAmount: 120.0,
            ),
            PurchaseItem(
              productId: 'prod-veg-roll',
              itemName: 'Veg Roll',
              quantity: 1,
              unitPrice: 50.0,
              totalAmount: 50.0,
            ),
          ],
        ),
        // Transaction 1: Recharge ₹500 via Cash (10:05 AM)
        const Transaction(
          id: 'tx-104-001',
          sessionId: 'session-cycle-104-1',
          branchId: 'branch-001',
          type: TransactionType.recharge,
          amount: 500.0,
          balanceBefore: 0.0,
          balanceAfter: 500.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.cash,
          createdAt: '2026-08-28T10:05:00Z',
        ),
      ];

      fakeRepo.seedCycle1(cycle1Session, cycle1Transactions);

      final notifier = SessionDetailsNotifier(fakeRepo);
      await notifier.loadSessionById('session-cycle-104-1');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockStaff),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => notifier),
          ],
          child: const MaterialApp(
            home: SessionDetailsScreen(sessionId: 'session-cycle-104-1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // 1. Verify Authoritative Live Balance
      expect(find.text('₹530.00'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.text('Card: MC-104'), findsOneWidget);
      expect(find.text('MC-104_1'), findsNothing);
      expect(find.textContaining('Customer: Rohan Sharma'), findsOneWidget);

      // 2. Verify Newest Purchase: Burger x 1
      await tester.scrollUntilVisible(find.text('Burger'), 100);
      expect(find.text('Burger'), findsOneWidget);
      expect(find.text('-₹100.00'), findsOneWidget);
      expect(find.text('Bal: ₹530.00'), findsOneWidget);

      // 3. Verify Recharge ₹300 UPI
      await tester.scrollUntilVisible(find.text('Wallet Recharge (UPI)'), 100);
      expect(find.text('Wallet Recharge (UPI)'), findsOneWidget);
      expect(find.text('+₹300.00'), findsOneWidget);
      expect(find.text('Bal: ₹630.00'), findsOneWidget);

      // 4. Scroll to verify Multi-Product Purchase: Chicken Roll x 2 & Veg Roll x 1
      await tester.scrollUntilVisible(find.text('Chicken Roll'), 100);
      expect(find.text('Chicken Roll'), findsOneWidget);
      expect(find.text('× 2'), findsOneWidget);
      expect(find.text('Veg Roll'), findsOneWidget);
      expect(find.text('-₹170.00'), findsOneWidget);
      expect(find.text('Bal: ₹330.00'), findsOneWidget);

      // 5. Scroll down to verify Cash Recharge ₹500 and Card Issuance event
      await tester.scrollUntilVisible(find.text('Wallet Recharge (Cash)'), 150);
      expect(find.text('Wallet Recharge (Cash)'), findsOneWidget);
      expect(find.text('+₹500.00'), findsOneWidget);
      expect(find.text('Bal: ₹500.00'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('Card Issued'), 150);
      expect(find.text('Card Issued'), findsOneWidget);
      expect(find.text('SESSION START'), findsOneWidget);
    });

    testWidgets('Card 104 Cycle 2 Isolation: When Card 104 is re-issued in Cycle 2, new session does NOT show Cycle 1 transactions', (tester) async {
      // Setup Card 104 Cycle 2 Session (Issued to Priya Patel, fresh session with only 1 new coffee purchase)
      final cycle2Session = const CardSession(
        id: 'session-cycle-104-2',
        cardId: 'card-104',
        physicalCardNumber: 'MC-104',
        sessionCardNumber: 'MC-104_2',
        cycleNumber: 2,
        customerName: 'Priya Patel',
        customerPhone: '9123456789',
        branchId: 'branch-001',
        status: SessionStatus.active,
        balance: 150.0,
        startedAt: '2026-08-28T14:00:00Z',
      );

      final cycle2Transactions = [
        const Transaction(
          id: 'tx-104-cycle2-002',
          sessionId: 'session-cycle-104-2',
          branchId: 'branch-001',
          type: TransactionType.purchase,
          amount: 50.0,
          balanceBefore: 200.0,
          balanceAfter: 150.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.cardBalance,
          createdAt: '2026-08-28T14:20:00Z',
          items: [
            PurchaseItem(
              productId: 'prod-cold-coffee',
              itemName: 'Cold Coffee',
              quantity: 1,
              unitPrice: 50.0,
              totalAmount: 50.0,
            ),
          ],
        ),
        const Transaction(
          id: 'tx-104-cycle2-001',
          sessionId: 'session-cycle-104-2',
          branchId: 'branch-001',
          type: TransactionType.recharge,
          amount: 200.0,
          balanceBefore: 0.0,
          balanceAfter: 200.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.upi,
          createdAt: '2026-08-28T14:05:00Z',
        ),
      ];

      fakeRepo.seedCycle2(cycle2Session, cycle2Transactions);

      final notifier = SessionDetailsNotifier(fakeRepo);
      await notifier.loadSessionById('session-cycle-104-2');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockStaff),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => notifier),
          ],
          child: const MaterialApp(
            home: SessionDetailsScreen(sessionId: 'session-cycle-104-2'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // 1. Verify Cycle 2 Live Balance and Customer
      expect(find.text('₹150.00'), findsOneWidget);
      expect(find.text('Card: MC-104'), findsOneWidget);
      expect(find.text('MC-104_2'), findsNothing);
      expect(find.textContaining('Customer: Priya Patel'), findsOneWidget);

      // 2. Verify Cycle 2 Activity
      expect(find.text('Cold Coffee'), findsOneWidget);
      expect(find.text('-₹50.00'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('Wallet Recharge (UPI)'), 150);
      expect(find.text('Wallet Recharge (UPI)'), findsOneWidget);
      expect(find.text('+₹200.00'), findsOneWidget);

      // 3. Verify Cycle 1 transactions do NOT leak into Cycle 2
      expect(find.text('Chicken Roll'), findsNothing);
      expect(find.text('Veg Roll'), findsNothing);
      expect(find.text('Burger'), findsNothing);
      expect(find.text('₹530.00'), findsNothing);
      expect(find.text('Rohan Sharma'), findsNothing);
    });
  });
}
