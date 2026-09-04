import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/mdns_discovery_service.dart';
import '../../core/storage/server_config_storage.dart';
import '../../providers/api_providers.dart';

class ServerConfigDialog extends ConsumerStatefulWidget {
  const ServerConfigDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (context) => const ServerConfigDialog(),
    );
  }

  @override
  ConsumerState<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends ConsumerState<ServerConfigDialog> {
  late final TextEditingController _urlController;
  bool _isTesting = false;
  bool _isDiscovering = false;
  String? _testResult;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: AppConfig.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _runMdnsDiscovery() async {
    if (!mounted) return;
    setState(() {
      _isDiscovering = true;
      _testResult = 'Searching local Wi-Fi via mDNS (_moneycard-api._tcp)...';
      _testSuccess = false;
    });

    final stopwatch = Stopwatch();
    stopwatch.start();
    final discoveredUrl = await MdnsDiscoveryService.instance.discoverAndVerifyBackend(
      timeout: const Duration(seconds: 10),
      testStoredFirst: false,
    );
    stopwatch.stop();

    if (!mounted) return;
    setState(() {
      _isDiscovering = false;
      if (discoveredUrl != null && discoveredUrl.isNotEmpty) {
        _urlController.text = discoveredUrl;
        _testSuccess = true;
        _testResult = '✓ Auto-discovered via mDNS (${stopwatch.elapsedMilliseconds}ms)\n$discoveredUrl';
      } else {
        _testSuccess = false;
        _testResult =
            '✗ Money Card server not found.\nMake sure your phone and computer are on the same Wi-Fi, the backend is running, and Wi-Fi AP isolation is disabled.';
      }
    });
  }

  Future<void> _testConnection() async {
    final rawUrl = _urlController.text.trim();
    if (rawUrl.isEmpty) return;

    final normalized = AppConfig.normalizeUrl(rawUrl);
    final healthUrl = normalized.endsWith('/') ? '${normalized}health' : '$normalized/health';

    if (!mounted) return;
    setState(() {
      _isTesting = true;
      _testResult = null;
      _testSuccess = false;
    });

    final stopwatch = Stopwatch();
    stopwatch.start();
    try {
      final testDio = Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 4),
          receiveTimeout: const Duration(seconds: 4),
          sendTimeout: const Duration(seconds: 4),
        ),
      );

      final resp = await testDio.get(healthUrl);
      stopwatch.stop();

      if (!mounted) return;
      if (resp.statusCode == 200) {
        final isLoopback = normalized.contains('127.0.0.1') || normalized.contains('localhost');
        final modeDesc = isLoopback ? 'USB Reverse / Local' : 'Wi-Fi LAN';
        setState(() {
          _testSuccess = true;
          _testResult = '✓ Connected (${stopwatch.elapsedMilliseconds}ms) • $modeDesc Online (HTTP 200)';
        });
      } else {
        setState(() {
          _testSuccess = false;
          _testResult = '✗ HTTP ${resp.statusCode}: Server returned unexpected status';
        });
      }
    } catch (e) {
      stopwatch.stop();
      if (!mounted) return;
      setState(() {
        _testSuccess = false;
        if (e is DioException) {
          if (e.type == DioExceptionType.connectionTimeout) {
            _testResult = '✗ Timed out (4s). Ensure phone & laptop are on the same Wi-Fi and port 3000 is open in firewall.';
          } else if (e.type == DioExceptionType.connectionError) {
            final isLoopback = normalized.contains('127.0.0.1') || normalized.contains('localhost');
            if (isLoopback) {
              _testResult = '✗ Connection refused on 127.0.0.1.\nFor USB cable, run in terminal on your computer:\nadb reverse tcp:3000 tcp:3000';
            } else {
              _testResult = '✗ Connection refused. Ensure backend server is running on laptop (http://0.0.0.0:3000).';
            }
          } else {
            _testResult = '✗ ${e.message ?? "Connection error"}';
          }
        } else {
          _testResult = '✗ Unable to reach host';
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _isTesting = false;
        });
      }
    }
  }

  Future<void> _saveAndApply() async {
    final rawUrl = _urlController.text.trim();
    final normalized = AppConfig.normalizeUrl(rawUrl);

    final storage = ServerConfigStorage();
    await storage.saveServerUrl(normalized);

    // Refresh dioClientProvider to pick up new base URL
    ref.invalidate(dioClientProvider);

    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Connected to: ${AppConfig.displayHost}'),
              ),
            ],
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      scrollable: true,
      backgroundColor: const Color(0xFF1E293B),
      title: Row(
        children: const [
          Icon(Icons.dns_rounded, color: AppColors.primary),
          SizedBox(width: 10),
          Text(
            'Server Connection',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dynamic mDNS discovery or custom development host:',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _urlController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'http://192.168.x.x:3000/api/v1',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.primary, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Quick preset chips
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.usb, size: 14, color: Colors.cyan),
                  label: const Text('USB (127.0.0.1)', style: TextStyle(fontSize: 12, color: Colors.white)),
                  backgroundColor: const Color(0xFF0F172A),
                  side: const BorderSide(color: Color(0xFF334155)),
                  onPressed: () {
                    _urlController.text = AppConfig.defaultBaseUrl;
                  },
                ),
                ActionChip(
                  avatar: const Icon(Icons.wifi, size: 14, color: AppColors.primary),
                  label: const Text('Wi-Fi LAN', style: TextStyle(fontSize: 12, color: Colors.white)),
                  backgroundColor: const Color(0xFF0F172A),
                  side: const BorderSide(color: Color(0xFF334155)),
                  onPressed: () {
                    _urlController.text = AppConfig.defaultLanBaseUrl;
                  },
                ),
                ActionChip(
                  avatar: _isDiscovering
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        )
                      : const Icon(Icons.radar_rounded, size: 14, color: AppColors.primary),
                  label: Text(_isDiscovering ? 'Searching...' : 'mDNS Auto-Discover',
                      style: const TextStyle(fontSize: 12, color: Colors.white)),
                  backgroundColor: const Color(0xFF0F172A),
                  side: const BorderSide(color: AppColors.primary),
                  onPressed: (_isDiscovering || _isTesting) ? null : _runMdnsDiscovery,
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Test connection button & output
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: (_isTesting || _isDiscovering) ? null : _testConnection,
                  icon: _isTesting
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.bolt, size: 16),
                  label: Text(_isTesting ? 'Testing...' : 'Test Connection'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF475569)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                ),
              ],
            ),
            if (_testResult != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _testSuccess
                      ? AppColors.success.withValues(alpha: 0.15)
                      : AppColors.error.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _testSuccess
                        ? AppColors.success.withValues(alpha: 0.5)
                        : AppColors.error.withValues(alpha: 0.5),
                  ),
                ),
                child: Text(
                  _testResult!,
                  style: TextStyle(
                    color: _testSuccess ? AppColors.success : AppColors.error,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
        ),
        ElevatedButton(
          onPressed: _saveAndApply,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
          child: const Text('Save & Apply'),
        ),
      ],
    );
  }
}
