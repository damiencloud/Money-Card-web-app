import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card.dart' as app_card;
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/repositories/branch_repository.dart';
import 'package:money_card_staff/repositories/card_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';
import 'package:money_card_staff/routing/app_router.dart';
import 'package:money_card_staff/features/cards/cards_screen.dart';

class FakeCardRepo extends Fake implements CardRepository {
  @override
  Future<List<app_card.Card>> getCards({
    String? branchId,
    String? status,
    String? search,
    int? page,
    int? limit,
  }) async {
    return [
      const app_card.Card(
        id: 'card_001',
        organizationId: 'org_001',
        qrToken: 'qtk_secret_12345678',
        physicalCardNumber: 'MC-101',
        status: app_card.CardStatus.active,
      ),
    ];
  }
}

class FakeBranchRepo extends Fake implements BranchRepository {
  @override
  Future<List<Branch>> getBranches({bool forceRefresh = false}) async {
    return const [
      Branch(id: 'b1', organizationId: 'org_001', name: 'Main Central Branch', status: 'ACTIVE'),
      Branch(id: 'b2', organizationId: 'org_001', name: 'North Wing Branch', status: 'ACTIVE'),
    ];
  }

  @override
  void clearCache() {}
}

class FakeSessionRepo extends Fake implements SessionRepository {
  @override
  Future<List<CardSession>> listSessions({String? branchId, String? status, int? page, int? limit}) async => [];

  @override
  Future<CardSession> getSessionById(String id) async => const CardSession(
        id: 'sess_123',
        cardId: 'card_001',
        physicalCardNumber: 'MC-101',
        branchId: 'b1',
        status: SessionStatus.active,
        balance: 150.0,
        startedAt: '2026-08-21T10:00:00Z',
      );
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Staff App UI & Routing Regression Tests', () {
    testWidgets('CardsScreen displays Card Number without exposing internal QR Token', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cardRepositoryProvider.overrideWithValue(FakeCardRepo()),
          ],
          child: const MaterialApp(
            home: CardsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Card Number must be visible
      expect(find.text('MC-101'), findsOneWidget);

      // Internal QR token must NOT be visible
      expect(find.textContaining('qtk_secret_12345678'), findsNothing);
      expect(find.textContaining('QR:'), findsNothing);
    });

    testWidgets('GoRouter successfully navigates to /app/return-card/:sessionId without GoException', (tester) async {
      final container = ProviderContainer(
        overrides: [
          sessionRepositoryProvider.overrideWithValue(FakeSessionRepo()),
          branchRepositoryProvider.overrideWithValue(FakeBranchRepo()),
        ],
      );

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

      // Navigate directly to /app/return-card/sess_123
      router.go('/app/return-card/sess_123?card=MC-101');
      await tester.pumpAndSettle();

      // Verify Return Card Screen is rendered
      expect(find.text('Return & Settle Card'), findsOneWidget);
    });

    test('Multi-Branch Staff can switch active branch seamlessly', () async {
      final notifier = BranchNotifier(FakeBranchRepo());

      // Assign two branches
      await notifier.loadAssignedBranches(['b1', 'b2']);

      expect(notifier.state.assignedBranches.length, 2);
      expect(notifier.state.currentBranch?.id, 'b1');

      // Switch to branch 2
      final branch2 = notifier.state.assignedBranches.firstWhere((b) => b.id == 'b2');
      notifier.selectBranch(branch2);

      expect(notifier.state.currentBranch?.id, 'b2');
      expect(notifier.state.currentBranch?.name, 'North Wing Branch');
    });
  });
}
