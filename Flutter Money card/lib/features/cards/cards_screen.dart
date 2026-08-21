import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card.dart';
import '../../providers/card_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';

class CardsScreen extends ConsumerWidget {
  const CardsScreen({super.key});

  AppBadgeVariant _getStatusVariant(CardStatus status) {
    switch (status) {
      case CardStatus.available:
        return AppBadgeVariant.primary;
      case CardStatus.active:
        return AppBadgeVariant.success;
      case CardStatus.blocked:
        return AppBadgeVariant.error;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cardListState = ref.watch(cardListNotifierProvider);
    final notifier = ref.read(cardListNotifierProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Branch Cards'),
        actions: [
          PermissionGuard.single(
            permission: AppPermission.cardIssue,
            child: IconButton(
              icon: const Icon(Icons.add_card),
              tooltip: 'Issue New Card',
              onPressed: () => context.push('/app/cards/issue'),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                // Search Input
                TextField(
                  onChanged: notifier.setSearchQuery,
                  decoration: const InputDecoration(
                    hintText: 'Search by card number...',
                    prefixIcon: Icon(Icons.search, size: 20),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),

                // Status Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('ALL', 'All', cardListState.selectedStatusFilter, notifier),
                      _buildFilterChip('AVAILABLE', 'Available', cardListState.selectedStatusFilter, notifier),
                      _buildFilterChip('ACTIVE', 'Active', cardListState.selectedStatusFilter, notifier),
                      _buildFilterChip('BLOCKED', 'Blocked', cardListState.selectedStatusFilter, notifier),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Cards List Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: notifier.loadCards,
              child: _buildListContent(context, cardListState, notifier),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    String value,
    String label,
    String current,
    CardListNotifier notifier,
  ) {
    final isSelected = current == value;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => notifier.setStatusFilter(value),
        selectedColor: AppColors.primaryLight,
        checkmarkColor: AppColors.primary,
      ),
    );
  }

  Widget _buildListContent(
    BuildContext context,
    CardListState state,
    CardListNotifier notifier,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading branch cards...');
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
                onPressed: notifier.loadCards,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.cards.isEmpty) {
      return const AppEmptyState(
        title: 'No Cards Found',
        description: 'No cards match the selected filter.',
        icon: Icons.credit_card_off_outlined,
      );
    }

    return ListView.separated(
      padding: AppSpacing.paddingMd,
      itemCount: state.cards.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final card = state.cards[index];
        return AppCard(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 12),
          onTap: () => context.push('/app/cards/${card.id}'),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: const Icon(Icons.credit_card, color: AppColors.primaryDark, size: 20),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.physicalCardNumber,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      card.status == CardStatus.active ? 'Active Session' : 'Ready for Issuance',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
              AppBadge(
                label: card.status.value,
                variant: _getStatusVariant(card.status),
              ),
              const SizedBox(width: AppSpacing.xs),
              const Icon(Icons.chevron_right, size: 18, color: AppColors.textTertiaryLight),
            ],
          ),
        );
      },
    );
  }
}
