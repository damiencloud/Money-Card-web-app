import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/config/app_config.dart';
import 'package:money_card_staff/core/network/mdns_discovery_service.dart';

void main() {
  group('AppConfig & Dynamic Networking Tests', () {
    test('AppConfig normalizeUrl formats paths and prefixes cleanly', () {
      expect(AppConfig.normalizeUrl('192.168.105.39:3000'), 'http://192.168.105.39:3000/api/v1');
      expect(AppConfig.normalizeUrl('http://192.168.105.39:3000'), 'http://192.168.105.39:3000/api/v1');
      expect(AppConfig.normalizeUrl('http://192.168.105.39:3000/api/v1/'), 'http://192.168.105.39:3000/api/v1');
      expect(AppConfig.normalizeUrl('https://api.moneycard.com'), 'https://api.moneycard.com/api/v1');
    });

    test('AppConfig extracts displayHost and hostOnly cleanly', () {
      AppConfig.setBaseUrl('http://192.168.105.39:3000/api/v1');
      expect(AppConfig.displayHost, '192.168.105.39:3000');
      expect(AppConfig.hostOnly, '192.168.105.39');
      expect(AppConfig.port, 3000);
    });

    test('AppConfig does NOT contain any hardcoded 192.168.1.2 address', () {
      AppConfig.setBaseUrl('');
      expect(AppConfig.baseUrl, isNot(contains('192.168.1.2')));
    });
  });

  group('MdnsDiscoveryService Tests', () {
    test('Initial discovery state is idle', () {
      final service = MdnsDiscoveryService.instance;
      expect(service.status, MdnsStatus.idle);
      expect(service.currentError, isNull);
    });

    test('Health check succeeds against active backend health endpoint', () async {
      final service = MdnsDiscoveryService.instance;
      // Test against the local backend running on 3000
      final isHealthy = await service.verifyHealth('http://127.0.0.1:3000/api/v1');
      expect(isHealthy, isTrue);
    });

    test('Health check fails gracefully on unreachable host without crashing', () async {
      final service = MdnsDiscoveryService.instance;
      final isHealthy = await service.verifyHealth(
        'http://192.0.2.1:3000/api/v1',
        timeout: const Duration(milliseconds: 500),
      );
      expect(isHealthy, isFalse);
    });
  });
}
