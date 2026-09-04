import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

enum ApiMode {
  mock('mock'),
  real('real');

  const ApiMode(this.value);
  final String value;

  bool get isMock => this == ApiMode.mock;
  bool get isReal => this == ApiMode.real;

  static ApiMode fromString(String val) {
    if (val.toLowerCase() == 'mock') return ApiMode.mock;
    return ApiMode.real;
  }
}

class AppConfig {
  AppConfig._();

  static const String appName = 'Money Card Staff';
  static const String appVersion = '1.0.0';

  /// Environment: 'development' or 'production'
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );

  static bool get isProduction => environment.toLowerCase() == 'production';
  static bool get isDevelopment => !isProduction;

  /// Production API URL (used strictly in production builds)
  static const String productionBaseUrl = String.fromEnvironment(
    'PROD_BASE_URL',
    defaultValue: 'https://api.moneycard.com/api/v1',
  );

  /// Primary USB Reverse / Local Loopback endpoint
  static const String defaultBaseUrl = 'http://127.0.0.1:3000/api/v1';
  static const String defaultLocalBaseUrl = defaultBaseUrl;

  /// Current active Laptop Wi-Fi LAN endpoint
  static const String defaultLanBaseUrl = 'http://192.168.105.39:3000/api/v1';

  /// Optional host passed via --dart-define=API_HOST=192.168.x.x[:port]
  static const String _envApiHost = String.fromEnvironment('API_HOST', defaultValue: '');

  /// Configurable active base URL
  static String _activeBaseUrl = _computeInitialBaseUrl();

  static String _computeInitialBaseUrl() {
    const envBaseUrl = String.fromEnvironment('BASE_URL', defaultValue: '');
    if (envBaseUrl.isNotEmpty) {
      return normalizeUrl(envBaseUrl);
    }
    if (_envApiHost.isNotEmpty) {
      return normalizeUrl(_envApiHost);
    }
    if (isProduction) {
      return normalizeUrl(productionBaseUrl);
    }
    return defaultLocalBaseUrl;
  }

  /// Active API Mode: Strictly REAL LIVE SERVER
  static ApiMode apiMode = ApiMode.real;

  /// Helper flag for backward compatibility
  static bool get useMockApi => apiMode.isMock;

  /// Network timeouts (optimized for local POS operation with quick failover)
  static const Duration connectTimeout = Duration(seconds: 4);
  static const Duration receiveTimeout = Duration(seconds: 8);
  static const Duration sendTimeout = Duration(seconds: 8);

  static String get baseUrl => _activeBaseUrl;

  static set baseUrl(String url) {
    _activeBaseUrl = normalizeUrl(url);
  }

  /// Sets base URL dynamically and normalizes path
  static void setBaseUrl(String url) {
    _activeBaseUrl = normalizeUrl(url);
  }

  /// Ensures URL starts with http/https and ends with /api/v1 (or /api)
  static String normalizeUrl(String input) {
    var trimmed = input.trim();
    if (trimmed.isEmpty) return defaultLocalBaseUrl;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'http://$trimmed';
    }

    // Remove trailing slash
    while (trimmed.endsWith('/')) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
    }

    // Append /api/v1 if path does not already contain /api
    try {
      final uri = Uri.parse(trimmed);
      if (!uri.path.contains('/api')) {
        trimmed = '$trimmed/api/v1';
      }
    } catch (_) {
      if (!trimmed.endsWith('/api') && !trimmed.contains('/api/')) {
        trimmed = '$trimmed/api/v1';
      }
    }

    return trimmed;
  }

  /// Checks whether the current configuration uses loopback on a physical Android device
  static bool get isPhysicalAndroidLoopback {
    if (kIsWeb) return false;
    try {
      if (Platform.isAndroid) {
        final uri = Uri.parse(_activeBaseUrl);
        return uri.host == '127.0.0.1' || uri.host == 'localhost';
      }
    } catch (_) {}
    return false;
  }

  /// Extracts display host:port for clean UI badge (e.g., '192.168.105.39:3000')
  static String get displayHost {
    try {
      final uri = Uri.parse(_activeBaseUrl);
      if (uri.port != 80 && uri.port != 443 && uri.port != 0) {
        return '${uri.host}:${uri.port}';
      }
      return uri.host;
    } catch (_) {
      return _activeBaseUrl;
    }
  }

  /// Returns only the host without port (e.g. '192.168.105.39')
  static String get hostOnly {
    try {
      return Uri.parse(_activeBaseUrl).host;
    } catch (_) {
      return _activeBaseUrl;
    }
  }

  /// Returns port number (default 3000)
  static int get port {
    try {
      final p = Uri.parse(_activeBaseUrl).port;
      return p != 0 ? p : 3000;
    } catch (_) {
      return 3000;
    }
  }
}
