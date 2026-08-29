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

  /// Primary USB Reverse endpoint (Fastest, zero-latency via adb reverse)
  static const String defaultBaseUrl = 'http://127.0.0.1:3000/api/v1';

  /// Alternate Wi-Fi LAN endpoint
  static const String alternateBaseUrl = 'http://192.168.105.39:3000/api/v1';

  /// Active API Mode: Strictly REAL LIVE SERVER
  static ApiMode apiMode = ApiMode.real;

  /// Helper flag for backward compatibility
  static bool get useMockApi => apiMode.isMock;

  /// Network timeouts
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
  static const Duration sendTimeout = Duration(seconds: 15);

  /// Configurable active base URL (overrideable via --dart-define=BASE_URL=...)
  static String baseUrl = const String.fromEnvironment(
    'BASE_URL',
    defaultValue: defaultBaseUrl,
  );
}
