import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card_session.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/section_header.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
    });
  }

  String _formatDateTime(String dateTimeStr) {
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return DateFormat('dd MMM, hh:mm a').format(dateTime.toLocal());
    } catch (_) {
      return dateTimeStr;
    }
  }

  void _safePush(String route) {
    if (GoRouter.maybeOf(context) != null) {
      context.push(route);
    }
  }

  void _safeGo(String route) {
    if (GoRouter.maybeOf(context) != null) {
      context.go(route);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentBranchProvider, (_, _) {
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
    });

    final user = ref.watch(currentUserProvider);
    final currentBranch = ref.watch(currentBranchProvider);
    final sessionListState = ref.watch(sessionListNotifierProvider);
    final sessionNotifier = ref.read(sessionListNotifierProvider.notifier);
    final permissionChecker = ref.watch(permissionCheckerProvider);

    final canIssueCard = permissionChecker.hasPermission(AppPermission.cardIssue);

    // Filter strictly for ACTIVE sessions
    final activeSessions = sessionListState.sessions
        .where((s) => s.status == SessionStatus.active)
        .toList();
    final activeCount = activeSessions.length;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await sessionNotifier.loadSessions();
          },
          child: ListView(
            padding: AppSpacing.paddingMd,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              // 1. Staff Greeting & Active Branch Banner
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello, ${user?.name.split(' ').first ?? 'Staff'}',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      Text(
                        currentBranch != null
                            ? 'Branch: ${currentBranch.name}'
                            : 'Ready for cafeteria transactions',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  if (user != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        user.role,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // 2. Primary Action: Large Prominent SCAN CARD Box
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _safePush('/app/scanner'),
                  borderRadius: AppSpacing.roundedLg,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 28, horizontal: AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: AppSpacing.roundedLg,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.qr_code_scanner,
                            size: 40,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        const Text(
                          'SCAN QR CARD',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "Scan card to start purchase or view balance",
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // 3. Quick Action Buttons Row (Issue New Card, Sessions, Inventory, Analytics)
              Row(
                children: [
                  if (canIssueCard)
                    Expanded(
                      child: _buildQuickActionCard(
                        icon: Icons.add_card,
                        label: 'Issue New Card',
                        onTap: () => _safePush('/app/cards/issue'),
                      ),
                    ),
                  if (canIssueCard) const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.credit_card,
                      label: 'Sessions',
                      onTap: () => _safeGo('/app/sessions'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.inventory_2_outlined,
                      label: 'Inventory',
                      onTap: () => _safePush('/app/inventory'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.analytics_outlined,
                      label: 'Analytics',
                      onTap: () => _safePush('/app/analytics'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // 4. Metric Row: Dynamic Active Sessions Summary
              AppCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 14,
                ),
                onTap: () => _safeGo('/app/sessions'),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: AppSpacing.roundedSm,
                          ),
                          child: const Icon(
                            Icons.credit_card_outlined,
                            color: AppColors.primaryDark,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Active Sessions',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              currentBranch != null
                                  ? '${currentBranch.name} • Active only'
                                  : 'Active card sessions',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        if (sessionListState.isLoading)
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        else if (sessionListState.errorMessage != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.errorLight,
                              borderRadius: AppSpacing.roundedSm,
                            ),
                            child: const Text(
                              'Error',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.error,
                              ),
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: activeCount > 0
                                  ? AppColors.primaryLight
                                  : AppColors.surfaceVariantLight,
                              borderRadius: AppSpacing.roundedSm,
                            ),
                            child: Text(
                              '$activeCount',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: activeCount > 0
                                    ? AppColors.primaryDark
                                    : AppColors.textTertiaryLight,
                              ),
                            ),
                          ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.chevron_right,
                          color: AppColors.textTertiaryLight,
                          size: 18,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // 5. Active Sessions Live Preview Section Header
              SectionHeader(
                title: 'Active Sessions',
                actionLabel: activeCount > 0 ? 'View All ($activeCount)' : null,
                onAction: () => _safeGo('/app/sessions'),
              ),
              const SizedBox(height: AppSpacing.xs),

              // 6. Active Sessions Live Content
              _buildActiveSessionsContent(
                context,
                sessionListState,
                activeSessions,
                sessionNotifier,
                currentBranch?.name,
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimaryLight,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildActiveSessionsContent(
    BuildContext context,
    SessionListState state,
    List<CardSession> activeSessions,
    SessionListNotifier notifier,
    String? branchName,
  ) {
    if (state.isLoading) {
      return AppCard(
        padding: AppSpacing.paddingLg,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: AppSpacing.md),
            Text(
              'Loading active sessions...',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondaryLight,
              ),
            ),
          ],
        ),
      );
    }

    if (state.errorMessage != null) {
      return AppCard(
        padding: AppSpacing.paddingMd,
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    state.errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: notifier.loadSessions,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Retry'),
              ),
            ),
          ],
        ),
      );
    }

    if (activeSessions.isEmpty) {
      return AppCard(
        padding: AppSpacing.paddingLg,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: const BoxDecoration(
                color: AppColors.surfaceLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.credit_card_off_outlined,
                size: 32,
                color: AppColors.textTertiaryLight,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            const Text(
              'No Active Sessions',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'There are no active customer sessions in this branch right now.',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondaryLight,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    // Display top active sessions (up to 3 items)
    final previewSessions = activeSessions.take(3).toList();

    return Column(
      children: previewSessions.map((session) {
        final cardIdentifier = session.physicalCardNumber ?? session.cardId;

        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: AppCard(
            padding: AppSpacing.paddingMd,
            onTap: () => _safePush('/app/sessions/${session.id}'),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: const BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.credit_card,
                    color: AppColors.primaryDark,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Card: $cardIdentifier',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimaryLight,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          const AppBadge(
                            label: 'ACTIVE',
                            variant: AppBadgeVariant.success,
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Started: ${_formatDateTime(session.startedAt)}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '₹${session.balance.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const Text(
                      'Balance',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppColors.textTertiaryLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.chevron_right,
                  color: AppColors.textTertiaryLight,
                  size: 18,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
