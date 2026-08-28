import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card_session.dart';
import '../../models/transaction.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_loading_view.dart';

class SessionDetailsScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const SessionDetailsScreen({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<SessionDetailsScreen> createState() => _SessionDetailsScreenState();
}

class _SessionDetailsScreenState extends ConsumerState<SessionDetailsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final current = ref.read(sessionDetailsNotifierProvider).session;
      if (current == null || current.id != widget.sessionId) {
        ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      }
    });
  }

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    try {
      final dt = DateTime.parse(raw).toLocal();
      final date = '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
      final hour = dt.hour.toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      return '$date $hour:$min';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final session = sessionState.session;

    if (sessionState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading session details...'),
      );
    }

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session Details')),
        body: Center(
          child: Text(
            sessionState.errorMessage ?? 'Session not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final isActive = session.status == SessionStatus.active;
    final transactions = session.transactions ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text('Card ${session.physicalCardNumber ?? session.cardId}'),
      ),
      body: ListView(
        padding: AppSpacing.paddingMd,
        children: [
          // Authoritative Balance Card
          AppCard(
            padding: AppSpacing.paddingLg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Session Balance',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    AppBadge(
                      label: session.status.value,
                      variant: isActive ? AppBadgeVariant.success : AppBadgeVariant.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '₹${session.balance.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const Divider(height: AppSpacing.lg),
                Row(
                  children: [
                    const Icon(Icons.credit_card, size: 16, color: AppColors.textSecondaryLight),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Card: ${session.physicalCardNumber ?? session.cardId}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),
                    if (session.sessionCardNumber != null) ...[
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        '(${session.sessionCardNumber})',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                      ),
                    ],
                  ],
                ),
                if (session.customerName != null && session.customerName!.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 16, color: AppColors.primary),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        'Customer: ${session.customerName}${session.customerPhone != null && session.customerPhone!.isNotEmpty ? " (${session.customerPhone})" : ""}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    const Icon(Icons.access_time, size: 16, color: AppColors.textSecondaryLight),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Started: ${_formatDateTime(session.startedAt)}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
                if (session.settledAt != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      const Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        'Settled: ${_formatDateTime(session.settledAt)}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Operational Actions
          if (isActive) ...[
            const SectionHeader(title: 'Session Operations'),
            const SizedBox(height: AppSpacing.sm),

            PermissionGuard.single(
              permission: AppPermission.recharge,
              child: AppButton(
                label: 'Recharge Card (Cash / UPI)',
                icon: Icons.add_card,
                onPressed: () => context.push('/app/recharge/${session.id}'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            PermissionGuard.single(
              permission: AppPermission.purchase,
              child: AppOutlinedButton(
                label: 'New POS Purchase',
                icon: Icons.point_of_sale,
                onPressed: () => context.push('/app/pos/${session.id}'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            PermissionGuard.single(
              permission: AppPermission.cardReturn,
              child: AppOutlinedButton(
                label: 'Return & Settle Card',
                icon: Icons.assignment_return_outlined,
                onPressed: () => context.push('/app/return/${session.id}'),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],

          // ─── Transaction History & Purchased Products ─────────────────
          const SectionHeader(title: 'Transactions & Purchased Products'),
          const SizedBox(height: AppSpacing.sm),

          if (transactions.isEmpty)
            AppCard(
              padding: AppSpacing.paddingLg,
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 36, color: Colors.grey.shade400),
                    const SizedBox(height: AppSpacing.xs),
                    const Text(
                      'No transactions in this session yet.',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
              ),
            )
          else
            ...transactions.map((txn) => _buildTransactionCard(txn)),

          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }

  Widget _buildTransactionCard(Transaction txn) {
    final isPurchase = txn.type == TransactionType.purchase;
    final isRecharge = txn.type == TransactionType.recharge;

    final items = txn.items ?? [];

    Color badgeBg;
    Color badgeFg;
    IconData icon;
    String typeLabel;

    if (isRecharge) {
      badgeBg = AppColors.successLight;
      badgeFg = AppColors.success;
      icon = Icons.arrow_upward;
      typeLabel = 'Wallet Recharge (${txn.paymentMethod?.value ?? "CASH"})';
    } else if (isPurchase) {
      badgeBg = AppColors.primaryLight;
      badgeFg = AppColors.primary;
      icon = Icons.shopping_bag_outlined;
      typeLabel = 'POS Purchase';
    } else {
      badgeBg = AppColors.warningLight;
      badgeFg = AppColors.warning;
      icon = Icons.assignment_return_outlined;
      typeLabel = 'Settlement Refund';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Padding(
            padding: AppSpacing.paddingMd,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: badgeFg, size: 20),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        typeLabel,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatDateTime(txn.createdAt),
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
                      '${isRecharge ? "+" : isPurchase ? "-" : ""}₹${txn.amount.toStringAsFixed(2)}',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isRecharge
                            ? AppColors.success
                            : isPurchase
                                ? AppColors.error
                                : AppColors.textPrimaryLight,
                      ),
                    ),
                    if (txn.balanceAfter != null)
                      Text(
                        'Bal: ₹${txn.balanceAfter!.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),

          // ─── Purchased Products Breakdown ─────────────────────────────
          if (isPurchase && items.isNotEmpty) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.restaurant_menu, size: 14, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Text(
                        'Purchased Products (${items.length})',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey.shade700,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 12),
                  ...items.map((it) {
                    final itemName = it.itemName ?? it.productId;
                    final qty = it.quantity;
                    final unitPrice = it.unitPrice ?? 0.0;
                    final total = it.totalAmount ?? (unitPrice * qty);

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Text(
                                  itemName,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimaryLight,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '× $qty',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            unitPrice > 0
                                ? '₹${unitPrice.toStringAsFixed(2)} ea  •  ₹${total.toStringAsFixed(2)}'
                                : '₹${total.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}
