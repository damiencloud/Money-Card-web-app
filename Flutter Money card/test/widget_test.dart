import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/main.dart';
import 'package:money_card_staff/providers/api_providers.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  testWidgets('MoneyCardStaffApp boots and renders initial route', (tester) async {
    final inMemoryStorage = InMemoryTokenStorage();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tokenStorageProvider.overrideWithValue(inMemoryStorage),
        ],
        child: const MoneyCardStaffApp(),
      ),
    );

    await tester.pumpAndSettle();

    // With no token, it should show the LoginScreen
    expect(find.text('MONEY CARD'), findsOneWidget);
    expect(find.text('Staff Login'), findsOneWidget);
  });
}
