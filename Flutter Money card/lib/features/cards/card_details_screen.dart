import 'package:flutter/services.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card.dart';
import '../../models/card_session.dart';
import '../../providers/auth_provider.dart';
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
    var branch = ref.read(currentBranchProvider);
    if (branch == null) {
      final branchState = ref.read(branchNotifierProvider);
      if (branchState.assignedBranches.isNotEmpty) {
        branch = branchState.assignedBranches.first;
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
      }
    }

    if (branch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an active branch before activating a card.')),
      );
      return;
    }

    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String? phoneError;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          scrollable: true,
          title: const Text('Confirm Card Activation'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Card Number:'),
                    Text(
                      card.physicalCardNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Branch:'),
                    Text(branch!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text('Starting Balance:'),
                    Text(
                      '\u20b90.00',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
                const Divider(height: AppSpacing.md),
                const Text(
                  'Customer Details (Optional):',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Customer Name',
                    hintText: 'e.g. John Doe',
                    prefixIcon: Icon(Icons.person_outline, size: 18),
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  onChanged: (val) {
                    if (phoneError != null) {
                      setDialogState(() {
                        phoneError = null;
                      });
                    }
                  },
                  decoration: InputDecoration(
                    labelText: 'Phone Number (10 Digits)',
                    hintText: 'e.g. 9876543210',
                    prefixIcon: const Icon(Icons.phone_outlined, size: 18),
                    errorText: phoneError,
                    counterText: '',
                    isDense: true,
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                const Text(
                  'Activating this card will start an active customer session for purchases & recharges.',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final phone = phoneCtrl.text.trim();
                if (phone.isNotEmpty && phone.length != 10) {
                  setDialogState(() {
                    phoneError = 'Phone number must be exactly 10 digits';
                  });
                  return;
                }
                Navigator.of(context).pop(true);
              },
              child: const Text('Confirm & Activate'),
            ),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    final session = await ref.read(sessionDetailsNotifierProvider.notifier).createSession(
          cardId: card.id,
          branchId: branch.id,
          customerName: nameCtrl.text.trim(),
          customerPhone: phoneCtrl.text.trim(),
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
    final currentUser = ref.read(currentUserProvider);
    final currentBranch = ref.read(currentBranchProvider);
    final blockerName = currentUser?.name ?? 'Staff';
    final blockerRole = currentUser?.role ?? 'STAFF';
    final branchName = currentBranch?.name ?? 'Main Branch';
    final defaultBlockerStr = '$blockerName ($blockerRole - $branchName)';

    String selectedReason = 'Lost or Stolen Card';
    final additionalReasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          scrollable: true,
          shape: const RoundedRectangleBorder(borderRadius: AppSpacing.roundedLg),
          title: Row(
            children: const [
              Icon(Icons.block, color: AppColors.error, size: 24),
              SizedBox(width: AppSpacing.xs),
              Text('Block Card', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Are you sure you want to block this card? It will be disabled for purchases.',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const Divider(height: AppSpacing.lg),

              // Default Who is Blocking
              const Text(
                'Blocked By (Default):',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight,
                  borderRadius: AppSpacing.roundedSm,
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.person_pin, size: 16, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        defaultBlockerStr,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Default Reason Selector
              const Text(
                'Primary Reason:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 4),
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                decoration: const InputDecoration(
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'Lost or Stolen Card', child: Text('Lost or Stolen Card', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Damaged / Hardware Failure', child: Text('Damaged / Hardware Failure', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Suspicious Activity / Fraud', child: Text('Suspicious Activity / Fraud', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Customer Request', child: Text('Customer Request', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Staff Discretion', child: Text('Staff Discretion', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Other Reason', child: Text('Other Reason', style: TextStyle(fontSize: 13))),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() {
                      selectedReason = val;
                    });
                  }
                },
              ),
              const SizedBox(height: AppSpacing.md),

              // Additional Reason Option
              const Text(
                'Additional Reason / Notes (Optional):',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 4),
              TextField(
                controller: additionalReasonCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Type additional notes (e.g. customer left card at Counter 3)...',
                  hintStyle: TextStyle(fontSize: 12),
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Block'),
            ),
          ],
        ),
      ),
    );

    if (confirm == true) {
      final additional = additionalReasonCtrl.text.trim();
      final combinedReason = additional.isNotEmpty
          ? '[Blocked by $defaultBlockerStr] $selectedReason: $additional'
          : '[Blocked by $defaultBlockerStr] $selectedReason';

      final success = await ref.read(cardDetailsNotifierProvider.notifier).blockCard(
            reason: combinedReason,
          );
      if (success && mounted) {
        ref.read(cardListNotifierProvider.notifier).loadCards();
        ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Card has been blocked: $combinedReason'),
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
                if (isActive) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Builder(
                    builder: (context) {
                      final branchState = ref.watch(branchNotifierProvider);
                      final sessionBranchName = activeSession?.branchName ?? card.currentBranchName;
                      final matchedBranch = branchState.assignedBranches
                          .where((b) => b.id == (activeSession?.branchId ?? card.currentBranchId))
                          .firstOrNull;
                      final resolvedBranchName = sessionBranchName ??
                          matchedBranch?.name ??
                          branchState.currentBranch?.name ??
                          'Main Branch';

                      return Row(
                        children: [
                          const Icon(
                            Icons.storefront_outlined,
                            size: 15,
                            color: AppColors.textSecondaryLight,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            resolvedBranchName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
                if (isBlocked) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    width: double.infinity,
                    padding: AppSpacing.paddingSm,
                    decoration: BoxDecoration(
                      color: AppColors.errorLight,
                      borderRadius: AppSpacing.roundedSm,
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.block, size: 16, color: AppColors.error),
                            SizedBox(width: 6),
                            Text(
                              'Card is Blocked',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.error,
                              ),
                            ),
                          ],
                        ),
                        if (card.blockedReason != null && card.blockedReason!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            card.blockedReason!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textPrimaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                        if (card.blockedBy != null && card.blockedBy!.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Blocked by: ${card.blockedBy}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
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
                  if (activeSession.customerName != null && activeSession.customerName!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        const Icon(Icons.person_outline, size: 16, color: AppColors.primary),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          'Customer: ${activeSession.customerName}${activeSession.customerPhone != null && activeSession.customerPhone!.isNotEmpty ? " (${activeSession.customerPhone})" : ""}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ],
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
