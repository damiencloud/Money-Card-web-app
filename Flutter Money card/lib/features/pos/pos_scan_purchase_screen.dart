import '../../models/transaction.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card.dart';
import '../../models/card_session.dart';
import '../../providers/api_providers.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_bottom_sheet.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/scanner/qr_scanner_view.dart';
import '../../widgets/states/app_loading_view.dart';

class PosScanPurchaseScreen extends ConsumerStatefulWidget {
  const PosScanPurchaseScreen({super.key});

  @override
  ConsumerState<PosScanPurchaseScreen> createState() => _PosScanPurchaseScreenState();
}

class _PosScanPurchaseScreenState extends ConsumerState<PosScanPurchaseScreen> {
  // Resolution state
  String? _scannedQrToken;
  bool _isResolving = false;
  String? _scanErrorMessage;
  Card? _resolvedCard;
  CardSession? _activeSession;

  // Settlement success state
  SessionReturnResult? _settlementResult;

  @override
  void initState() {
    super.initState();
  }

  void _resetScan() {
    setState(() {
      _scannedQrToken = null;
      _isResolving = false;
      _scanErrorMessage = null;
      _resolvedCard = null;
      _activeSession = null;
      _settlementResult = null;
    });
  }

  Future<void> _handleQrScanned(String qrToken) async {
    debugPrint('SCANNED QR RAW VALUE: $qrToken');
    if (_isResolving || qrToken == _scannedQrToken) return;

    setState(() {
      _scannedQrToken = qrToken;
      _isResolving = true;
      _scanErrorMessage = null;
      _resolvedCard = null;
      _activeSession = null;
      _settlementResult = null;
    });

    try {
      final cardRepo = ref.read(cardRepositoryProvider);
      final result = await cardRepo.resolveCardByQr(qrToken);

      if (!mounted) return;

      setState(() {
        _isResolving = false;
        _resolvedCard = result.card;
        _activeSession = result.session;
      });

      if (result.session != null) {
        ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(result.session!.id);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isResolving = false;
        _scanErrorMessage = e.toString().replaceAll('ApiException: ', '');
      });
    }
  }

  Future<void> _refreshSession() async {
    final sessionId = _activeSession?.id;
    if (sessionId == null) return;

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final updatedSession = await sessionRepo.getSessionById(sessionId);

      if (mounted) {
        setState(() {
          _activeSession = updatedSession;
        });
        ref.read(sessionListNotifierProvider.notifier).loadSessions();
      }
    } catch (_) {
      // Ignore background refresh errors
    }
  }

  String _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null || dateTimeStr.isEmpty) return 'N/A';
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return DateFormat('dd MMM yyyy, hh:mm a').format(dateTime.toLocal());
    } catch (_) {
      return dateTimeStr;
    }
  }

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  Future<void> _openAddProducts() async {
    final session = _activeSession;
    if (session == null) return;

    if (GoRouter.maybeOf(context) != null) {
      await context.push('/app/pos/${session.id}');
    }
    await _refreshSession();
  }

  Future<void> _openRecharge() async {
    final session = _activeSession;
    if (session == null) return;

    if (GoRouter.maybeOf(context) != null) {
      await context.push('/app/recharge/${session.id}');
    }
    await _refreshSession();
  }

  Future<void> _openViewSession() async {
    final session = _activeSession;
    if (session == null) return;

    if (GoRouter.maybeOf(context) != null) {
      await context.push('/app/sessions/${session.id}');
    }
    await _refreshSession();
  }

  void _showTransactionsBottomSheet() {
    final session = _activeSession;
    final card = _resolvedCard;
    if (session == null || card == null) return;

    final txns = session.transactions ?? [];

    AppBottomSheet.show(
      context,
      title: 'Session Transactions (${card.physicalCardNumber})',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: AppSpacing.paddingMd,
            decoration: BoxDecoration(
              color: AppColors.surfaceVariantLight,
              borderRadius: AppSpacing.roundedSm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Current Balance:', style: TextStyle(fontWeight: FontWeight.w500)),
                Text(
                  '₹${session.balance.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Activity & Purchases',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              if (txns.isNotEmpty)
                Text(
                  '${txns.length} transaction${txns.length > 1 ? "s" : ""}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.account_balance_wallet, color: AppColors.primary, size: 20),
            ),
            title: const Text('Live Available Funds', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: const Text('Usable for cafeteria purchases', style: TextStyle(fontSize: 12)),
            trailing: Text(
              '₹${session.balance.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
            ),
          ),
          const Divider(height: 1),
          if (txns.isEmpty) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.check_circle_outline, color: AppColors.success, size: 20),
              ),
              title: const Text('Session Started', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text(_formatDateTime(session.startedAt), style: const TextStyle(fontSize: 12)),
              trailing: const AppBadge(label: 'ACTIVE', variant: AppBadgeVariant.success),
            ),
          ] else ...[
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 320),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: txns.length,
                separatorBuilder: (context, index) => const Divider(height: 12),
                itemBuilder: (context, idx) {
                  final t = txns[idx];
                  final isPurch = t.type == TransactionType.purchase;
                  final isRech = t.type == TransactionType.recharge;
                  final items = t.items ?? [];

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: isRech
                                  ? AppColors.successLight
                                  : isPurch
                                      ? AppColors.primaryLight
                                      : AppColors.warningLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Icon(
                              isRech
                                  ? Icons.arrow_upward
                                  : isPurch
                                      ? Icons.shopping_bag_outlined
                                      : Icons.assignment_return_outlined,
                              size: 16,
                              color: isRech
                                  ? AppColors.success
                                  : isPurch
                                      ? AppColors.primary
                                      : AppColors.warning,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isRech
                                      ? 'Recharge (${t.paymentMethod?.value ?? "CASH"})'
                                      : isPurch
                                          ? 'POS Purchase'
                                          : 'Settlement Refund',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Text(
                                  _formatDateTime(t.createdAt),
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${isRech ? "+" : isPurch ? "-" : ""}₹${t.amount.toStringAsFixed(2)}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: isRech
                                  ? AppColors.success
                                  : isPurch
                                      ? AppColors.error
                                      : AppColors.textPrimaryLight,
                            ),
                          ),
                        ],
                      ),
                      if (isPurch && items.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: items.map((it) {
                              final name = it.itemName ?? it.productId;
                              final subtotal = it.totalAmount ?? ((it.unitPrice ?? 0) * it.quantity);
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '$name × ${it.quantity}',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                    Text(
                                      '₹${subtotal.toStringAsFixed(2)}',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Close',
            isFullWidth: true,
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSettleReturn() async {
    final session = _activeSession;
    final card = _resolvedCard;
    if (session == null || card == null) return;

    final confirm = await AppDialog.show(
      context,
      title: 'Confirm Card Return & Settlement',
      message: session.balance > 0
          ? 'Refund remaining balance of ₹${session.balance.toStringAsFixed(2)} to customer and settle this card session?'
          : 'Settle this card session and return card ${card.physicalCardNumber} to AVAILABLE state?',
      confirmLabel: 'Confirm & Settle',
      isDestructive: session.balance > 0,
    );

    if (confirm != true) return;

    setState(() {
      _isResolving = true;
    });

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final result = await sessionRepo.returnSession(session.id);

      // Refresh global stores
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(cardListNotifierProvider.notifier).loadCards();

      if (mounted) {
        setState(() {
          _isResolving = false;
          _settlementResult = result;
          _activeSession = _activeSession?.copyWith(
            status: SessionStatus.settled,
            balance: 0.0,
          );
          _resolvedCard = _resolvedCard?.copyWith(
            status: CardStatus.available,
          );
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isResolving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settlement failed: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  // ==========================================
  // BUILD METHOD
  // ==========================================

  @override
  Widget build(BuildContext context) {
    // 1. Settlement Success State
    if (_settlementResult != null && _resolvedCard != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Card Return & Settlement'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (GoRouter.maybeOf(context) != null) {
                context.go('/app/home');
              } else {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ),
        body: Center(
          child: Padding(
            padding: AppSpacing.paddingLg,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle, size: 54, color: AppColors.success),
                ),
                const SizedBox(height: AppSpacing.md),
                const Text(
                  'Card Returned Successfully',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Card: ${_resolvedCard!.physicalCardNumber.toUpperCase().startsWith("MC-") ? _resolvedCard!.physicalCardNumber : "MC-${_resolvedCard!.physicalCardNumber}"}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: AppSpacing.sm),
                Container(
                  padding: AppSpacing.paddingMd,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: AppSpacing.roundedSm,
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Refunded Amount:'),
                          Text(
                            '₹${_settlementResult!.refundedAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('Card Status:'),
                          AppBadge(label: 'AVAILABLE', variant: AppBadgeVariant.primary),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('Session Status:'),
                          AppBadge(label: 'SETTLED', variant: AppBadgeVariant.neutral),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                const Text(
                  'This card has been returned to inventory and is ready for new issuance.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: 'Scan Another Card',
                  icon: Icons.qr_code_scanner,
                  onPressed: _resetScan,
                ),
                const SizedBox(height: AppSpacing.sm),
                AppOutlinedButton(
                  label: 'Back to Home',
                  icon: Icons.home_outlined,
                  onPressed: () {
                    if (GoRouter.maybeOf(context) != null) {
                      context.go('/app/home');
                    } else {
                      Navigator.of(context).maybePop();
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    // 2. Unregistered Error State
    if (_scanErrorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Card'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: AppSpacing.paddingLg,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: const BoxDecoration(
                    color: AppColors.errorLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.credit_card_off, size: 48, color: AppColors.error),
                ),
                const SizedBox(height: AppSpacing.md),
                const Text(
                  'Card Not Registered',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                const Text(
                  'This QR card is not registered in your organization.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: AppOutlinedButton(
                        label: 'Cancel',
                        icon: Icons.close,
                        onPressed: () => context.pop(),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppButton(
                        label: 'Scan Another',
                        icon: Icons.qr_code_scanner,
                        onPressed: _resetScan,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    // 3. Card Resolved but BLOCKED
    if (_resolvedCard != null && _resolvedCard!.status == CardStatus.blocked) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Card'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Padding(
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
                child: const Icon(Icons.block, size: 48, color: AppColors.error),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                _resolvedCard!.physicalCardNumber,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              const AppBadge(
                label: 'BLOCKED',
                variant: AppBadgeVariant.error,
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Card is BLOCKED. Cannot perform operations on a blocked card.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: AppOutlinedButton(
                      label: 'Cancel',
                      icon: Icons.close,
                      onPressed: () => context.pop(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: AppButton(
                      label: 'Scan Another',
                      icon: Icons.qr_code_scanner,
                      onPressed: _resetScan,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    // 4. Card Resolved but AVAILABLE (No Active Session)
    if (_resolvedCard != null && (_activeSession == null || _activeSession!.status != SessionStatus.active)) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Card'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.warningLight.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.info_outline, size: 48, color: AppColors.warning),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                _resolvedCard!.physicalCardNumber,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              const AppBadge(
                label: 'AVAILABLE',
                variant: AppBadgeVariant.primary,
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Card has no active session.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'A card session must be issued before making purchases or recharging.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Issue Card Session First',
                icon: Icons.add_card,
                onPressed: () {
                  context.pushReplacement(
                    '/app/cards/issue',
                  );
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              AppOutlinedButton(
                label: 'Scan Another Card',
                icon: Icons.qr_code_scanner,
                onPressed: _resetScan,
              ),
            ],
          ),
        ),
      );
    }

    // 5. Card Resolved & Active Session Exists -> SHOW ACTIVE CARD ACTION HUB!
    if (_resolvedCard != null && _activeSession != null) {
      return _buildActiveCardActionHub();
    }

    // 6. Default: Live Camera Scanner View
    return Scaffold(
      body: Stack(
        children: [
          QrScannerView(
            title: 'Scan QR Card',
            prompt: 'Point camera at customer\'s Money Card QR code',
            onQrScanned: _handleQrScanned,
          ),
          if (AppConfig.useMockApi)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    if (GoRouter.maybeOf(context) != null) {
                      context.push('/app/more/mock-qr');
                    }
                  },
                  borderRadius: AppSpacing.roundedSm,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black87,
                      borderRadius: AppSpacing.roundedSm,
                      border: Border.all(
                        color: AppColors.primaryLight.withValues(alpha: 0.6),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.qr_code_2, color: AppColors.primaryLight, size: 18),
                        SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Mock Mode: Tap to view scannable Mock QRs',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          if (_isResolving)
            Container(
              color: Colors.black54,
              child: const Center(
                child: AppLoadingView(
                  message: 'Resolving card & session...',
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ==========================================
  // ACTIVE CARD ACTION HUB WIDGET
  // ==========================================

  Widget _buildActiveCardActionHub() {
    final card = _resolvedCard!;
    final session = _activeSession!;
    final permissions = ref.watch(permissionCheckerProvider);

    final canPurchase = permissions.hasPermission(AppPermission.purchase);
    final canRecharge = permissions.hasPermission(AppPermission.recharge);
    final canViewSession = permissions.hasPermission(AppPermission.sessionView);
    final canSettleReturn = permissions.hasPermission(AppPermission.cardReturn) ||
        permissions.hasPermission(AppPermission.refund);

    return Scaffold(
      appBar: AppBar(
        title: Text('Card: ${card.physicalCardNumber}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan Another Card',
            onPressed: _resetScan,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshSession,
        child: ListView(
          padding: AppSpacing.paddingMd,
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            // 1. Authoritative Compact Card Summary Header
            AppCard(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: 12,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          card.physicalCardNumber,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      const AppBadge(
                        label: 'ACTIVE',
                        variant: AppBadgeVariant.success,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Divider(height: 1),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              const TextSpan(
                                text: 'Balance: ',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondaryLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              TextSpan(
                                text: '₹${session.balance.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'Session Active',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // 2. Action Hub Section Header
            const SectionHeader(
              title: 'Active Card Operations',
            ),
            const SizedBox(height: AppSpacing.sm),

            // ACTION 1: ADD PRODUCTS (POS Catalog)
            if (canPurchase) ...[
              _buildActionTile(
                icon: Icons.fastfood_outlined,
                iconColor: AppColors.primary,
                title: 'Add Products (POS Sale)',
                subtitle: 'Select cafeteria items, review cart, and charge card balance',
                onTap: _openAddProducts,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // ACTION 2: RECHARGE (Cash / Store UPI)
            if (canRecharge) ...[
              _buildActionTile(
                icon: Icons.account_balance_wallet_outlined,
                iconColor: AppColors.success,
                title: 'Recharge Card',
                subtitle: 'Credit funds using Cash or verified store counter UPI payment',
                onTap: _openRecharge,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // ACTION 3: VIEW SESSION
            if (canViewSession) ...[
              _buildActionTile(
                icon: Icons.info_outline,
                iconColor: Colors.blue,
                title: 'View Session Details',
                subtitle: 'Inspect session timeline, status, and linked card details',
                onTap: _openViewSession,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // ACTION 4: TRANSACTIONS
            if (canViewSession) ...[
              _buildActionTile(
                icon: Icons.receipt_long_outlined,
                iconColor: Colors.purple,
                title: 'Transactions History',
                subtitle: 'View summary of purchases, recharges, and settlements',
                onTap: _showTransactionsBottomSheet,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // ACTION 5: SETTLE / RETURN CARD
            if (canSettleReturn) ...[
              _buildActionTile(
                icon: Icons.assignment_return_outlined,
                iconColor: AppColors.warning,
                title: 'Settle / Return Card',
                subtitle: session.balance > 0
                    ? 'Refund ₹${session.balance.toStringAsFixed(2)} balance and return card to AVAILABLE'
                    : 'Close active session and return card to AVAILABLE state',
                isDestructive: session.balance > 0,
                onTap: _handleSettleReturn,
              ),
              const SizedBox(height: AppSpacing.md),
            ],

            // Footer Action: Scan Another Card
            AppOutlinedButton(
              label: 'Scan Another Card',
              icon: Icons.qr_code_scanner,
              onPressed: _resetScan,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm + 2),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: AppSpacing.roundedSm,
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDestructive ? AppColors.error : AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right,
            color: AppColors.textSecondaryLight,
            size: 20,
          ),
        ],
      ),
    );
  }
}
