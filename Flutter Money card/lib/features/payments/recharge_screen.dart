import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/card_session.dart';
import '../../models/transaction.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/recharge_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/receipt/digital_receipt_dialog.dart';
import '../../widgets/states/app_loading_view.dart';

class RechargeScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String? physicalCardNumber;

  const RechargeScreen({
    super.key,
    required this.sessionId,
    this.physicalCardNumber,
  });

  @override
  ConsumerState<RechargeScreen> createState() => _RechargeScreenState();
}

class _RechargeScreenState extends ConsumerState<RechargeScreen> {
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  final List<double> _quickAmounts = [50.0, 100.0, 200.0, 500.0];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      ref.read(rechargeNotifierProvider.notifier).reset();
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  void _onAmountChanged(String val) {
    final parsed = double.tryParse(val.trim()) ?? 0.0;
    ref.read(rechargeNotifierProvider.notifier).setAmount(parsed);
  }

  void _onReferenceChanged(String val) {
    ref.read(rechargeNotifierProvider.notifier).setPaymentReference(val);
  }

  void _addQuickAmount(double amount) {
    final current = double.tryParse(_amountController.text.trim()) ?? 0.0;
    final total = current + amount;
    _amountController.text = total.toStringAsFixed(0);
    ref.read(rechargeNotifierProvider.notifier).setAmount(total);
  }

