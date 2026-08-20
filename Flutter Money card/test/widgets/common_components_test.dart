import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/widgets/common/app_badge.dart';
import 'package:money_card_staff/widgets/common/app_bottom_sheet.dart';
import 'package:money_card_staff/widgets/common/app_button.dart';
import 'package:money_card_staff/widgets/common/app_card.dart';
import 'package:money_card_staff/widgets/common/app_dialog.dart';
import 'package:money_card_staff/widgets/common/app_text_field.dart';
import 'package:money_card_staff/widgets/common/section_header.dart';

void main() {
  group('Design System Reusable Components Tests', () {
    testWidgets('AppButton renders label, handles tap and loading state', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'Proceed',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Proceed'), findsOneWidget);
      await tester.tap(find.text('Proceed'));
      expect(tapped, isTrue);

      // Loading state
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'Proceed',
              isLoading: true,
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Proceed'), findsNothing);
    });

    testWidgets('AppOutlinedButton renders and handles tap', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppOutlinedButton(
              label: 'Cancel',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Cancel'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      expect(tapped, isTrue);
    });

    testWidgets('AppCard renders child and handles onTap', (tester) async {
      bool cardTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppCard(
              onTap: () => cardTapped = true,
              child: const Text('Card Content'),
            ),
          ),
        ),
      );

      expect(find.text('Card Content'), findsOneWidget);
      await tester.tap(find.text('Card Content'));
      expect(cardTapped, isTrue);
    });

    testWidgets('AppBadge renders variant labels', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppBadge(
              label: 'ACTIVE',
              variant: AppBadgeVariant.success,
            ),
          ),
        ),
      );

      expect(find.text('ACTIVE'), findsOneWidget);
    });

    testWidgets('SectionHeader renders title and action button', (tester) async {
      bool actionTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SectionHeader(
              title: "Today's Activity",
              actionLabel: 'View All',
              onAction: () => actionTapped = true,
            ),
          ),
        ),
      );

      expect(find.text("Today's Activity"), findsOneWidget);
      expect(find.text('View All'), findsOneWidget);

      await tester.tap(find.text('View All'));
      expect(actionTapped, isTrue);
    });

    testWidgets('AppTextField renders label and captures input', (tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppTextField(
              controller: controller,
              label: 'Staff Email',
              hintText: 'Enter email',
            ),
          ),
        ),
      );

      expect(find.text('Staff Email'), findsOneWidget);
      await tester.enterText(find.byType(TextFormField), 'test@moneycard.io');
      expect(controller.text, 'test@moneycard.io');
    });

    testWidgets('AppDialog shows and confirms action', (tester) async {
      bool confirmed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppDialog(
              title: 'Confirm Void',
              message: 'Are you sure you want to void this session?',
              onConfirm: () => confirmed = true,
            ),
          ),
        ),
      );

      expect(find.text('Confirm Void'), findsOneWidget);
      expect(find.text('Are you sure you want to void this session?'), findsOneWidget);

      await tester.tap(find.text('Confirm'));
      expect(confirmed, isTrue);
    });

    testWidgets('AppBottomSheet renders title and child', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppBottomSheet(
              title: 'Branch Selector',
              child: Text('Sheet Content'),
            ),
          ),
        ),
      );

      expect(find.text('Branch Selector'), findsOneWidget);
      expect(find.text('Sheet Content'), findsOneWidget);
    });
  });
}
