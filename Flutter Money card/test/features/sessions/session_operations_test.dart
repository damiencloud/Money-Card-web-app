import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/features/sessions/session_details_screen.dart';
import 'package:money_card_staff/features/sessions/sessions_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/permission_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeSessionRepository implements SessionRepository {
  List<CardSession> sessions = [
    const CardSession(
      id: 'session-101',
      cardId: 'card-101',
      physicalCardNumber: 'MC-101',
      branchId: 'branch-001',
      status: SessionStatus.active,
      balance: 350.0,
      startedAt: '2026-08-17T09:30:00Z',
    ),
    const CardSession(
      id: 'session-102',
      cardId: 'card-102',
      physicalCardNumber: 'MC-102',
      branchId: 'branch-001',
      status: SessionStatus.active,
      balance: 150.0,
      startedAt: '2026-08-17T10:00:00Z',
    ),
    const CardSession(
      id: 'session-001',
      cardId: 'CARD001',
      physicalCardNumber: 'MC-001',
      branchId: 'branch-001',
      status: SessionStatus.settled,
      balance: 0.0,
      startedAt: '2026-08-16T10:00:00Z',
      settledAt: '2026-08-16T12:00:00Z',
    ),
  ];

  bool shouldThrowError = false;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<CardSession> createSession({required String cardId, required String branchId}) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Network connection failed',
      );
    }
    final newSession = CardSession(
      id: 'session-${sessions.length + 1}',
      cardId: cardId,
      branchId: branchId,
      status: SessionStatus.active,
      balance: 0.0,
      startedAt: DateTime.now().toIso8601String(),
    );
    sessions.add(newSession);
    return newSession;
  }

  @override
  Future<CardSession> getSessionById(String id) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Network connection failed',
      );
    }
    return sessions.firstWhere(
      (s) => s.id == id,
      orElse: () => throw const ApiException(
        code: ApiErrorCode.notFound,
        message: 'Session not found',
        statusCode: 404,
      ),
    );
  }

  @override
  Future<List<CardSession>> listSessions({
    String? branchId,
    String? status,
    int? page,
    int? limit,
  }) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Network connection failed',
      );
    }
    var result = List<CardSession>.from(sessions);
    if (branchId != null) {
      result = result.where((s) => s.branchId == branchId).toList();
    }
    if (status != null && status != 'ALL') {
      result = result.where((s) => s.status.value == status).toList();
    }
    return result;
  }

  @override
  Future<SessionReturnResult> returnSession(String sessionId) async {
    final idx = sessions.indexWhere((s) => s.id == sessionId);
    final current = sessions[idx];
    final refunded = current.balance;
    sessions[idx] = current.copyWith(status: SessionStatus.settled, balance: 0.0);
    return SessionReturnResult(
      sessionId: sessionId,
      refundedAmount: refunded,
      sessionStatus: 'SETTLED',
      cardStatus: 'AVAILABLE',
    );
  }
}

void main() {
  group('Session Operations Unit & Widget Tests', () {
    late FakeSessionRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeSessionRepository();
    });

    test('SessionListNotifier loads only active sessions by default and filters by search', () async {
      final notifier = SessionListNotifier(fakeRepo, 'branch-001');
      await notifier.loadSessions();

      expect(notifier.state.sessions.length, 2);
      expect(notifier.state.filteredSessions.length, 2);
      expect(notifier.state.filteredSessions.first.physicalCardNumber, 'MC-101');
      expect(notifier.state.filteredSessions.first.balance, 350.0);

      // Search filter by card number
      notifier.setSearchQuery('MC-102');
      expect(notifier.state.filteredSessions.length, 1);
      expect(notifier.state.filteredSessions.first.id, 'session-102');

      // Status filter ALL
      notifier.setStatusFilter('ALL');
      await notifier.loadSessions();
      expect(notifier.state.sessions.length, 3);
    });

    test('SessionDetailsNotifier creates and settles session', () async {
      final notifier = SessionDetailsNotifier(fakeRepo);

      final newSession = await notifier.createSession(cardId: 'CARD002', branchId: 'branch-001');
      expect(newSession, isNotNull);
      expect(newSession?.balance, 0.0);
      expect(notifier.state.session?.id, newSession?.id);

      final returnRes = await notifier.returnSession('session-101');
      expect(returnRes, isNotNull);
      expect(returnRes?.refundedAmount, 350.0);
      expect(returnRes?.sessionStatus, 'SETTLED');
    });

    testWidgets('SessionsScreen renders Active sessions with card info, balance, and permitted actions', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const mockUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-demo-001',
        permissions: [AppPermission.recharge, AppPermission.purchase, AppPermission.cardReturn],
        assignedBranchIds: ['branch-001'],
      );

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final sessionListNotifier = SessionListNotifier(fakeRepo, 'branch-001');
      await sessionListNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            sessionListNotifierProvider.overrideWith((ref) => sessionListNotifier),
          ],
          child: const MaterialApp(
            home: SessionsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Screen Title & Active Segment
      expect(find.text('Card Sessions'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Branch: Main Cafeteria'), findsNWidgets(3)); // Header + 2 session cards

      // Verify Active Sessions Rendered with Card Identifier & Balance
      expect(find.text('Card MC-101'), findsOneWidget);
      expect(find.text('₹350.00'), findsOneWidget);
      expect(find.text('Card MC-102'), findsOneWidget);
      expect(find.text('₹150.00'), findsOneWidget);
      expect(find.text('ACTIVE'), findsNWidgets(2));

      // Verify Contextual Action Buttons permitted for Staff
      expect(find.text('Recharge'), findsNWidgets(2));
      expect(find.text('POS'), findsNWidgets(2));
      expect(find.text('Return'), findsNWidgets(2));
    });

    testWidgets('SessionsScreen renders Empty State when no active sessions exist', (tester) async {
      fakeRepo.sessions = [];

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final sessionListNotifier = SessionListNotifier(fakeRepo, 'branch-001');
      await sessionListNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionListNotifierProvider.overrideWith((ref) => sessionListNotifier),
          ],
          child: const MaterialApp(
            home: SessionsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No Active Sessions'), findsOneWidget);
      expect(find.text('There are currently no active cafeteria card sessions in Main Cafeteria.'), findsOneWidget);
    });

    testWidgets('SessionsScreen renders Error State on network failure with Retry action', (tester) async {
      fakeRepo.shouldThrowError = true;

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final sessionListNotifier = SessionListNotifier(fakeRepo, 'branch-001');
      await sessionListNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionListNotifierProvider.overrideWith((ref) => sessionListNotifier),
          ],
          child: const MaterialApp(
            home: SessionsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Unable to Load Sessions'), findsOneWidget);
      expect(find.text('Network connection failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('SessionDetailsScreen renders balance and operation actions', (tester) async {
      const mockUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-demo-001',
        permissions: [AppPermission.purchase, AppPermission.cardReturn],
        assignedBranchIds: ['branch-001'],
      );

      const mockBranch = Branch(
        id: 'branch-001',
        organizationId: 'org-demo-001',
        name: 'Main Cafeteria',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      await sessionNotifier.loadSessionById('session-101');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: SessionDetailsScreen(sessionId: 'session-101'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('₹350.00'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);
      expect(find.text('New POS Purchase'), findsOneWidget);
      expect(find.text('Return & Settle Card'), findsOneWidget);
    });
  });
}
