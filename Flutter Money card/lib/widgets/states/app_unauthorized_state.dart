import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

class AppUnauthorizedState extends StatelessWidget {
  final bool isSessionExpired;
  final VoidCallback? onAction;

  const AppUnauthorizedState({
    super.key,
    this.isSessionExpired = false,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final title = isSessionExpired ? 'Session Expired' : 'Access Restricted';
    final description = isSessionExpired
        ? 'Your login session has expired for security. Please sign in again to continue.'
        : 'Your staff account does not have the required permissions for this feature.';
    final actionLabel = isSessionExpired ? 'Sign In Again' : 'Return to Dashboard';
    final icon = isSessionExpired ? Icons.lock_clock_outlined : Icons.gpp_bad_outlined;

    return Center(
      child: Padding(
        padding: AppSpacing.paddingLg,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: const BoxDecoration(
                color: AppColors.errorLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: AppColors.error,
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
            if (onAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton(
                onPressed: onAction,
                child: Text(actionLabel),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
