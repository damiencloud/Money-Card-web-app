import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/providers/permission_provider.dart';
import 'package:money_card_staff/widgets/guards/permission_guard.dart';
import 'package:money_card_staff/widgets/states/app_empty_state.dart';
import 'package:money_card_staff/widgets/states/app_error_state.dart';
import 'package:money_card_staff/widgets/states/app_loading_view.dart';
import 'package:money_card_staff/widgets/states/app_network_error_state.dart';
import 'package:money_card_staff/widgets/states/app_unauthorized_state.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Reusable UI States Widget Tests', () {
    testWidgets('AppLoadingView renders message and progress indicator', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppLoadingView(message: 'Loading staff data...'),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading staff data...'), findsOneWidget);
    });

    testWidgets('AppEmptyState renders title, description, and action button', (tester) async {
      bool actionTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppEmptyState(
              title: 'No Cards Found',
              description: 'Please issue a card to proceed.',
              actionLabel: 'Issue Card',
              onAction: () => actionTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('No Cards Found'), findsOneWidget);
      expect(find.text('Please issue a card to proceed.'), findsOneWidget);
      expect(find.text('Issue Card'), findsOneWidget);

      await tester.tap(find.text('Issue Card'));
      expect(actionTapped, isTrue);
    });

    testWidgets('AppErrorState renders error message and retry action', (tester) async {
      bool retried = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppErrorState(
              title: 'API Error',
              message: 'Failed to fetch sessions',
              onRetry: () => retried = true,
            ),
          ),
        ),
      );

      expect(find.text('API Error'), findsOneWidget);
      expect(find.text('Failed to fetch sessions'), findsOneWidget);

      await tester.tap(find.text('Try Again'));
      expect(retried, isTrue);
    });

    testWidgets('AppNetworkErrorState renders offline message and retry action', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppNetworkErrorState(),
          ),
        ),
      );

      expect(find.text('No Internet Connection'), findsOneWidget);
      expect(find.byIcon(Icons.wifi_off_outlined), findsOneWidget);
    });

    testWidgets('AppUnauthorizedState renders access restricted screen', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppUnauthorizedState(),
          ),
        ),
      );

      expect(find.text('Access Restricted'), findsOneWidget);
    });

    testWidgets('PermissionGuard conditionally renders child when permitted', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            permissionCheckerProvider.overrideWithValue(
              const PermissionChecker([AppPermission.cardView]),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: PermissionGuard(
                permissions: [AppPermission.cardView],
                child: Text('Card View Visible'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Card View Visible'), findsOneWidget);
    });

    testWidgets('PermissionGuard renders fallback when permission is missing', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            permissionCheckerProvider.overrideWithValue(
              const PermissionChecker([AppPermission.cardView]),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: PermissionGuard(
                permissions: [AppPermission.staffManage],
                fallback: Text('Staff Manage Hidden'),
                child: Text('Card View Visible'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Card View Visible'), findsNothing);
      expect(find.text('Staff Manage Hidden'), findsOneWidget);
    });
  });
}
