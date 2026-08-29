import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/features/more/more_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  testWidgets('MoreScreen renders staff profile and operational menu options', (tester) async {
    const mockUser = AuthUser(
      id: 'staff-1',
      email: 'staff@moneycard.io',
      name: 'Alex Morgan',
      role: 'STAFF',
      organizationId: 'org-1',
      permissions: [
        AppPermission.productView,
        AppPermission.inventoryView,
        AppPermission.viewAnalytics,
      ],
      assignedBranchIds: ['b-1'],
    );

    const mockBranch = Branch(
      id: 'b-1',
      organizationId: 'org-1',
      name: 'Main Cafeteria',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWithValue(mockUser),
          currentBranchProvider.overrideWithValue(mockBranch),
        ],
        child: const MaterialApp(
          home: Scaffold(
            body: MoreScreen(),
          ),
        ),
      ),
    );

    expect(find.text('Alex Morgan'), findsOneWidget);
    expect(find.text('Menu & Inventory'), findsOneWidget);
    expect(find.text('Analytics & Reports'), findsOneWidget);
    expect(find.text('Scan Vibration Feedback'), findsNothing);
    expect(find.text('Sample Digital Receipt & PDF'), findsNothing);

    await tester.scrollUntilVisible(find.text('Sign Out'), 100);
    expect(find.text('Sign Out'), findsOneWidget);
  });
}
