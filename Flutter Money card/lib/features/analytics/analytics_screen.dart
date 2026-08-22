import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/branch.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/branch_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';
import '../../widgets/states/app_unauthorized_state.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> {
  final List<String> _ranges = ['Today', 'This Week', 'This Month'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
    });
  }

  @override
  Widget build(BuildContext context) {
    final analyticsState = ref.watch(analyticsNotifierProvider);
    final notifier = ref.read(analyticsNotifierProvider.notifier);
    final branchState = ref.watch(branchNotifierProvider);
    final currentBranch = branchState.currentBranch;
    final assignedBranches = branchState.assignedBranches;

    return PermissionGuard.single(
      permission: AppPermission.viewAnalytics,
      fallback: const AppUnauthorizedState(),
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Branch Analytics'),
                    if (currentBranch != null)
                      Text(
                        currentBranch.name,
                        style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              if (assignedBranches.length > 1 && currentBranch != null)
                _buildBranchSwitcher(context, ref, currentBranch, assignedBranches),
            ],
          ),
        ),
        body: Column(
          children: [
            // Date Range Filter Chips
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: _ranges.map((range) {
                  final isSelected = analyticsState.selectedRange == range;
                  return Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: ChoiceChip(
                      label: Text(range),
                      selected: isSelected,
                      onSelected: (_) => notifier.setRange(range),
                      selectedColor: AppColors.primaryLight,
                    ),
                  );
                }).toList(),
              ),
            ),
            const Divider(height: 1),

            // Main Content
            Expanded(
              child: RefreshIndicator(
                onRefresh: notifier.loadAnalytics,
                child: _buildContent(context, analyticsState, notifier),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchSwitcher(
    BuildContext context,
    WidgetRef ref,
    Branch currentBranch,
    List<Branch> assignedBranches,
  ) {
    return PopupMenuButton<Branch>(
      initialValue: currentBranch,
      onSelected: (branch) {
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
      },
      itemBuilder: (context) {
        return assignedBranches.map((branch) {
          final isSelected = branch.id == currentBranch.id;
          return PopupMenuItem<Branch>(
            value: branch,
            child: Row(
              children: [
                Icon(
                  Icons.storefront,
                  size: 18,
                  color: isSelected ? AppColors.primary : AppColors.textSecondaryLight,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  branch.name,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: AppSpacing.roundedSm,
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.swap_horiz, size: 16, color: AppColors.primaryDark),
            const SizedBox(width: 4),
            const Text(
              'Switch Branch',
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.primaryDark),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    AnalyticsState state,
    AnalyticsNotifier notifier,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading branch analytics...');
    }

    if (state.errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          Center(
            child: Padding(
              padding: AppSpacing.paddingLg,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    state.errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.error),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: notifier.loadAnalytics,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final data = state.analytics;
    if (data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          AppEmptyState(
            title: 'No Analytics Data',
            description: 'No performance metrics available for this branch.',
            icon: Icons.bar_chart_outlined,
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.paddingMd,
      children: [
        // Total Revenue & Volume Card
        AppCard(
          padding: AppSpacing.paddingLg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Branch Performance',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  AppBadge(
                    label: data.status,
                    variant: data.status == 'ACTIVE'
                        ? AppBadgeVariant.success
                        : AppBadgeVariant.neutral,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '\u20b9${data.totalRevenue.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const Text(
                'Total Revenue (Sales & Recharges)',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
              const Divider(height: AppSpacing.xl),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSummaryCol('Purchases', '\u20b9${data.purchaseVolume.toStringAsFixed(0)}'),
                  _buildSummaryCol('Recharges', '\u20b9${data.rechargeVolume.toStringAsFixed(0)}'),
                  _buildSummaryCol('Refunds', '\u20b9${data.refundVolume.toStringAsFixed(0)}'),
                  _buildSummaryCol('Tx Count', '${data.transactionCount}'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // Key Operations Grid
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.point_of_sale,
                label: 'Orders / Purchases',
                value: '${data.purchaseCount}',
                subValue: 'Avg \u20b9${data.avgPurchaseValue.toStringAsFixed(0)}',
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.account_balance_wallet,
                label: 'Card Recharges',
                value: '${data.rechargeCount}',
                subValue: 'Total ${data.rechargeCount} topups',
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.credit_card,
                label: 'Active Sessions',
                value: '${data.activeSessionsCount}',
                subValue: '${data.settledSessionsCount} settled',
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.inventory_2_outlined,
                label: 'Low Stock Alert',
                value: '${data.lowStockItemCount}',
                subValue: 'of ${data.inventoryItemCount} items',
                color: data.lowStockItemCount > 0 ? AppColors.warning : AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Product Demand Section
        if (data.productDemand != null && data.productDemand!.isNotEmpty) ...[
          const SectionHeader(title: 'Top Product Demand'),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: data.productDemand!.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, idx) {
                final prod = data.productDemand![idx];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.primaryLight,
                        child: Text(
                          '${idx + 1}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          prod.productName,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${prod.quantitySold} sold',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Text(
                            '\u20b9${prod.totalRevenue.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],

        // Peak Activity Periods Section
        if (data.peakPeriods != null && data.peakPeriods!.isNotEmpty) ...[
          const SectionHeader(title: 'Peak Activity Periods'),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: data.peakPeriods!.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, idx) {
                final peak = data.peakPeriods![idx];
                final isHighest = peak.activityLevel.toLowerCase() == 'highest';

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 20,
                        color: isHighest ? AppColors.warning : AppColors.primary,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              peak.timeSlot,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                            ),
                            Text(
                              '${peak.transactionCount} transactions \u2022 \u20b9${peak.purchaseVolume.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      AppBadge(
                        label: peak.activityLevel,
                        variant: isHighest ? AppBadgeVariant.warning : AppBadgeVariant.primary,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
      ],
    );
  }

  Widget _buildSummaryCol(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildMetricTile({
    required IconData icon,
    required String label,
    required String value,
    required String subValue,
    required Color color,
  }) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          Text(
            subValue,
            style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
          ),
        ],
      ),
    );
  }
}
