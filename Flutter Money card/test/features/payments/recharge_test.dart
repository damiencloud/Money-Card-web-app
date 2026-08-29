import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/features/payments/recharge_screen.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/transaction.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/recharge_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeRechargeSessionRepository implements SessionRepository {
  double currentBalance = 200.0;
  String? lastExternalReference;

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
  Future<RechargeResult> recharge({
    required String sessionId,
    required double amount,
    required PaymentMethod paymentMethod,
    String? externalReference,
  }) async {
    currentBalance += amount;
    lastExternalReference = externalReference;
    return RechargeResult(
      transactionId: 'tx-rec-1',
      amount: amount,
      balance: currentBalance,
      paymentMethod: paymentMethod,
      status: 'SUCCESS',
    );
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Staff Recharge Unit & Widget Tests', () {
    late FakeRechargeSessionRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeRechargeSessionRepository();
    });

    test('RechargeNotifier validates Cash and UPI workflows with reference', () async {
      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      final notifier = RechargeNotifier(fakeRepo, sessionNotifier);

      expect(notifier.state.paymentMethod, PaymentMethod.cash);
      expect(notifier.state.canSubmit, isFalse); // Amount is 0

      // Set Cash Amount
      notifier.setAmount(150.0);
      expect(notifier.state.canSubmit, isTrue);

      // Switch to UPI
      notifier.setPaymentMethod(PaymentMethod.upi);
      expect(notifier.state.canSubmit, isFalse); // Requires staff verification for UPI

      // Set Reference
      notifier.setPaymentReference('UTR-123456');
      expect(notifier.state.paymentReference, 'UTR-123456');
      expect(notifier.state.canSubmit, isFalse); // Still requires verification

      // Staff verifies
      notifier.setStaffVerified(true);
      expect(notifier.state.canSubmit, isTrue);

      // Execute Recharge
      final result = await notifier.executeRecharge('sess-1');
      expect(result, isNotNull);
      expect(result?.amount, 150.0);
      expect(result?.balance, 350.0);
      expect(result?.paymentMethod, PaymentMethod.upi);
      expect(fakeRepo.lastExternalReference, 'UTR-123456');
    });

    testWidgets('RechargeScreen renders Cash and UPI inputs and executes recharge', (tester) async {
      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
        upiId: 'canteen.main@icici',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      await sessionNotifier.loadSessionById('sess-1');

      final rechargeNotifier = RechargeNotifier(fakeRepo, sessionNotifier);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            rechargeNotifierProvider.overrideWith((ref) => rechargeNotifier),
          ],
          child: const MaterialApp(
            home: RechargeScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('MC-101'), findsOneWidget);
      expect(find.text('₹200.00'), findsOneWidget);
      expect(find.text('CASH'), findsOneWidget);
      expect(find.text('UPI'), findsOneWidget);

      // Tap quick amount +₹100
      await tester.tap(find.text('+₹100'));
      await tester.pumpAndSettle();

      expect(find.text('Expected New Balance:'), findsOneWidget);
      expect(find.text('₹300.00'), findsOneWidget);

      // Tap Confirm Recharge button
      await tester.tap(find.text('Confirm Recharge'));
      await tester.pumpAndSettle();

      // Confirmation dialog shows
      expect(find.text('Confirm Recharge'), findsNWidgets(2)); // Screen title + Dialog
      expect(find.text('+₹100.00'), findsOneWidget);

      // Tap Confirm in dialog
      await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm'));
      await tester.pumpAndSettle();

      // Success dialog renders
      expect(find.text('Recharge Successful'), findsOneWidget);
      expect(find.text('₹100.00'), findsWidgets);
      expect(find.text('₹300.00'), findsWidgets);
      expect(find.text('Generate & View PDF'), findsOneWidget);
      expect(find.text('Download PDF'), findsOneWidget);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Done'), findsOneWidget);
    });

    testWidgets('RechargeScreen executes manual UPI recharge flow', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      await sessionNotifier.loadSessionById('sess-1');

      final rechargeNotifier = RechargeNotifier(fakeRepo, sessionNotifier);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            rechargeNotifierProvider.overrideWith((ref) => rechargeNotifier),
          ],
          child: const MaterialApp(
            home: RechargeScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Select UPI
      await tester.tap(find.text('UPI'));
      await tester.pumpAndSettle();

      // Check UPI manual verification card is shown
      expect(find.text('UPI Payment Verification'), findsOneWidget);
      expect(find.text('Customer pays using the store\'s existing counter UPI QR code.'), findsOneWidget);

      // Tap quick amount +₹200
      await tester.tap(find.text('+₹200'));
      await tester.pumpAndSettle();

      // Enter optional reference in UPI verification card
      await tester.enterText(find.byType(TextField).first, 'UPI987654');
      await tester.pumpAndSettle();

      // Toggle verification checkbox
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();

      // Scroll ListView down to reveal Confirm Recharge button
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm Recharge'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Recharge'), findsWidgets);
      expect(find.text('+₹200.00'), findsOneWidget);
      expect(find.text('UPI (Manual Verification)'), findsOneWidget);
      expect(find.text('UPI987654'), findsWidgets);

      // Confirm dialog
      await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm'));
      await tester.pumpAndSettle();

      expect(find.text('Recharge Successful'), findsOneWidget);
      expect(find.text('₹200.00'), findsWidgets);
      expect(find.text('Generate & View PDF'), findsOneWidget);
      expect(find.text('Download PDF'), findsOneWidget);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Done'), findsOneWidget);
    });
  });
}
