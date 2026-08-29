import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('InMemoryTokenStorage Tests', () {
    late InMemoryTokenStorage storage;

    setUp(() {
      storage = InMemoryTokenStorage();
    });

    test('should save and retrieve tokens correctly', () async {
      expect(await storage.hasAccessToken(), isFalse);

      await storage.saveTokens(
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      );

      expect(await storage.hasAccessToken(), isTrue);
      expect(await storage.getAccessToken(), 'access-token-123');
      expect(await storage.getRefreshToken(), 'refresh-token-456');
    });

    test('should clear tokens correctly', () async {
      await storage.saveTokens(
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      );

      await storage.clearTokens();

      expect(await storage.hasAccessToken(), isFalse);
      expect(await storage.getAccessToken(), isNull);
      expect(await storage.getRefreshToken(), isNull);
    });
  });
}
