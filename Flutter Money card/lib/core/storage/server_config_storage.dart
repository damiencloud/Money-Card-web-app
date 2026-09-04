import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

/// Service to persist custom server base URL across app restarts on physical devices.
class ServerConfigStorage {
  final FlutterSecureStorage _storage;
  String? _inMemoryFallback;

  static const String _keyServerUrl = 'mc_custom_server_url';

  ServerConfigStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                resetOnError: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  Future<void> saveServerUrl(String url) async {
    final normalized = AppConfig.normalizeUrl(url);
    try {
      await _storage.write(key: _keyServerUrl, value: normalized);
    } catch (_) {
      _inMemoryFallback = normalized;
    }
    AppConfig.setBaseUrl(normalized);
  }

  Future<String?> getServerUrl() async {
    try {
      final saved = await _storage.read(key: _keyServerUrl);
      if (saved != null && saved.isNotEmpty) {
        return saved;
      }
    } catch (_) {
      if (_inMemoryFallback != null && _inMemoryFallback!.isNotEmpty) {
        return _inMemoryFallback;
      }
    }
    return null;
  }

  Future<void> resetToDefault() async {
    try {
      await _storage.delete(key: _keyServerUrl);
    } catch (_) {
      _inMemoryFallback = null;
    }
    AppConfig.setBaseUrl(AppConfig.defaultLocalBaseUrl);
  }

  /// Initializes AppConfig from persistent storage on startup
  Future<void> initialize() async {
    final savedUrl = await getServerUrl();
    if (savedUrl != null && savedUrl.isNotEmpty) {
      AppConfig.setBaseUrl(savedUrl);
    }
  }
}
