import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/features/home/home_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/permission_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeSessionRepository implements SessionRepository {
  List<CardSession> sessions = [];
  bool shouldThrowError = false;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

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
        message: 'Failed to connect to session server',
      );
    }
    var result = branchId != null ? sessions.where((s) => s.branchId == branchId).toList() : sessions;
    if (status != null && status.isNotEmpty && status != 'ALL') {
      result = result.where((s) => s.status.value.toUpperCase() == status.toUpperCase()).toList();
    }
    return result;
  }

  @override
  Future<CardSession> getSessionById(String id) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Failed to connect to session server',
      );
    }
    return sessions.firstWhere((s) => s.id == id);
  }

  @override
  Future<CardSession> createSession({
    required String cardId,
    required String branchId,
  }) async {
    final newSession = CardSession(
      id: 'session-${DateTime.now().millisecondsSinceEpoch}',
      cardId: cardId,
      physicalCardNumber: cardId,
      branchId: branchId,
      status: SessionStatus.active,
      balance: 0.0,
      startedAt: DateTime.now().toIso8601String(),
    );
    sessions.insert(0, newSession);
    return newSession;
  }

  @override
  Future<SessionReturnResult> returnSession(String sessionId) async {
    final idx = sessions.indexWhere((s) => s.id == sessionId);
    if (idx != -1) {
      final old = sessions[idx];
      final updated = CardSession(
        id: old.id,
        cardId: old.cardId,
        physicalCardNumber: old.physicalCardNumber,
        branchId: old.branchId,
        status: SessionStatus.settled,
        balance: 0.0,
        startedAt: old.startedAt,
        settledAt: DateTime.now().toIso8601String(),
      );
      sessions[idx] = updated;
      return SessionReturnResult(
        sessionId: old.id,
        refundedAmount: old.balance,
        sessionStatus: 'SETTLED',
        cardStatus: 'AVAILABLE',
      );
    }
    throw const ApiException(code: ApiErrorCode.notFound, message: 'Session not found');
  }
}

