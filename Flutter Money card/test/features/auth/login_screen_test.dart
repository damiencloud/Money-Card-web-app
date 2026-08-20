import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/features/auth/login_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/repositories/auth_repository.dart';

class FakeAuthRepository implements AuthRepository {
  bool shouldSucceed = true;
  String? errorMessage;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<AuthUser> login({required String email, required String password}) async {
    if (!shouldSucceed) {
      throw Exception(errorMessage ?? 'Login failed');
    }
    return const AuthUser(
      id: 'staff-1',
      email: 'staff@moneycard.io',
      name: 'Alex Morgan',
      role: 'STAFF',
      organizationId: 'org-1',
      permissions: [AppPermission.cardView],
      assignedBranchIds: ['branch-1'],
    );
  }

  @override
  Future<AuthUser?> getCurrentUser() async => null;

  @override
  Future<void> logout() async {}

  @override
  Future<bool> hasStoredSession() async => false;
}

class TestAuthNotifier extends AuthNotifier {
  TestAuthNotifier(super.authRepo, {AuthState? initialState}) {
    if (initialState != null) {
      state = initialState;
    }
  }

  @override
  Future<void> checkAuthStatus() async {
    // No-op in tests unless explicitly called
  }
}

void main() {
  group('LoginScreen Widget Tests', () {
    testWidgets('renders all login UI elements (Brand, Title, Email, Password, Button)', (tester) async {
      final fakeRepo = FakeAuthRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => TestAuthNotifier(fakeRepo)),
          ],
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      expect(find.text('MONEY CARD'), findsOneWidget);
      expect(find.text('Staff Login'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(2));
    });

    testWidgets('shows validation errors when fields are empty or email is invalid', (tester) async {
      final fakeRepo = FakeAuthRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => TestAuthNotifier(fakeRepo)),
          ],
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Clear fields
      await tester.enterText(find.byType(TextFormField).first, '');
      await tester.enterText(find.byType(TextFormField).last, '');
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);

      // Enter invalid email
      await tester.enterText(find.byType(TextFormField).first, 'invalid-email');
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();

      expect(find.text('Enter a valid email address'), findsOneWidget);
    });

    testWidgets('toggles password visibility', (tester) async {
      final fakeRepo = FakeAuthRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => TestAuthNotifier(fakeRepo)),
          ],
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      final editableTextsBefore = tester.widgetList<EditableText>(find.byType(EditableText));
      expect(editableTextsBefore.last.obscureText, isTrue);

      // Tap visibility toggle icon
      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      final editableTextsAfter = tester.widgetList<EditableText>(find.byType(EditableText));
      expect(editableTextsAfter.last.obscureText, isFalse);
    });

    testWidgets('displays session expired banner when status is sessionExpired', (tester) async {
      final fakeRepo = FakeAuthRepository();
      final notifier = TestAuthNotifier(
        fakeRepo,
        initialState: const AuthState(
          status: AuthStatus.sessionExpired,
          errorMessage: 'Your session has expired. Please log in again.',
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => notifier),
          ],
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      expect(find.text('Your session has expired. Please log in again.'), findsOneWidget);
    });
  });
}
