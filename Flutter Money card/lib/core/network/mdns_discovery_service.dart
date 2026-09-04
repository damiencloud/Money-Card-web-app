import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:nsd/nsd.dart';
import '../config/app_config.dart';
import '../storage/server_config_storage.dart';

enum MdnsStatus {
  idle,
  discovering,
  connected,
  failed,
}

class MdnsDiscoveryService {
  static final MdnsDiscoveryService instance = MdnsDiscoveryService._internal();

  MdnsDiscoveryService._internal();

  final ValueNotifier<MdnsStatus> statusNotifier = ValueNotifier<MdnsStatus>(MdnsStatus.idle);
  final ValueNotifier<String?> errorNotifier = ValueNotifier<String?>(null);

  MdnsStatus get status => statusNotifier.value;
  String? get currentError => errorNotifier.value;

  Discovery? _activeDiscovery;
  bool _isSearching = false;

  /// Service type to search for over mDNS/DNS-SD
  static const String serviceType = '_moneycard-api._tcp';

  /// Performs mDNS discovery to dynamically locate the Money Card development backend.
  /// Strictly disabled in production builds.
  Future<String?> discoverAndVerifyBackend({
    Duration timeout = const Duration(seconds: 10),
    bool testStoredFirst = true,
  }) async {
    // 1. Strict production guard
    if (AppConfig.isProduction) {
      if (kDebugMode) {
        debugPrint('[Network] Production environment detected: mDNS discovery skipped.');
      }
      return AppConfig.baseUrl;
    }

    // 2. If already searching, prevent duplicate concurrent runs
    if (_isSearching) {
      if (kDebugMode) {
        debugPrint('[Network] mDNS discovery already in progress. Waiting...');
      }
      return null;
    }

    // 3. Optional: Test previously saved server URL or active base URL (supports USB 127.0.0.1 and Wi-Fi)
    final storage = ServerConfigStorage();
    if (testStoredFirst) {
      final savedUrl = await storage.getServerUrl();
      if (savedUrl != null && savedUrl.isNotEmpty) {
        final isHealthy = await verifyHealth(savedUrl, timeout: const Duration(seconds: 2));
        if (isHealthy) {
          AppConfig.baseUrl = savedUrl;
          statusNotifier.value = MdnsStatus.connected;
          errorNotifier.value = null;
          if (kDebugMode) {
            debugPrint('[Network] Reconnected to verified backend at: $savedUrl');
          }
          return savedUrl;
        }
      }

      // Also test the active baseUrl if already configured
      final isCurrentHealthy = await verifyHealth(AppConfig.baseUrl, timeout: const Duration(seconds: 2));
      if (isCurrentHealthy) {
        statusNotifier.value = MdnsStatus.connected;
        errorNotifier.value = null;
        if (kDebugMode) {
          debugPrint('[Network] Connected to active backend at: ${AppConfig.baseUrl}');
        }
        return AppConfig.baseUrl;
      }
    }

    _isSearching = true;
    statusNotifier.value = MdnsStatus.discovering;
    errorNotifier.value = null;

    if (kDebugMode) {
      debugPrint('[Network] Starting mDNS discovery...');
      debugPrint('[Network] Searching for $serviceType');
    }

    final completer = Completer<String?>();
    Timer? timeoutTimer;

    try {
      // Clean up any stale discovery handle
      await _cancelActiveDiscovery();

      _activeDiscovery = await startDiscovery(
        serviceType,
        autoResolve: true,
        ipLookupType: IpLookupType.v4,
      );

      final discovery = _activeDiscovery!;

      timeoutTimer = Timer(timeout, () async {
        if (!completer.isCompleted) {
          if (kDebugMode) {
            debugPrint('[Network] mDNS discovery timed out');
            debugPrint('[Network] Backend not found');
          }
          await _cancelActiveDiscovery();
          completer.complete(null);
        }
      });

      Future<void> handleCandidate(Service service) async {
        if (completer.isCompleted) return;

        try {
          if (kDebugMode) {
            debugPrint('[Network] Discovered mDNS service candidate: ${service.name}');
          }

          var hostIp = _extractIpv4(service);
          var port = service.port ?? 3000;

          // If not fully resolved yet, resolve explicitly
          if (hostIp == null || hostIp.isEmpty) {
            try {
              final resolved = await resolve(service);
              hostIp = _extractIpv4(resolved);
              port = resolved.port ?? 3000;
            } catch (_) {}
          }

          if (hostIp == null || hostIp.isEmpty) return;

          final candidateUrl = 'http://$hostIp:$port/api/v1';

          if (kDebugMode) {
            debugPrint('[Network] Money Card Backend candidate resolved');
            debugPrint('[Network] Host: $hostIp');
            debugPrint('[Network] Port: $port');
          }

          // Verify live backend health before accepting
          final isHealthy = await verifyHealth(candidateUrl);
          if (isHealthy) {
            if (kDebugMode) {
              debugPrint('[Network] Health check: 200 OK');
              debugPrint('[Network] Backend connected: $candidateUrl');
            }

            AppConfig.baseUrl = candidateUrl;
            await storage.saveServerUrl(candidateUrl);

            statusNotifier.value = MdnsStatus.connected;
            errorNotifier.value = null;

            await _cancelActiveDiscovery();
            if (!completer.isCompleted) {
              completer.complete(candidateUrl);
            }
          } else {
            if (kDebugMode) {
              debugPrint('[Network] Candidate $candidateUrl failed health check.');
            }
          }
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[Network] Error handling discovered service: $e');
          }
        }
      }

      // Check immediately in case services were already populated
      for (final s in discovery.services) {
        unawaited(handleCandidate(s));
      }

      // Listen for newly discovered services
      discovery.addListener(() {
        for (final s in discovery.services) {
          unawaited(handleCandidate(s));
        }
      });

      final result = await completer.future;
      timeoutTimer.cancel();

      if (result != null) {
        _isSearching = false;
        return result;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Network] mDNS discovery exception: $e');
      }
    } finally {
      timeoutTimer?.cancel();
      await _cancelActiveDiscovery();
      _isSearching = false;
    }

    // 4. Fallback checks: Test active URL, USB reverse, and default LAN
    final isCurrentHealthy = await verifyHealth(AppConfig.baseUrl, timeout: const Duration(seconds: 2));
    if (isCurrentHealthy) {
      statusNotifier.value = MdnsStatus.connected;
      errorNotifier.value = null;
      return AppConfig.baseUrl;
    }

    final isUsbHealthy = await verifyHealth(AppConfig.defaultBaseUrl, timeout: const Duration(seconds: 2));
    if (isUsbHealthy) {
      AppConfig.baseUrl = AppConfig.defaultBaseUrl;
      statusNotifier.value = MdnsStatus.connected;
      errorNotifier.value = null;
      return AppConfig.defaultBaseUrl;
    }

    final isLanHealthy = await verifyHealth(AppConfig.defaultLanBaseUrl, timeout: const Duration(seconds: 2));
    if (isLanHealthy) {
      AppConfig.baseUrl = AppConfig.defaultLanBaseUrl;
      statusNotifier.value = MdnsStatus.connected;
      errorNotifier.value = null;
      return AppConfig.defaultLanBaseUrl;
    }

    statusNotifier.value = MdnsStatus.failed;
    errorNotifier.value =
        'Backend server not found.\n• For USB: Run "adb reverse tcp:3000 tcp:3000"\n• For Wi-Fi: Connect to same Wi-Fi or configure IP in Settings';
    return null;
  }

  /// Cancels active discovery
  Future<void> _cancelActiveDiscovery() async {
    if (_activeDiscovery != null) {
      try {
        await stopDiscovery(_activeDiscovery!);
      } catch (_) {}
      _activeDiscovery = null;
    }
  }

  /// Extracts the most reliable IPv4 LAN address from the resolved Service
  String? _extractIpv4(Service service) {
    // 1. Check TXT record for 'ip'
    if (service.txt != null && service.txt!.containsKey('ip')) {
      final rawIp = service.txt!['ip'];
      if (rawIp != null) {
        final ipStr = String.fromCharCodes(rawIp).trim();
        final ipMatch = RegExp(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$');
        if (ipMatch.hasMatch(ipStr)) {
          return ipStr;
        }
      }
    }

    // 2. Prioritize standard IPv4 non-loopback non-link-local addresses
    if (service.addresses != null && service.addresses!.isNotEmpty) {
      for (final addr in service.addresses!) {
        if (addr.type == InternetAddressType.IPv4 && !addr.isLoopback && !addr.isLinkLocal) {
          return addr.address;
        }
      }
    }

    // 3. Fallback: check hostname if formatted as IP
    final host = service.host;
    if (host != null && host.isNotEmpty) {
      var cleanHost = host.trim();
      while (cleanHost.endsWith('.')) {
        cleanHost = cleanHost.substring(0, cleanHost.length - 1);
      }
      final ipMatch = RegExp(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$');
      if (ipMatch.hasMatch(cleanHost)) {
        return cleanHost;
      }
    }

    return null;
  }

  /// Health check probe to ensure the backend is responsive before connecting
  Future<bool> verifyHealth(String candidateBaseUrl, {Duration timeout = const Duration(seconds: 3)}) async {
    final normalized = AppConfig.normalizeUrl(candidateBaseUrl);
    final healthUrl = normalized.endsWith('/') ? '${normalized}health' : '$normalized/health';

    try {
      final dio = Dio(
        BaseOptions(
          connectTimeout: timeout,
          receiveTimeout: timeout,
          sendTimeout: timeout,
        ),
      );

      final resp = await dio.get(healthUrl);
      return resp.statusCode == 200;
    } catch (_) {
      // Fallback: try root /health if /api/v1/health timed out
      try {
        final uri = Uri.parse(normalized);
        final rootHealthUrl = '${uri.scheme}://${uri.host}:${uri.port}/health';
        final dio = Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 2),
            receiveTimeout: const Duration(seconds: 2),
          ),
        );
        final resp = await dio.get(rootHealthUrl);
        return resp.statusCode == 200;
      } catch (_) {
        return false;
      }
    }
  }
}
