import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/card.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/scanner/qr_scanner_view.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';

enum IssueCardTab { manual, scan }

class IssueCardScreen extends ConsumerStatefulWidget {
  const IssueCardScreen({super.key});

  @override
  ConsumerState<IssueCardScreen> createState() => _IssueCardScreenState();
}

class _IssueCardScreenState extends ConsumerState<IssueCardScreen> {
  IssueCardTab _currentTab = IssueCardTab.manual;
  final _searchController = TextEditingController();

  // State for resolved card in QR scanner tab
  String? _scannedQrToken;
  bool _isResolvingQr = false;
  String? _scanErrorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _handleConfirmIssue(Card card) async {
    final branch = ref.read(currentBranchProvider);
    if (branch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active branch selected.')),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Card Issuance'),
        content: Column(
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
                const Text('Card ID:'),
                Text(card.id, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Branch:'),
                Text(branch.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text('Starting Balance:'),
                Text(
                  '₹0.00',
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ],
            ),
            const Divider(height: AppSpacing.lg),
            const Text(
              'Issuing this card will activate it and create an active session for transactions.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
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
            child: const Text('Confirm & Issue'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final session = await ref.read(cardDetailsNotifierProvider.notifier).issueCardSession(
          cardId: card.id,
          branchId: branch.id,
        );

    if (session != null && mounted) {
      // Refresh available cards and main cards list
      ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
      ref.read(cardListNotifierProvider.notifier).loadCards();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Card ${card.physicalCardNumber} issued successfully!'),
          backgroundColor: AppColors.success,
        ),
      );

      // Navigate to Card Details screen
      if (GoRouter.maybeOf(context) != null) {
        context.pushReplacement(
          '/app/cards/${card.id}',
          extra: {
            'initialCard': card.copyWith(status: CardStatus.active, currentBranchId: branch.id),
            'initialSession': session,
          },
        );
      } else {
        Navigator.of(context).maybePop();
      }
    }
  }

  Future<void> _handleQrScanned(String qrToken) async {
    debugPrint('SCANNED QR RAW VALUE: $qrToken');
    if (_isResolvingQr || qrToken == _scannedQrToken) return;

    setState(() {
      _scannedQrToken = qrToken;
      _isResolvingQr = true;
      _scanErrorMessage = null;
    });

    final success = await ref
        .read(cardDetailsNotifierProvider.notifier)
        .resolveCardByQr(qrToken);

    if (!mounted) return;

    setState(() {
      _isResolvingQr = false;
      if (!success) {
        final error = ref.read(cardDetailsNotifierProvider).errorMessage;
        _scanErrorMessage = error ?? 'Card not registered';
      }
    });
  }

  void _resetScan() {
    setState(() {
      _scannedQrToken = null;
      _isResolvingQr = false;
      _scanErrorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final branch = ref.watch(currentBranchProvider);
    final availableState = ref.watch(availableCardsNotifierProvider);
    final cardDetailsState = ref.watch(cardDetailsNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Issue New Card'),
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
                      'Branch: ${branch?.name ?? "Not Assigned"}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Tab Selector: Manual Selection vs QR Scan
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              child: SegmentedButton<IssueCardTab>(
                segments: const [
                  ButtonSegment(
                    value: IssueCardTab.manual,
                    label: Text('Available Cards'),
                    icon: Icon(Icons.credit_card),
                  ),
                  ButtonSegment(
                    value: IssueCardTab.scan,
                    label: Text('Scan Card QR'),
                    icon: Icon(Icons.qr_code_scanner),
                  ),
                ],
                selected: {_currentTab},
                onSelectionChanged: (set) {
                  if (set.isNotEmpty) {
                    setState(() {
                      _currentTab = set.first;
                      _resetScan();
                    });
                    if (set.first == IssueCardTab.manual) {
                      ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
                    }
                  }
                },
              ),
            ),
            const Divider(height: 1),

            // Tab Content
            Expanded(
              child: _currentTab == IssueCardTab.manual
                  ? _buildManualSelectionView(context, availableState, branch)
                  : _buildQrScanView(context, cardDetailsState, branch),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildManualSelectionView(
    BuildContext context,
    AvailableCardsState state,
    dynamic branch,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading available cards...');
    }

    if (state.errorMessage != null) {
      return Center(
        child: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                state.errorMessage!,
                style: const TextStyle(color: AppColors.error),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: () => ref
                    .read(availableCardsNotifierProvider.notifier)
                    .loadAvailableCards(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final cards = state.filteredCards;

    return Column(
      children: [
        // Search & Filter Box
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: TextField(
            controller: _searchController,
            onChanged: (val) {
              ref.read(availableCardsNotifierProvider.notifier).setSearchQuery(val);
            },
            decoration: InputDecoration(
              hintText: 'Search available cards (e.g. MC-001)...',
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        ref
                            .read(availableCardsNotifierProvider.notifier)
                            .setSearchQuery('');
                      },
                    )
                  : null,
            ),
          ),
        ),

        // Available Cards List
        Expanded(
          child: cards.isEmpty
              ? (state.searchQuery.isNotEmpty
                  ? AppEmptyState(
                      title: 'No Matching Cards',
                      description: 'No available cards match "${state.searchQuery}".',
                      icon: Icons.search_off,
                    )
                  : AppEmptyState(
                      title: 'No Available Cards',
                      description:
                          'No available cards found for ${branch?.name ?? "this branch"}. Cards must first be created or imported by an Organization Admin via the Web Portal.',
                      icon: Icons.credit_card_off_outlined,
                    ))
              : RefreshIndicator(
                  onRefresh: () => ref
                      .read(availableCardsNotifierProvider.notifier)
                      .loadAvailableCards(),
                  child: ListView.separated(
                    padding: AppSpacing.paddingMd,
                    itemCount: cards.length,
                    separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final card = cards[index];
                      return AppCard(
                        padding: AppSpacing.paddingMd,
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              decoration: BoxDecoration(
                                color: AppColors.primaryLight,
                                borderRadius: AppSpacing.roundedSm,
                              ),
                              child: const Icon(
                                Icons.credit_card,
                                color: AppColors.primary,
                                size: 24,
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
                                        card.physicalCardNumber,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(width: AppSpacing.xs),
                                      const AppBadge(
                                        label: 'AVAILABLE',
                                        variant: AppBadgeVariant.primary,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'ID: ${card.id}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondaryLight,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () => _handleConfirmIssue(card),
                              style: ElevatedButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                              ),
                              child: const Text('Issue'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildQrScanView(
    BuildContext context,
    CardDetailsState cardDetailsState,
    dynamic branch,
  ) {
    final resolvedCard = cardDetailsState.card;

    // If a card was scanned and resolved
    if (_scannedQrToken != null && !_isResolvingQr) {
      if (_scanErrorMessage != null) {
        // Error state: Card Not Registered or Other Error
        return Padding(
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
                child: const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'QR Card Not Registered',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                _scanErrorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              const Text(
                'This card does not exist in your organization\'s card inventory. Cards must first be created or imported by an Organization Admin via the Web Portal.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
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
                      onPressed: () {
                        setState(() {
                          _currentTab = IssueCardTab.manual;
                          _resetScan();
                        });
                      },
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
        );
      }

      if (resolvedCard != null) {
        final isAvailable = resolvedCard.status == CardStatus.available;
        final isActive = resolvedCard.status == CardStatus.active;
        final isBlocked = resolvedCard.status == CardStatus.blocked;

        return ListView(
          padding: AppSpacing.paddingLg,
          children: [
            // Resolved Card Preview
            AppCard(
              padding: AppSpacing.paddingLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        resolvedCard.physicalCardNumber,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      AppBadge(
                        label: resolvedCard.status.value,
                        variant: isAvailable
                            ? AppBadgeVariant.primary
                            : isActive
                                ? AppBadgeVariant.success
                                : AppBadgeVariant.error,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Card ID: ${resolvedCard.id}',
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  Text(
                    'QR Token: ${resolvedCard.qrToken}',
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  if (isAvailable) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: const [
                        Text(
                          'Starting Balance: ',
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                        ),
                        Text(
                          '₹0.00',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            if (isAvailable) ...[
              Container(
                padding: AppSpacing.paddingMd,
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: Row(
                  children: const [
                    Icon(Icons.check_circle, color: AppColors.success, size: 20),
                    SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        'Card is AVAILABLE and ready to be issued.',
                        style: TextStyle(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Issue Card',
                icon: Icons.play_arrow,
                isLoading: cardDetailsState.isSubmitting,
                onPressed: cardDetailsState.isSubmitting
                    ? null
                    : () => _handleConfirmIssue(resolvedCard),
              ),
            ] else if (isActive) ...[
              Container(
                padding: AppSpacing.paddingMd,
                decoration: BoxDecoration(
                  color: AppColors.warningLight.withValues(alpha: 0.2),
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: Row(
                  children: const [
                    Icon(Icons.warning_amber, color: AppColors.warning, size: 20),
                    SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        'Card is already ACTIVE with an active session. Cannot issue an active card.',
                        style: TextStyle(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'View Active Card Details',
                icon: Icons.credit_card,
                onPressed: () {
                  if (GoRouter.maybeOf(context) != null) {
                    context.push(
                      '/app/cards/${resolvedCard.id}',
                      extra: {
                        'initialCard': resolvedCard,
                        'initialSession': cardDetailsState.activeSession,
                      },
                    );
                  }
                },
              ),
            ] else if (isBlocked) ...[
              Container(
                padding: AppSpacing.paddingMd,
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: Row(
                  children: const [
                    Icon(Icons.block, color: AppColors.error, size: 20),
                    SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        'Card is BLOCKED. Cannot issue a blocked card.',
                        style: TextStyle(
                          color: AppColors.error,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'View Blocked Card',
                icon: Icons.credit_card,
                onPressed: () {
                  if (GoRouter.maybeOf(context) != null) {
                    context.push(
                      '/app/cards/${resolvedCard.id}',
                      extra: {'initialCard': resolvedCard},
                    );
                  }
                },
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            AppOutlinedButton(
              label: 'Scan Another Card',
              icon: Icons.qr_code_scanner,
              onPressed: _resetScan,
            ),
          ],
        );
      }
    }

    // Camera QR Scanner Active View
    return Stack(
      children: [
        QrScannerView(
          title: 'Scan Card QR to Issue',
          prompt: 'Point camera at the registered Card QR code',
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
                      Text(
                        'Mock Mode: Tap to view scannable Mock QRs',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        if (_isResolvingQr)
          Container(
            color: Colors.black54,
            child: const Center(
              child: AppLoadingView(
                message: 'Verifying card in inventory...',
              ),
            ),
          ),
      ],
    );
  }
}
