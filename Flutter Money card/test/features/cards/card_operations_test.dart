import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/features/cards/card_details_screen.dart';
import 'package:money_card_staff/features/cards/cards_screen.dart';
import 'package:money_card_staff/features/cards/issue_card_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/card_operations_provider.dart';
import 'package:money_card_staff/repositories/card_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeCardRepository implements CardRepository {
  List<Card> cards = [
    const Card(
      id: 'CARD001',
      organizationId: 'org-demo-001',
      qrToken: 'QR-MC-001',
      physicalCardNumber: 'MC-001',
      status: CardStatus.available,
      currentBranchId: 'branch-001',
    ),
    const Card(
      id: 'CARD002',
      organizationId: 'org-demo-001',
      qrToken: 'QR-MC-002',
      physicalCardNumber: 'MC-002',
      status: CardStatus.available,
      currentBranchId: 'branch-001',
    ),
    const Card(
      id: 'CARD003',
      organizationId: 'org-demo-001',
      qrToken: 'QR-MC-003',
      physicalCardNumber: 'MC-003',
      status: CardStatus.blocked,
      currentBranchId: 'branch-001',
    ),
    const Card(
      id: 'card-101',
      organizationId: 'org-demo-001',
      qrToken: 'qr-mock-token-101',
      physicalCardNumber: 'MC-101',
      status: CardStatus.active,
      currentBranchId: 'branch-001',
    ),
    const Card(
      id: 'card-other-999',
      organizationId: 'org-other-002',
      qrToken: 'QR-OTHER-999',
      physicalCardNumber: 'MC-OTHER-999',
      status: CardStatus.available,
      currentBranchId: 'branch-003',
    ),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<ResolveQrResponseData> resolveCardByQr(String qrToken) async {
    if (qrToken == 'UNKNOWN-QR-TOKEN') {
      throw const ApiException(
        code: ApiErrorCode.notFound,
        message: 'Card not registered',
        statusCode: 404,
      );
    }
    if (qrToken == 'QR-OTHER-999') {
      throw const ApiException(
        code: ApiErrorCode.forbidden,
        message: 'Access denied: Card belongs to another organization',
        statusCode: 403,
      );
    }
    final card = cards.firstWhere(
      (c) => c.qrToken == qrToken || c.physicalCardNumber == qrToken || c.id == qrToken,
      orElse: () => throw const ApiException(
        code: ApiErrorCode.notFound,
        message: 'Card not registered',
        statusCode: 404,
      ),
    );
    return ResolveQrResponseData(card: card);
  }

  @override
  Future<List<Card>> getCards({
    String? branchId,
    String? status,
    String? search,
    int? page,
    int? limit,
  }) async {
    var result = cards.where((c) => c.organizationId == 'org-demo-001').toList();
    if (branchId != null) {
      result = result.where((c) => c.currentBranchId == branchId || c.currentBranchId == null).toList();
    }
    if (status != null && status != 'ALL') {
      result = result.where((c) => c.status.value == status).toList();
    }
    if (search != null && search.isNotEmpty) {
      result = result.where((c) =>
          c.physicalCardNumber.toLowerCase().contains(search.toLowerCase()) ||
          c.id.toLowerCase().contains(search.toLowerCase())).toList();
    }
    return result;
  }

  @override
  Future<Card> getCardById(String id) async {
    return cards.firstWhere(
      (c) => c.id == id || c.physicalCardNumber == id,
      orElse: () => throw const ApiException(
        code: ApiErrorCode.notFound,
        message: 'Card not found',
        statusCode: 404,
      ),
    );
  }

  @override
  Future<Card> issueCard({required String physicalCardNumber, required String branchId}) async {
    final newCard = Card(
      id: 'CARD-${cards.length + 1}',
      organizationId: 'org-demo-001',
      qrToken: 'QR-$physicalCardNumber',
      physicalCardNumber: physicalCardNumber,
      status: CardStatus.available,
      currentBranchId: branchId,
    );
    cards.add(newCard);
    return newCard;
  }

  @override
  Future<Card> blockCard({required String id, required String reason}) async {
    final idx = cards.indexWhere((c) => c.id == id);
    final updated = cards[idx].copyWith(status: CardStatus.blocked);
    cards[idx] = updated;
    return updated;
  }

  @override
  Future<Card> unblockCard(String id) async {
    final idx = cards.indexWhere((c) => c.id == id);
    final updated = cards[idx].copyWith(status: CardStatus.available);
    cards[idx] = updated;
    return updated;
  }
}

