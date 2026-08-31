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

  /// Primary USB Reverse / Local Loopback endpoint
  static const String defaultBaseUrl = 'http://127.0.0.1:3000/api/v1';

  /// Current active Laptop Wi-Fi LAN endpoint
  static const String defaultLanBaseUrl = 'http://192.168.105.39:3000/api/v1';

  /// Active API Mode: Strictly REAL LIVE SERVER
  static ApiMode apiMode = ApiMode.real;

  /// Helper flag for backward compatibility
  static bool get useMockApi => apiMode.isMock;

  /// Network timeouts
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
  static const Duration sendTimeout = Duration(seconds: 15);

  /// Configurable active base URL (overridden via --dart-define=BASE_URL=... or dynamically in-app)
  static String _activeBaseUrl = const String.fromEnvironment(
    'BASE_URL',
    defaultValue: defaultLanBaseUrl,
  );

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
    if (trimmed.isEmpty) return defaultLanBaseUrl;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'http://$trimmed';
    }

    // Remove trailing slash
    while (trimmed.endsWith('/')) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
    }

    // Append /api/v1 if not already containing /api
    if (!trimmed.contains('/api')) {
      trimmed = '$trimmed/api/v1';
    }

    return trimmed;
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
}
