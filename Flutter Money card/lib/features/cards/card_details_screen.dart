import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card.dart';
import '../../models/card_session.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_loading_view.dart';

class CardDetailsScreen extends ConsumerStatefulWidget {
  final String cardId;
  final Card? initialCard;
  final CardSession? initialSession;

  const CardDetailsScreen({
    super.key,
    required this.cardId,
    this.initialCard,
    this.initialSession,
  });

  @override
  ConsumerState<CardDetailsScreen> createState() => _CardDetailsScreenState();
}

class _CardDetailsScreenState extends ConsumerState<CardDetailsScreen> {
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialCard != null) {
        ref.read(cardDetailsNotifierProvider.notifier).setResolvedCard(
              widget.initialCard!,
              widget.initialSession,
            );
      } else {
        ref.read(cardDetailsNotifierProvider.notifier).loadCardById(widget.cardId);
      }
    });
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  AppBadgeVariant _getCardStatusVariant(CardStatus status) {
    switch (status) {
      case CardStatus.available:
        return AppBadgeVariant.primary;
      case CardStatus.active:
        return AppBadgeVariant.success;
      case CardStatus.blocked:
        return AppBadgeVariant.error;
    }
  }

  Future<void> _handleStartSession(Card card) async {
    final branch = ref.read(currentBranchProvider);
    if (branch == null) return;

    final session = await ref.read(sessionDetailsNotifierProvider.notifier).createSession(
          cardId: card.id,
          branchId: branch.id,
        );

    if (session != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Active session created successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      // Reload card and card lists
      ref.read(cardDetailsNotifierProvider.notifier).setResolvedCard(
            card.copyWith(status: CardStatus.active),
            session,
          );
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
    }
  }

  Future<void> _handleBlockCard() async {
    final confirm = await AppDialog.show(
      context,
      title: 'Block Card',
      message: 'Are you sure you want to block this card? It will be disabled for purchases.',
      confirmLabel: 'Block',
      isDestructive: true,
    );

    if (confirm == true) {
      final success = await ref.read(cardDetailsNotifierProvider.notifier).blockCard(
            reason: 'Blocked by Staff',
          );
      if (success && mounted) {
        ref.read(cardListNotifierProvider.notifier).loadCards();
        ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Card has been blocked.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _handleUnblockCard() async {
    final confirm = await AppDialog.show(
      context,
      title: 'Unblock Card',
      message: 'Unblocking this card will make it available for transactions again.',
      confirmLabel: 'Unblock',
    );

    if (confirm == true) {
      final success = await ref.read(cardDetailsNotifierProvider.notifier).unblockCard();
      if (success && mounted) {
        ref.read(cardListNotifierProvider.notifier).loadCards();
        ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Card unblocked successfully.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    final cardState = ref.watch(cardDetailsNotifierProvider);
    final card = cardState.card;
    final activeSession = cardState.activeSession;

    if (cardState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading card details...'),
      );
    }

    if (card == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Card Details')),
        body: Center(
          child: Text(
            cardState.errorMessage ?? 'Card not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final isAvailable = card.status == CardStatus.available;
    final isActive = card.status == CardStatus.active;
    final isBlocked = card.status == CardStatus.blocked;

    return Scaffold(
      appBar: AppBar(
        title: Text('Card ${card.physicalCardNumber}'),
      ),
      body: ListView(
        padding: AppSpacing.paddingMd,
        children: [
          // Card Header Summary Card
          AppCard(
            padding: AppSpacing.paddingLg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      card.physicalCardNumber,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                      ),
                    ),
                    AppBadge(
                      label: card.status.value,
                      variant: _getCardStatusVariant(card.status),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    const Icon(Icons.qr_code, size: 16, color: AppColors.textSecondaryLight),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'QR: ${card.qrToken}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Active Session Card (if session is active)
          if (isActive && activeSession != null) ...[
            const SectionHeader(title: 'Active Session'),
            const SizedBox(height: AppSpacing.xs),
            AppCard(
              padding: AppSpacing.paddingLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Current Balance',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                      const AppBadge(
                        label: 'SESSION ACTIVE',
                        variant: AppBadgeVariant.success,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    '₹${activeSession.balance.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  const Divider(height: AppSpacing.lg),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 16, color: AppColors.textSecondaryLight),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        'Started: ${activeSession.startedAt}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],

          // Actions Section
          const SectionHeader(title: 'Card Actions'),
          const SizedBox(height: AppSpacing.sm),

          // Start Session Action (when available)
          if (isAvailable)
            PermissionGuard.single(
              permission: AppPermission.cardIssue,
              child: AppButton(
                label: 'Start Active Session',
                icon: Icons.play_arrow,
                isLoading: cardState.isSubmitting,
                onPressed: cardState.isSubmitting ? null : () => _handleStartSession(card),
              ),
            ),

          // POS Purchase & Recharge Actions (when active)
          if (isActive && activeSession != null) ...[
            PermissionGuard.single(
              permission: AppPermission.recharge,
              child: AppButton(
                label: 'Recharge Card (Cash / UPI)',
                icon: Icons.add_card,
                onPressed: () => context.push(
                  '/app/recharge/${activeSession.id}?card=${card.physicalCardNumber}',
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.purchase,
              child: AppOutlinedButton(
                label: 'New POS Purchase',
                icon: Icons.point_of_sale,
                onPressed: () => context.push('/app/pos/${activeSession.id}'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.cardReturn,
              child: AppOutlinedButton(
                label: 'Return & Settle Card',
                icon: Icons.assignment_return_outlined,
                onPressed: () => context.push(
                  '/app/return/${activeSession.id}?card=${card.physicalCardNumber}',
                ),
              ),
            ),
          ],

          // Block / Unblock Actions
          if (isBlocked) ...[
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.cardUnblock,
              child: AppButton(
                label: 'Unblock Card',
                icon: Icons.lock_open,
                backgroundColor: AppColors.success,
                isLoading: cardState.isSubmitting,
                onPressed: cardState.isSubmitting ? null : _handleUnblockCard,
              ),
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.cardBlock,
              child: AppOutlinedButton(
                label: 'Block Card',
                icon: Icons.block,
                textColor: AppColors.error,
                borderColor: AppColors.error,
                onPressed: cardState.isSubmitting ? null : _handleBlockCard,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
