import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

class AppEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const AppEmptyState({
    super.key,
    this.icon = Icons.inbox_outlined,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
  });

  factory AppEmptyState.noCards({VoidCallback? onIssueCard}) {
    return AppEmptyState(
      icon: Icons.credit_card_outlined,
      title: 'No Cards Found',
      description: 'No physical cards are assigned to this branch yet.',
      actionLabel: onIssueCard != null ? 'Issue Card' : null,
      onAction: onIssueCard,
    );
  }

  factory AppEmptyState.noSessions() {
    return const AppEmptyState(
      icon: Icons.account_balance_wallet_outlined,
      title: 'No Active Sessions',
      description: 'Scan a card to start a new cafeteria session.',
    );
  }

  factory AppEmptyState.noProducts() {
    return const AppEmptyState(
      icon: Icons.fastfood_outlined,
      title: 'No Products Available',
      description: 'No menu items or products found for the selected branch.',
    );
  }

  factory AppEmptyState.noInventory() {
    return const AppEmptyState(
      icon: Icons.inventory_2_outlined,
      title: 'No Inventory Recorded',
      description: 'Inventory levels have not been initialized yet.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.paddingLg,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withValues(alpha: 0.5),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: AppColors.primary,
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
            if (description != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                description!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondaryLight,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