  Future<void> _handleConfirmRecharge(CardSession session) async {
    final rechargeState = ref.read(rechargeNotifierProvider);
    final rechargeNotifier = ref.read(rechargeNotifierProvider.notifier);

    if (!_formKey.currentState!.validate() || !rechargeState.canSubmit) {
      return;
    }

    final newExpectedBalance = session.balance + rechargeState.amount;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: const Text('Confirm Recharge'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Card: ${session.displayCardNumber}'),
            if (session.customerName != null && session.customerName!.isNotEmpty)
              Text('Customer: ${session.customerName}'),
            const SizedBox(height: AppSpacing.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Current Balance:'),
                Text('₹${session.balance.toStringAsFixed(2)}'),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recharge Amount:'),
                Text(
                  '+₹${rechargeState.amount.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.success),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Payment Method:'),
                Text(
                  rechargeState.paymentMethod == PaymentMethod.upi
                      ? 'UPI (Manual Verification)'
                      : 'CASH',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            if (rechargeState.paymentReference != null &&
                rechargeState.paymentReference!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Reference:'),
                  Text(
                    rechargeState.paymentReference!,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ],
              ),
            ],
            const Divider(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Expected New Balance:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  '₹${newExpectedBalance.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final result = await rechargeNotifier.executeRecharge(session.id);

    if (result != null && mounted) {
      _showRechargeSuccessDialog(result);
    }
  }

  void _showRechargeSuccessDialog(RechargeResult result) {
    final branch = ref.read(currentBranchProvider);
    final user = ref.read(currentUserProvider);
    final session = ref.read(sessionDetailsNotifierProvider).session;
    final cardNum = widget.physicalCardNumber != null ? cleanDisplayCardNumber(widget.physicalCardNumber) : (session?.displayCardNumber ?? 'Card');
    final rechargeState = ref.read(rechargeNotifierProvider);

    final itemsList = [
      {
        'name': 'Card Balance Recharge (${result.paymentMethod.value})',
        'quantity': 1,
        'price': result.amount,
        'total': result.amount,
      }
    ];

    final rechargeAmt = result.amount > 0 ? result.amount : rechargeState.amount;
    final newBal = result.balance;
    final prevBal = (result.balanceBefore != null && result.balanceBefore! > 0)
        ? result.balanceBefore!
        : ((session?.balance != null && session!.balance > 0)
            ? session.balance
            : (newBal - rechargeAmt).clamp(0.0, double.infinity));

    DigitalReceiptDialog.show(
      context,
      branchName: branch?.name ?? 'Main Cafeteria',
      transactionId: result.transactionId.isNotEmpty
          ? result.transactionId
          : 'RCH-${DateTime.now().millisecondsSinceEpoch}',
      timestamp: DateTime.now(),
      cardIdentifier: cardNum,
      items: itemsList,
      totalAmount: rechargeAmt,
      remainingBalance: newBal,
      previousBalance: prevBal,
      amountDeducted: rechargeAmt,
      subtotal: rechargeAmt,
      sessionId: session?.id ?? widget.sessionId,
      staffName: user?.name,
      title: 'Recharge Successful',
      receiptTitle: 'RECHARGE RECEIPT',
      paymentMethod: result.paymentMethod.value,
      paymentReference: rechargeState.paymentReference,
      onDone: () {
        ref.read(rechargeNotifierProvider.notifier).reset();
        context.pop(); // Return to previous screen
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final rechargeState = ref.watch(rechargeNotifierProvider);
    final rechargeNotifier = ref.read(rechargeNotifierProvider.notifier);
    final session = sessionState.session;

    if (sessionState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading session details...'),
      );
    }

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Recharge Card')),
        body: Center(
          child: Text(
            sessionState.errorMessage ?? 'Session not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final newPreviewBalance = session.balance + rechargeState.amount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recharge Card Session'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: AppSpacing.paddingMd,
            children: [
              // Current Session / Balance Card
              AppCard(
                padding: AppSpacing.paddingLg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.physicalCardNumber != null ? cleanDisplayCardNumber(widget.physicalCardNumber) : session.displayCardNumber,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const AppBadge(
                          label: 'ACTIVE',
                          variant: AppBadgeVariant.success,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Current Balance',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondaryLight,
                          ),
                        ),
                        Text(
                          '₹${session.balance.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 22,
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

              // Payment Method Selector
              const Text(
                'Payment Method',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              SegmentedButton<PaymentMethod>(
                segments: const [
                  ButtonSegment(
                    value: PaymentMethod.cash,
                    label: Text('CASH'),
                    icon: Icon(Icons.payments_outlined),
                  ),
                  ButtonSegment(
                    value: PaymentMethod.upi,
                    label: Text('UPI'),
                    icon: Icon(Icons.account_balance_wallet_outlined),
                  ),
                ],
                selected: {rechargeState.paymentMethod},
                onSelectionChanged: (set) {
                  if (set.isNotEmpty) {
                    rechargeNotifier.setPaymentMethod(set.first);
                  }
                },
              ),
              const SizedBox(height: AppSpacing.lg),

              // UPI Manual Verification Section (when UPI selected)
              if (rechargeState.paymentMethod == PaymentMethod.upi) ...[
                AppCard(
                  padding: AppSpacing.paddingLg,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.verified_outlined, size: 20, color: AppColors.primary),
                          SizedBox(width: AppSpacing.xs),
                          Text(
                            'UPI Payment Verification',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Container(
                        padding: AppSpacing.paddingSm,
                        decoration: BoxDecoration(
                          color: AppColors.infoLight,
                          borderRadius: AppSpacing.roundedSm,
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.storefront_outlined, size: 18, color: AppColors.info),
                            SizedBox(width: AppSpacing.xs),
                            Expanded(
                              child: Text(
                                'Customer pays using the store\'s existing counter UPI QR code.',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textPrimaryLight,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // Optional Payment Reference Input
                      const Text(
                        'Payment Reference / UTR (Optional)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: AppSpacing.xxs),
                      TextFormField(
                        controller: _referenceController,
                        onChanged: _onReferenceChanged,
                        decoration: const InputDecoration(
                          hintText: 'e.g. UTR number / Transaction Ref',
                          prefixIcon: Icon(Icons.tag, size: 18),
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      // Staff Verification Checkbox
                      Material(
                        type: MaterialType.transparency,
                        child: CheckboxListTile(
                          value: rechargeState.isStaffVerified,
                          onChanged: (val) =>
                              rechargeNotifier.setStaffVerified(val ?? false),
                          title: const Text(
                            'Payment received and verified by Staff',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          subtitle: const Text(
                            'Confirm transaction success on customer\'s phone',
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: EdgeInsets.zero,
                          activeColor: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],

              // Amount Input Field
              const Text(
                'Recharge Amount (₹)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: _onAmountChanged,
                decoration: const InputDecoration(
                  hintText: 'Enter amount (e.g. 200)',
                  prefixIcon: Icon(Icons.currency_rupee, size: 20),
                  isDense: true,
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Amount is required';
                  }
                  final parsed = double.tryParse(val.trim());
                  if (parsed == null || parsed <= 0) {
                    return 'Amount must be greater than 0';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.sm),

              // Quick Amount Chips
              Wrap(
                spacing: AppSpacing.sm,
                children: _quickAmounts.map((amt) {
                  return ActionChip(
                    label: Text('+₹${amt.toStringAsFixed(0)}'),
                    onPressed: () => _addQuickAmount(amt),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Expected New Balance Preview
              if (rechargeState.amount > 0) ...[
                AppCard(
                  padding: AppSpacing.paddingMd,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Expected New Balance:',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                      ),
                      Text(
                        '₹${newPreviewBalance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],

              // Error Banner
              if (rechargeState.errorMessage != null) ...[
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
                          rechargeState.errorMessage!,
                          style: const TextStyle(color: AppColors.error, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ],

              // Submit Button
              AppButton(
                label: 'Confirm Recharge',
                icon: Icons.account_balance_wallet,
                isLoading: rechargeState.isSubmitting,
                onPressed: rechargeState.canSubmit
                    ? () => _handleConfirmRecharge(session)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