void main() {
  group('HomeScreen Active Sessions Dashboard Tests', () {
    late FakeSessionRepository fakeSessionRepo;

    const mockUser = AuthUser(
      id: 'staff-1',
      email: 'staff@moneycard.io',
      name: 'Alex Morgan',
      role: 'STAFF',
      organizationId: 'org-demo-001',
      permissions: [
        AppPermission.cardIssue,
        AppPermission.recharge,
        AppPermission.purchase,
        AppPermission.sessionView,
      ],
      assignedBranchIds: ['branch-001'],
    );

    const mockBranch = Branch(
      id: 'branch-001',
      organizationId: 'org-demo-001',
      name: 'Main Cafeteria',
    );

    setUp(() {
      fakeSessionRepo = FakeSessionRepository();
    });

    testWidgets('HomeScreen derives exact count of ACTIVE sessions and excludes SETTLED sessions', (tester) async {
      // Seed: 2 ACTIVE sessions and 2 SETTLED sessions
      fakeSessionRepo.sessions = [
        CardSession(
          id: 'sess-001',
          cardId: 'card-101',
          physicalCardNumber: 'MC-101',
          branchId: 'branch-001',
          status: SessionStatus.active,
          balance: 350.0,
          startedAt: DateTime.now().toIso8601String(),
        ),
        CardSession(
          id: 'sess-002',
          cardId: 'card-102',
          physicalCardNumber: 'MC-102',
          branchId: 'branch-001',
          status: SessionStatus.active,
          balance: 120.0,
          startedAt: DateTime.now().toIso8601String(),
        ),
        CardSession(
          id: 'sess-003',
          cardId: 'card-103',
          physicalCardNumber: 'MC-103',
          branchId: 'branch-001',
          status: SessionStatus.settled,
          balance: 0.0,
          startedAt: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
          settledAt: DateTime.now().subtract(const Duration(hours: 10)).toIso8601String(),
        ),
        CardSession(
          id: 'sess-004',
          cardId: 'card-104',
          physicalCardNumber: 'MC-104',
          branchId: 'branch-001',
          status: SessionStatus.settled,
          balance: 0.0,
          startedAt: DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
          settledAt: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        ),
      ];

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Greeting and Branch info
      expect(find.text('Hello, Alex'), findsOneWidget);
      expect(find.text('Branch: Main Cafeteria'), findsOneWidget);

      // Verify Active Sessions Counter is EXACTLY 2 (Not 4!)
      expect(find.text('2'), findsOneWidget);
      expect(find.text('View All (2)'), findsOneWidget);

      // Verify only ACTIVE sessions are listed in the preview
      expect(find.text('Card: MC-101'), findsOneWidget);
      expect(find.text('Card: MC-102'), findsOneWidget);
      expect(find.text('₹350.00'), findsOneWidget);
      expect(find.text('₹120.00'), findsOneWidget);

      // Verify SETTLED sessions MC-103 and MC-104 are NOT listed
      expect(find.text('Card: MC-103'), findsNothing);
      expect(find.text('Card: MC-104'), findsNothing);
    });

    testWidgets('HomeScreen updates count in real-time when new session is created and when session is settled', (tester) async {
      fakeSessionRepo.sessions = [
        CardSession(
          id: 'sess-001',
          cardId: 'card-101',
          physicalCardNumber: 'MC-101',
          branchId: 'branch-001',
          status: SessionStatus.active,
          balance: 200.0,
          startedAt: DateTime.now().toIso8601String(),
        ),
      ];

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Initial active count = 1
      expect(find.text('1'), findsOneWidget);
      expect(find.text('Card: MC-101'), findsOneWidget);

      // 1. Create a new active session
      await fakeSessionRepo.createSession(cardId: 'MC-202', branchId: 'branch-001');
      await sessionNotifier.loadSessions();
      await tester.pumpAndSettle();

      // Active count increases to 2
      expect(find.text('2'), findsOneWidget);
      expect(find.text('Card: MC-202'), findsOneWidget);

      // 2. Return / Settle sess-001
      await fakeSessionRepo.returnSession('sess-001');
      await sessionNotifier.loadSessions();
      await tester.pumpAndSettle();

      // Active count decreases to 1
      expect(find.text('1'), findsOneWidget);
      expect(find.text('Card: MC-101'), findsNothing);
      expect(find.text('Card: MC-202'), findsOneWidget);
    });

    testWidgets('HomeScreen renders Empty State when branch has 0 active sessions', (tester) async {
      fakeSessionRepo.sessions = []; // No sessions

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Count is 0
      expect(find.text('0'), findsOneWidget);
      expect(find.text('No Active Sessions'), findsOneWidget);
      expect(find.text('There are no active customer sessions in this branch right now.'), findsOneWidget);
    });

    testWidgets('HomeScreen renders Error State when API fails without showing fake data', (tester) async {
      fakeSessionRepo.shouldThrowError = true;

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Error state displayed
      expect(find.text('Error'), findsOneWidget);
      expect(find.text('Failed to connect to session server'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('HomeScreen respects branch isolation and does not show sessions from other branches', (tester) async {
      fakeSessionRepo.sessions = [
        CardSession(
          id: 'sess-branch-1',
          cardId: 'card-101',
          physicalCardNumber: 'MC-BRANCH-1',
          branchId: 'branch-001',
          status: SessionStatus.active,
          balance: 100.0,
          startedAt: DateTime.now().toIso8601String(),
        ),
        CardSession(
          id: 'sess-branch-2',
          cardId: 'card-999',
          physicalCardNumber: 'MC-BRANCH-2',
          branchId: 'branch-999', // Another branch
          status: SessionStatus.active,
          balance: 500.0,
          startedAt: DateTime.now().toIso8601String(),
        ),
      ];

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Only branch-001 session is counted
      expect(find.text('1'), findsOneWidget);
      expect(find.text('Card: MC-BRANCH-1'), findsOneWidget);
      expect(find.text('Card: MC-BRANCH-2'), findsNothing);
    });
  });
}
