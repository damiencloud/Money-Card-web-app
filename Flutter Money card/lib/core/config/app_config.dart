enum ApiMode {
  mock('mock'),
  real('real');

  const ApiMode(this.value);
  final String value;

  bool get isMock => this == ApiMode.mock;
  bool get isReal => this == ApiMode.real;

  static ApiMode fromString(String val) {
    if (val.toLowerCase() == 'real') return ApiMode.real;
    return ApiMode.mock;
  }
}

class AppConfig {
  AppConfig._();

  static const String appName = 'Money Card Staff';
  static const String appVersion = '1.0.0';

  /// Default API base URL (conforming to M0 V10 /api/v1)
  static const String defaultBaseUrl = 'http://localhost:3000/api/v1';

  /// Active API Mode: 'mock' (default for M13-M17) or 'real' (M18+)
  static ApiMode apiMode = ApiMode.fromString(
    const String.fromEnvironment('API_MODE', defaultValue: 'real'),
  );

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
