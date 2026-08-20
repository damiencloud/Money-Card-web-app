import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/features/payments/return_card_screen.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/return_card_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeReturnSessionRepository implements SessionRepository {
  CardSession session = const CardSession(
    id: 'sess-1',
    cardId: 'card-1',
    branchId: 'b-1',
    status: SessionStatus.active,
    balance: 320.0,
    startedAt: '2026-08-14T10:00:00Z',
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<CardSession> getSessionById(String id) async {
    return session;
  }

  @override
  Future<SessionReturnResult> returnSession(String sessionId) async {
    final refunded = session.balance;
    session = session.copyWith(status: SessionStatus.settled, balance: 0.0);
    return SessionReturnResult(
      sessionId: sessionId,
      refundedAmount: refunded,
      sessionStatus: 'SETTLED',
      cardStatus: 'AVAILABLE',
    );
  }
}

void main() {
  group('Return Card & Settlement Tests', () {
    late FakeReturnSessionRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeReturnSessionRepository();
    });

    test('ReturnCardNotifier executes session settlement and refund calculation', () async {
      final notifier = ReturnCardNotifier(fakeRepo);
      final result = await notifier.executeReturn('sess-1');

      expect(result, isNotNull);
      expect(result?.refundedAmount, 320.0);
      expect(result?.sessionStatus, 'SETTLED');
      expect(result?.cardStatus, 'AVAILABLE');
    });

    testWidgets('ReturnCardScreen renders balance and completes return workflow', (tester) async {
      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      await sessionNotifier.loadSessionById('sess-1');

      final returnNotifier = ReturnCardNotifier(fakeRepo);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            returnCardNotifierProvider.overrideWith((ref) => returnNotifier),
          ],
          child: const MaterialApp(
            home: ReturnCardScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('MC-101'), findsOneWidget);
      expect(find.text('₹320.00'), findsNWidgets(2)); // Remaining Balance & Refund
      expect(find.text('ACTIVE'), findsOneWidget);

      // Tap Confirm Return button
      await tester.tap(find.text('Confirm Return & Settle (₹320.00)'));
      await tester.pumpAndSettle();

      // Confirmation dialog opens
      expect(find.text('Confirm Card Return'), findsOneWidget);

      // Confirm in dialog
      await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm & Settle'));
      await tester.pumpAndSettle();

      // Return Success dialog renders
      expect(find.text('Card Returned Successfully'), findsOneWidget);
      expect(find.text('₹320.00'), findsWidgets);
      expect(find.text('Generate & View PDF'), findsOneWidget);
      expect(find.text('Download PDF'), findsOneWidget);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Done'), findsOneWidget);
    });
  });
}