class FakeSessionRepository implements SessionRepository {
  List<CardSession> sessions = [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<CardSession> createSession({
    required String cardId,
    required String branchId,
    String? customerName,
    String? customerPhone,
    double initialAmount = 0,
    String paymentMethod = 'CASH',
  }) async {
    final session = CardSession(
      id: 'session-${sessions.length + 1}',
      cardId: cardId,
      branchId: branchId,
      status: SessionStatus.active,
      balance: 0.0,
      startedAt: '2026-08-17T10:00:00Z',
    );
    sessions.insert(0, session);
    return session;
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Card Operations Unit & Widget Tests', () {
    late FakeCardRepository fakeCardRepo;
    late FakeSessionRepository fakeSessionRepo;

    setUp(() {
      fakeCardRepo = FakeCardRepository();
      fakeSessionRepo = FakeSessionRepository();
    });

    test('CardListNotifier loads only authorized org cards and filters by status', () async {
      final notifier = CardListNotifier(fakeCardRepo, 'branch-001');
      await notifier.loadCards();

      // Org-demo-001 has 4 cards in branch-001 (excluding other-org card)
      expect(notifier.state.cards.length, 4);

      notifier.setStatusFilter('AVAILABLE');
      await notifier.loadCards();
      expect(notifier.state.cards.length, 2);
      expect(notifier.state.cards.map((c) => c.physicalCardNumber), containsAll(['MC-001', 'MC-002']));
    });

    test('AvailableCardsNotifier loads and filters available cards for branch', () async {
      final notifier = AvailableCardsNotifier(fakeCardRepo, 'branch-001');
      await notifier.loadAvailableCards();

      expect(notifier.state.availableCards.length, 2);
      expect(notifier.state.filteredCards.length, 2);

      notifier.setSearchQuery('MC-001');
      expect(notifier.state.filteredCards.length, 1);
      expect(notifier.state.filteredCards.first.physicalCardNumber, 'MC-001');
    });

    test('CardDetailsNotifier resolves QR and rejects unregistered QR with 404 without creating card', () async {
      final notifier = CardDetailsNotifier(fakeCardRepo, fakeSessionRepo);

      // Resolve valid card
      final validSuccess = await notifier.resolveCardByQr('QR-MC-001');
      expect(validSuccess, isTrue);
      expect(notifier.state.card?.physicalCardNumber, 'MC-001');
      expect(notifier.state.card?.status, CardStatus.available);

      // Resolve unknown QR -> must reject with Card not registered and NOT create any card
      final initialCount = fakeCardRepo.cards.length;
      final unknownSuccess = await notifier.resolveCardByQr('UNKNOWN-QR-TOKEN');
      expect(unknownSuccess, isFalse);
      expect(notifier.state.errorMessage, 'Card not registered');
      expect(fakeCardRepo.cards.length, initialCount); // No card auto-created!
    });

    test('CardDetailsNotifier enforces organization isolation on QR scan', () async {
      final notifier = CardDetailsNotifier(fakeCardRepo, fakeSessionRepo);

      final otherOrgSuccess = await notifier.resolveCardByQr('QR-OTHER-999');
      expect(otherOrgSuccess, isFalse);
      expect(notifier.state.errorMessage, contains('Access denied'));
    });

    test('CardDetailsNotifier issues available card and transitions to ACTIVE with balance 0', () async {
      final notifier = CardDetailsNotifier(fakeCardRepo, fakeSessionRepo);
      await notifier.loadCardById('CARD001');

      expect(notifier.state.card?.status, CardStatus.available);

      final session = await notifier.issueCardSession(cardId: 'CARD001', branchId: 'branch-001');
      expect(session, isNotNull);
      expect(session?.balance, 0.0);
      expect(session?.status, SessionStatus.active);
      expect(notifier.state.card?.status, CardStatus.active);
    });

    testWidgets('CardsScreen renders search and status filters for available cards', (tester) async {
      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final listNotifier = CardListNotifier(fakeCardRepo, 'branch-001');
      await listNotifier.loadCards();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            cardListNotifierProvider.overrideWith((ref) => listNotifier),
          ],
          child: const MaterialApp(
            home: CardsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Branch Cards'), findsOneWidget);
      expect(find.text('MC-001'), findsOneWidget);
      expect(find.text('MC-002'), findsOneWidget);
      expect(find.text('MC-003'), findsOneWidget);
      expect(find.text('MC-101'), findsOneWidget);
    });

    testWidgets('IssueCardScreen renders Available Cards manual selection and executes issue', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final availableNotifier = AvailableCardsNotifier(fakeCardRepo, 'branch-001');
      await availableNotifier.loadAvailableCards();

      final detailsNotifier = CardDetailsNotifier(fakeCardRepo, fakeSessionRepo);
      final listNotifier = CardListNotifier(fakeCardRepo, 'branch-001');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            availableCardsNotifierProvider.overrideWith((ref) => availableNotifier),
            cardDetailsNotifierProvider.overrideWith((ref) => detailsNotifier),
            cardListNotifierProvider.overrideWith((ref) => listNotifier),
          ],
          child: const MaterialApp(
            home: IssueCardScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Issue New Card'), findsOneWidget);
      expect(find.text('Available Cards'), findsOneWidget);
      expect(find.text('Scan Card QR'), findsOneWidget);

      // Available cards list shows MC-001 and MC-002
      expect(find.text('MC-001'), findsOneWidget);
      expect(find.text('MC-002'), findsOneWidget);
      expect(find.text('AVAILABLE'), findsNWidgets(2));

      // Tap Issue button on first card (MC-001)
      await tester.tap(find.widgetWithText(ElevatedButton, 'Issue').first);
      await tester.pumpAndSettle();

      // Confirm dialog appears
      expect(find.text('Confirm Card Issuance'), findsOneWidget);
      expect(find.text('Main Cafeteria'), findsOneWidget);
      expect(find.text('Branch: Main Cafeteria'), findsOneWidget);
      expect(find.text('₹0.00'), findsOneWidget);

      // Tap Confirm & Issue in dialog
      await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm & Issue'));
      await tester.pumpAndSettle();

      // Session was created with balance 0
      expect(fakeSessionRepo.sessions.length, 1);
      expect(fakeSessionRepo.sessions.first.cardId, 'CARD001');
      expect(fakeSessionRepo.sessions.first.balance, 0.0);
    });

    testWidgets('CardDetailsScreen renders Available card with Start Session action', (tester) async {
      const mockUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-demo-001',
        permissions: [AppPermission.cardIssue, AppPermission.cardBlock],
        assignedBranchIds: ['branch-001'],
      );

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final detailsNotifier = CardDetailsNotifier(fakeCardRepo, fakeSessionRepo);
      await detailsNotifier.loadCardById('CARD001');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            cardDetailsNotifierProvider.overrideWith((ref) => detailsNotifier),
          ],
          child: const MaterialApp(
            home: CardDetailsScreen(cardId: 'CARD001'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Card MC-001'), findsOneWidget);
      expect(find.text('AVAILABLE'), findsOneWidget);
      expect(find.text('Start Active Session'), findsOneWidget);

      // Tap Start Active Session
      await tester.tap(find.text('Start Active Session'));
      await tester.pumpAndSettle();

      // Confirm activation in dialog
      expect(find.text('Confirm Card Activation'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm & Activate'));
      await tester.pumpAndSettle();

      expect(find.text('Active session created successfully!'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.text('₹0.00'), findsOneWidget);
    });
    testWidgets('CardDetailsScreen allows Staff to Block and Unblock card with state synchronization', (tester) async {
      const mockUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-demo-001',
        permissions: [AppPermission.cardIssue, AppPermission.cardBlock, AppPermission.cardUnblock],
        assignedBranchIds: ['branch-001'],
      );

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final detailsNotifier = CardDetailsNotifier(fakeCardRepo, fakeSessionRepo);
      await detailsNotifier.loadCardById('CARD001');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            cardDetailsNotifierProvider.overrideWith((ref) => detailsNotifier),
          ],
          child: const MaterialApp(
            home: CardDetailsScreen(cardId: 'CARD001'),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Block Card'), findsOneWidget);

      // Staff taps Block Card
      await tester.tap(find.text('Block Card'));
      await tester.pumpAndSettle();

      expect(find.text('Are you sure you want to block this card? It will be disabled for purchases.'), findsOneWidget);
      expect(find.text('Blocked By (Default):'), findsOneWidget);
      expect(find.text('Alex Morgan (STAFF - Main Cafeteria)'), findsOneWidget);
      expect(find.text('Primary Reason:'), findsOneWidget);
      expect(find.text('Additional Reason / Notes (Optional):'), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Block'));
      await tester.pumpAndSettle();

      // Card status becomes BLOCKED
      expect(find.text('BLOCKED'), findsWidgets);
      expect(detailsNotifier.state.card?.status, CardStatus.blocked);
      expect(find.text('Unblock Card'), findsOneWidget);

      // Staff taps Unblock Card
      await tester.tap(find.text('Unblock Card'));
      await tester.pumpAndSettle();

      expect(find.text('Unblocking this card will make it available for transactions again.'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Unblock'));
      await tester.pumpAndSettle();

      // Card returns to AVAILABLE/ACTIVE
      expect(detailsNotifier.state.card?.status, CardStatus.available);
      expect(find.text('AVAILABLE'), findsWidgets);
    });
  });
}