import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card_session.dart';
import '../../providers/branch_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';

class SessionsScreen extends ConsumerStatefulWidget {
  const SessionsScreen({super.key});

  @override
  ConsumerState<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends ConsumerState<SessionsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatDateTime(String isoString) {
    if (isoString.isEmpty) return 'N/A';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final date = '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
      final time = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      return '$date $time';
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionListState = ref.watch(sessionListNotifierProvider);
    final notifier = ref.read(sessionListNotifierProvider.notifier);
    final currentBranch = ref.watch(currentBranchProvider);
    final permissionChecker = ref.watch(permissionCheckerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Card Sessions'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Branch Information Card
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.sm,
                AppSpacing.md,
                AppSpacing.xs,
              ),
              child: AppCard(
                padding: AppSpacing.paddingSm,
                child: Row(
                  children: [
                    const Icon(Icons.storefront, size: 20, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Branch: ${currentBranch?.name ?? "All Assigned Branches"}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Status Segmented Filter (Prioritizes Active Sessions)
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'ACTIVE',
                    label: Text('Active'),
                    icon: Icon(Icons.bolt, size: 16),
                  ),
                  ButtonSegment(
                    value: 'ALL',
                    label: Text('All'),
                    icon: Icon(Icons.list_alt, size: 16),
                  ),
                  ButtonSegment(
                    value: 'SETTLED',
                    label: Text('Settled'),
                    icon: Icon(Icons.check_circle_outline, size: 16),
                  ),
                ],
                selected: {sessionListState.statusFilter},
                onSelectionChanged: (set) {
                  if (set.isNotEmpty) {
                    notifier.setStatusFilter(set.first);
                  }
                },
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              child: TextField(
                controller: _searchController,
                onChanged: notifier.setSearchQuery,
                decoration: InputDecoration(
                  hintText: 'Search active sessions by card number...',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  isDense: true,
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            notifier.setSearchQuery('');
                          },
                        )
                      : null,
                ),
              ),
            ),
            const Divider(height: 1),

            // Sessions List Content
            Expanded(
              child: RefreshIndicator(
                onRefresh: notifier.loadSessions,
                child: _buildListContent(
                  context,
                  sessionListState,
                  notifier,
                  currentBranch?.name,
                  permissionChecker,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListContent(
    BuildContext context,
    SessionListState state,
    SessionListNotifier notifier,
    String? branchName,
    PermissionChecker permissionChecker,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading active sessions...');
    }

    if (state.errorMessage != null) {
      return Center(
        child: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.cloud_off, size: 40, color: AppColors.error),
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Unable to Load Sessions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                state.errorMessage!,
                style: const TextStyle(color: AppColors.textSecondaryLight, fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton.icon(
                onPressed: notifier.loadSessions,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final sessions = state.filteredSessions;

    if (sessions.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => ref.read(sessionListNotifierProvider.notifier).loadSessions(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 80),
            state.searchQuery.isNotEmpty
                ? AppEmptyState(
                    title: 'No Matching Sessions',
                    description: 'No sessions match "${state.searchQuery}".',
                    icon: Icons.search_off,
                  )
                : AppEmptyState(
                    title: state.statusFilter == 'ACTIVE' ? 'No Active Sessions' : 'No Sessions Found',
                    description: state.statusFilter == 'ACTIVE'
                        ? 'There are currently no active cafeteria card sessions in ${branchName ?? "this branch"}.'
                        : 'No card sessions found for the selected filter in ${branchName ?? "this branch"}.',
                    icon: Icons.account_balance_wallet_outlined,
                  ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(sessionListNotifierProvider.notifier).loadSessions(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppSpacing.paddingMd,
        itemCount: sessions.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
        final session = sessions[index];
        final isActive = session.status == SessionStatus.active;
        final cardIdentifier = session.physicalCardNumber ?? session.cardId;

        return AppCard(
          padding: AppSpacing.paddingMd,
          onTap: () {
            if (GoRouter.maybeOf(context) != null) {
              context.push('/app/sessions/${session.id}');
            }
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Card identifier + Status Badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.successLight : AppColors.surfaceLight,
                      borderRadius: AppSpacing.roundedSm,
                    ),
                    child: Icon(
                      Icons.credit_card,
                      color: isActive ? AppColors.success : AppColors.textSecondaryLight,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Card $cardIdentifier',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (session.branchName != null && session.branchName!.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(
                                Icons.storefront_outlined,
                                size: 12,
                                color: AppColors.textSecondaryLight,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                session.branchName!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹${session.balance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      AppBadge(
                        label: session.status.value,
                        variant: isActive ? AppBadgeVariant.success : AppBadgeVariant.neutral,
                      ),
                    ],
                  ),
                ],
              ),
              const Divider(height: AppSpacing.md),

              // Metadata: Branch and Started Date/Time
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.storefront, size: 14, color: AppColors.textSecondaryLight),
                      const SizedBox(width: 4),
                      Text(
                        'Branch: ${branchName ?? session.branchId}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 14, color: AppColors.textSecondaryLight),
                      const SizedBox(width: 4),
                      Text(
                        'Started: ${_formatDateTime(session.startedAt)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                ],
              ),

              // Contextual Action Buttons (Allowed by Staff Permissions)
              if (isActive) ...[
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    if (permissionChecker.hasPermission(AppPermission.recharge))
                      OutlinedButton.icon(
                        icon: const Icon(Icons.add_card, size: 14),
                        label: const Text('Recharge', style: TextStyle(fontSize: 12)),
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        ),
                        onPressed: () {
                          if (GoRouter.maybeOf(context) != null) {
                            context.push('/app/recharge/${session.id}');
                          }
                        },
                      ),
                    if (permissionChecker.hasPermission(AppPermission.purchase))
                      OutlinedButton.icon(
                        icon: const Icon(Icons.point_of_sale, size: 14),
                        label: const Text('POS', style: TextStyle(fontSize: 12)),
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        ),
                        onPressed: () {
                          if (GoRouter.maybeOf(context) != null) {
                            context.push('/app/pos/${session.id}');
                          }
                        },
                      ),
                    if (permissionChecker.hasPermission(AppPermission.cardReturn))
                      OutlinedButton.icon(
                        icon: const Icon(Icons.assignment_return_outlined, size: 14),
                        label: const Text('Return', style: TextStyle(fontSize: 12)),
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        ),
                        onPressed: () {
                          if (GoRouter.maybeOf(context) != null) {
                            context.push('/app/return-card/${session.id}');
                          }
                        },
                      ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
      ),
    );
  }
}
