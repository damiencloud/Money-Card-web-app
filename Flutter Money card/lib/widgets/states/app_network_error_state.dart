import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

class AppNetworkErrorState extends StatelessWidget {
  final VoidCallback? onRetry;
  final bool isTimeout;

  const AppNetworkErrorState({
    super.key,
    this.onRetry,
    this.isTimeout = false,
  });

  @override
  Widget build(BuildContext context) {
    final title = isTimeout ? 'Request Timed Out' : 'No Internet Connection';
    final description = isTimeout
        ? 'The server took too long to respond. Please check your network and try again.'
        : 'Please check your Wi-Fi or mobile data connection and try again.';
    final icon = isTimeout ? Icons.timer_off_outlined : Icons.wifi_off_outlined;

    return Center(
      child: Padding(
        padding: AppSpacing.paddingLg,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: const BoxDecoration(
                color: AppColors.warningLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              description,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondaryLight,
                  ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry Connection'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
