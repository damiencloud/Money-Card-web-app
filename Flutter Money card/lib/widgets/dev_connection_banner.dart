import 'package:flutter/material.dart';
import '../core/config/app_config.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_spacing.dart';
import '../core/network/mdns_discovery_service.dart';
import 'dialogs/server_config_dialog.dart';

/// Development-only connection status banner.
/// Displays mDNS discovery status, retry actions, and server host indicator.
/// Completely hidden in production builds.
class DevConnectionBanner extends StatefulWidget {
  const DevConnectionBanner({super.key});

  @override
  State<DevConnectionBanner> createState() => _DevConnectionBannerState();
}

class _DevConnectionBannerState extends State<DevConnectionBanner> {
  final MdnsDiscoveryService _service = MdnsDiscoveryService.instance;

  @override
  Widget build(BuildContext context) {
    if (AppConfig.isProduction) {
      return const SizedBox.shrink();
    }

    return ValueListenableBuilder<MdnsStatus>(
      valueListenable: _service.statusNotifier,
      builder: (context, status, _) {
        if (status == MdnsStatus.discovering) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.12),
              borderRadius: AppSpacing.roundedSm,
              border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: const [
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue),
                ),
                SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Searching for Money Card backend via mDNS...',
                    style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          );
        }

        if (status == MdnsStatus.failed) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: AppSpacing.roundedSm,
              border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.wifi_off_rounded, color: AppColors.error, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        _service.currentError ??
                            'Money Card server not found.\nMake sure your phone and computer are connected to the same Wi-Fi and the backend is running.',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.error,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => ServerConfigDialog.show(context),
                      icon: const Icon(Icons.settings, size: 14),
                      label: const Text('Settings', style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.textSecondaryLight,
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        _service.discoverAndVerifyBackend(
                          timeout: const Duration(seconds: 10),
                          testStoredFirst: false,
                        );
                      },
                      icon: const Icon(Icons.refresh_rounded, size: 14),
                      label: const Text('Retry Connection', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }

        // Connected / Idle state: show compact host chip
        return Center(
          child: Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
            child: InkWell(
              onTap: () => ServerConfigDialog.show(context),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: status == MdnsStatus.connected ? AppColors.success : const Color(0xFF94A3B8),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Backend: ${AppConfig.displayHost}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.edit, size: 11, color: AppColors.textSecondaryLight),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
