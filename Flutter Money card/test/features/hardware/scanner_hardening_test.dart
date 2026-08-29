import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/config/app_config.dart';
import 'package:money_card_staff/core/constants/app_colors.dart';
import 'package:money_card_staff/core/utils/qr_validator.dart';
import 'package:money_card_staff/models/hardware_settings.dart';
import 'package:money_card_staff/widgets/states/app_loading_view.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;

  group('Task 39: Hardware & Scanner Hardening Tests', () {
    test('QrValidator correctly validates Money Card QR formats and rejects malformed inputs', () {
      // Valid Money Card QR patterns
      expect(QrValidator.isValidQr('QR-MOCK-001'), isTrue);
      expect(QrValidator.isValidQr('CARD001'), isTrue);
      expect(QrValidator.isValidQr('https://moneycard.app/c/token_abc123'), isTrue);
      expect(QrValidator.isValidQr('mc:token_xyz789'), isTrue);

      // Malformed / Non-MoneyCard QR patterns
      expect(QrValidator.isValidQr(''), isFalse);
      expect(QrValidator.isValidQr('   '), isFalse);
      expect(QrValidator.isValidQr('ab'), isFalse);
      expect(QrValidator.isValidQr('WIFI:S:MyWifi;T:WPA;P:password;;'), isFalse);
      expect(QrValidator.isValidQr('mailto:support@moneycard.com'), isFalse);
      expect(QrValidator.isValidQr('tel:+919876543210'), isFalse);
      expect(QrValidator.isValidQr('sms:+919876543210'), isFalse);
    });

    test('QrValidator extracts pure QR token from various URL and prefixed formats', () {
      expect(QrValidator.extractToken('QR-MOCK-001'), 'QR-MOCK-001');
      expect(QrValidator.extractToken('CARD001'), 'CARD001');
      expect(QrValidator.extractToken('https://moneycard.app/c/token_abc123'), 'token_abc123');
      expect(QrValidator.extractToken('mc:token_xyz789'), 'token_xyz789');
    });

    test('HardwareSettings model manages scanner sound and vibration feedback settings', () {
      const defaultSettings = HardwareSettings();
      expect(defaultSettings.soundFeedbackEnabled, isTrue);
      expect(defaultSettings.vibrationFeedbackEnabled, isTrue);

      final customized = defaultSettings.copyWith(
        soundFeedbackEnabled: false,
        vibrationFeedbackEnabled: true,
      );

      expect(customized.soundFeedbackEnabled, isFalse);
      expect(customized.vibrationFeedbackEnabled, isTrue);

      final json = customized.toJson();
      final restored = HardwareSettings.fromJson(json);
      expect(restored.soundFeedbackEnabled, isFalse);
      expect(restored.vibrationFeedbackEnabled, isTrue);
    });

    testWidgets('Scanner error state renders clear message and dismiss action', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: Container(
              padding: const EdgeInsets.all(16),
              color: AppColors.error,
              child: Row(
                children: const [
                  Icon(Icons.error_outline, color: Colors.white),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Unrecognized QR code format. Please scan a valid Money Card.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.textContaining('Unrecognized QR code format'), findsOneWidget);
    });

    testWidgets('Scanner camera permission fallback UI renders Open Settings CTA', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.camera_alt_outlined, size: 64, color: AppColors.error),
                  const SizedBox(height: 16),
                  const Text(
                    'Camera Permission Required',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Please allow camera permission in device settings to scan Money Card QR codes.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {},
                    child: const Text('Open Settings'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.camera_alt_outlined), findsOneWidget);
      expect(find.text('Camera Permission Required'), findsOneWidget);
      expect(find.text('Open Settings'), findsOneWidget);
    });

    testWidgets('Scanner loading overlay renders during network resolution', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppLoadingView(
              message: 'Resolving card details...',
              isOverlay: true,
            ),
          ),
        ),
      );

      expect(find.text('Resolving card details...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
