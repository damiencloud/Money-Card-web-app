import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/utils/qr_validator.dart';

void main() {
  group('QrValidator Tests', () {
    test('should extract opaque token from HTTPS URL', () {
      final token1 = QrValidator.extractToken('https://moneycard.io/c/opaque_token_abc_123');
      expect(token1, 'opaque_token_abc_123');

      final token2 = QrValidator.extractToken('http://app.moneycard.io/cards/token-999');
      expect(token2, 'token-999');
    });

    test('should extract raw opaque token string', () {
      final token = QrValidator.extractToken('raw-token-xyz-1234');
      expect(token, 'raw-token-xyz-1234');
    });

    test('should reject invalid or empty QR payloads', () {
      expect(QrValidator.extractToken(null), isNull);
      expect(QrValidator.extractToken(''), isNull);
      expect(QrValidator.extractToken('   '), isNull);
      expect(QrValidator.extractToken('ab'), isNull); // Too short
    });
  });
}
