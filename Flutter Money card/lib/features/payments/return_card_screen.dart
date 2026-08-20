import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/card_session.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/return_card_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/receipt/digital_receipt_dialog.dart';
import '../../widgets/states/app_loading_view.dart';

class ReturnCardScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String? physicalCardNumber;

  const ReturnCardScreen({
    super.key,
    required this.sessionId,
    this.physicalCardNumber,
  });

  @override
  ConsumerState<ReturnCardScreen> createState() => _ReturnCardScreenState();
}

class _ReturnCardScreenState extends ConsumerState<ReturnCardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      ref.read(returnCardNotifierProvider.notifier).reset();
    });
  }

  Future<void> _handleConfirmReturn(CardSession session) async {
    final returnNotifier = ref.read(returnCardNotifierProvider.notifier);

    final confirm = await AppDialog.show(
      context,
      title: 'Confirm Card Return',
      message: session.balance > 0
          ? 'Refund ₹${session.balance.toStringAsFixed(2)} to customer and settle this card session?'
          : 'Settle this card session and return card to AVAILABLE state?',
      confirmLabel: 'Confirm & Settle',
      isDestructive: session.balance > 0,
    );

    if (confirm != true) return;

    final result = await returnNotifier.executeReturn(session.id);

    if (result != null && mounted) {
      // Reload card list & sessions list
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();

      _showReturnSuccessDialog(result);
    }
  }

  void _showReturnSuccessDialog(SessionReturnResult result) {
    final branch = ref.read(currentBranchProvider);
    final user = ref.read(currentUserProvider);
    final session = ref.read(sessionDetailsNotifierProvider).session;
    final cardNum = widget.physicalCardNumber ?? session?.physicalCardNumber ?? widget.sessionId;

    final itemsList = [
      {
        'name': 'Card Return & Balance Refund',
        'quantity': 1,
        'price': result.refundedAmount,
        'total': result.refundedAmount,
      }
    ];

    DigitalReceiptDialog.show(
      context,
      branchName: branch?.name ?? 'Main Cafeteria',
      transactionId: 'SETTLE-${session?.id ?? widget.sessionId}',
      timestamp: DateTime.now(),
      cardIdentifier: cardNum,
      items: itemsList,
      totalAmount: result.refundedAmount,
      remainingBalance: 0.0,
      previousBalance: result.refundedAmount,
      sessionId: session?.id ?? widget.sessionId,
      staffName: user?.name,
      title: 'Card Returned Successfully',
      receiptTitle: 'SETTLEMENT RECEIPT',
      paymentMethod: 'CASH REFUND',
      onDone: () {
        ref.read(returnCardNotifierProvider.notifier).reset();
        context.pop(); // Pop return screen
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final returnState = ref.watch(returnCardNotifierProvider);
    final session = sessionState.session;

    if (sessionState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading session details...'),
      );
    }

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Return Card')),
        body: Center(
          child: Text(
            sessionState.errorMessage ?? 'Session not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final isSettled = session.status == SessionStatus.settled;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Return & Settle Card'),
      ),
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.paddingMd,
          children: [
            // Session Overview Card
            AppCard(
              padding: AppSpacing.paddingLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        widget.physicalCardNumber ?? 'Session ${session.id}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      AppBadge(
                        label: session.status.value,
                        variant: isSettled ? AppBadgeVariant.neutral : AppBadgeVariant.success,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Remaining Balance',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                      Text(
                        '₹${session.balance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Refund Summary Card
            AppCard(
              padding: AppSpacing.paddingLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Refund Calculation',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Refund to Customer:'),
                      Text(
                        '₹${session.balance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: AppSpacing.md),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Icon(Icons.info_outline, size: 16, color: AppColors.primary),
                      SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: Text(
                          'Settle session, refund cash to customer, and return card to AVAILABLE state for future issuance.',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Error Banner
            if (returnState.errorMessage != null) ...[
              Container(
                padding: AppSpacing.paddingMd,
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        returnState.errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],

            // Return & Settle Button
            AppButton(
              label: 'Confirm Return & Settle (₹${session.balance.toStringAsFixed(2)})',
              icon: Icons.assignment_return_outlined,
              isLoading: returnState.isSubmitting,
              onPressed: isSettled || returnState.isSubmitting
                  ? null
                  : () => _handleConfirmReturn(session),
            ),
          ],
        ),
      ),
    );
  }
}
