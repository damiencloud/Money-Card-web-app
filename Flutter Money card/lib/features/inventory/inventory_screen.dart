import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/inventory.dart';
import '../../providers/branch_provider.dart';
import '../../providers/inventory_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_bottom_sheet.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_text_field.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(inventoryNotifierProvider.notifier).loadInventory();
      ref.read(inventoryNotifierProvider.notifier).loadMovements();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  AppBadgeVariant _getStatusVariant(StockStatus status) {
    switch (status) {
      case StockStatus.inStock:
        return AppBadgeVariant.success;
      case StockStatus.lowStock:
        return AppBadgeVariant.warning;
      case StockStatus.outOfStock:
        return AppBadgeVariant.error;
    }
  }

  void _showAdjustStockSheet(InventoryItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AdjustStockBottomSheet(item: item),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inventoryState = ref.watch(inventoryNotifierProvider);
    final notifier = ref.read(inventoryNotifierProvider.notifier);
    final branch = ref.watch(currentBranchProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Branch Inventory'),
            if (branch != null)
              Text(
                'Branch: ${branch.name}',
                style: const TextStyle(fontSize: 12, color: AppColors.primary),
              ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Stock Levels', icon: Icon(Icons.inventory_2_outlined, size: 18)),
            Tab(text: 'Movement History', icon: Icon(Icons.history, size: 18)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Stock Levels
          _buildStockTab(context, inventoryState, notifier),

          // Tab 2: Movement History
          _buildMovementsTab(inventoryState, notifier),
        ],
      ),
    );
  }

  Widget _buildStockTab(
    BuildContext context,
    InventoryListState state,
    InventoryNotifier notifier,
  ) {
    return Column(
      children: [
        // Search & Filter Bar
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              TextField(
                onChanged: notifier.setSearchQuery,
                decoration: const InputDecoration(
                  hintText: 'Search stock by product name...',
                  prefixIcon: Icon(Icons.search, size: 20),
                  isDense: true,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'All', state.statusFilter, notifier),
                    _buildFilterChip('IN_STOCK', 'In Stock', state.statusFilter, notifier),
                    _buildFilterChip('LOW_STOCK', 'Low Stock', state.statusFilter, notifier),
                    _buildFilterChip('OUT_OF_STOCK', 'Out of Stock', state.statusFilter, notifier),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),

        // Success / Error Feedback
        if (state.successMessage != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            color: AppColors.successLight.withValues(alpha: 0.3),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: AppColors.success, size: 18),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    state.successMessage!,
                    style: const TextStyle(color: AppColors.success, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Stock List
        Expanded(
          child: RefreshIndicator(
            onRefresh: notifier.loadInventory,
            child: _buildStockList(context, state, notifier),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(
    String value,
    String label,
    String current,
    InventoryNotifier notifier,
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

  Widget _buildStockList(
    BuildContext context,
    InventoryListState state,
    InventoryNotifier notifier,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading inventory stock...');
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
                onPressed: notifier.loadInventory,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.filteredItems.isEmpty) {
      return const AppEmptyState(
        title: 'No Stock Records Found',
        description: 'No inventory items match the current search or status filter.',
        icon: Icons.inventory_2_outlined,
      );
    }

    return ListView.separated(
      padding: AppSpacing.paddingMd,
      itemCount: state.filteredItems.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final item = state.filteredItems[index];

        return AppCard(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.productName,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        AppBadge(
                          label: item.status.value.replaceAll('_', ' '),
                          variant: _getStatusVariant(item.status),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        Text(
                          'Stock: ${item.currentStock} units',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: item.isOutOfStock
                                ? AppColors.error
                                : item.isLowStock
                                    ? AppColors.warning
                                    : AppColors.textPrimaryLight,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Text(
                          'Reorder Level: ${item.reorderLevel}',
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
              const SizedBox(width: AppSpacing.sm),

              // Stock Adjustment Button (INVENTORY_MANAGE guarded)
              PermissionGuard.single(
                permission: AppPermission.inventoryManage,
                child: IconButton(
                  icon: const Icon(Icons.edit_note, color: AppColors.primary),
                  tooltip: 'Adjust Stock',
                  onPressed: () => _showAdjustStockSheet(item),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMovementsTab(
    InventoryListState state,
    InventoryNotifier notifier,
  ) {
    if (state.movements.isEmpty) {
      return const AppEmptyState(
        title: 'No Movement History',
        description: 'Stock adjustments and purchases will appear here.',
        icon: Icons.history,
      );
    }

    return ListView.separated(
      padding: AppSpacing.paddingMd,
      itemCount: state.movements.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final movement = state.movements[index];
        final isPositive = movement.changeQuantity > 0;

        return AppCard(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: isPositive
                      ? AppColors.successLight.withValues(alpha: 0.3)
                      : AppColors.errorLight.withValues(alpha: 0.3),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                  color: isPositive ? AppColors.success : AppColors.error,
                  size: 18,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      movement.productName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${movement.type.value.replaceAll("_", " ")}${movement.reason != null ? " • ${movement.reason}" : ""}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    Text(
                      'Time: ${movement.createdAt}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textTertiaryLight,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isPositive ? "+" : ""}${movement.changeQuantity}',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isPositive ? AppColors.success : AppColors.error,
                    ),
                  ),
                  Text(
                    'Balance: ${movement.balanceAfter}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AdjustStockBottomSheet extends ConsumerStatefulWidget {
  final InventoryItem item;

  const _AdjustStockBottomSheet({required this.item});

  @override
  ConsumerState<_AdjustStockBottomSheet> createState() => _AdjustStockBottomSheetState();
}

class _AdjustStockBottomSheetState extends ConsumerState<_AdjustStockBottomSheet> {
  int _adjustment = 0;
  final _reasonController = TextEditingController(text: 'Restock');

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  void _stepAdjustment(int delta) {
    setState(() {
      _adjustment += delta;
    });
  }

  Future<void> _handleConfirmAdjustment() async {
    if (_adjustment == 0) return;

    final success = await ref.read(inventoryNotifierProvider.notifier).adjustStock(
          inventoryId: widget.item.id,
          adjustment: _adjustment,
          reason: _reasonController.text.trim(),
        );

    if (success && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final inventoryState = ref.watch(inventoryNotifierProvider);
    final newStock = (widget.item.currentStock + _adjustment).clamp(0, 99999);

    return AppBottomSheet(
      title: 'Adjust Stock',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.item.productName,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Current Stock:'),
              Text(
                '${widget.item.currentStock} units',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const Divider(height: AppSpacing.lg),

          // Adjustment Steppers
          const Text('Stock Adjustment', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton(
                onPressed: () => _stepAdjustment(-5),
                child: const Text('-5'),
              ),
              const SizedBox(width: AppSpacing.xs),
              OutlinedButton(
                onPressed: () => _stepAdjustment(-1),
                child: const Text('-1'),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Text(
                  '${_adjustment >= 0 ? "+" : ""}$_adjustment',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: _adjustment >= 0 ? AppColors.primary : AppColors.error,
                  ),
                ),
              ),
              OutlinedButton(
                onPressed: () => _stepAdjustment(1),
                child: const Text('+1'),
              ),
              const SizedBox(width: AppSpacing.xs),
              OutlinedButton(
                onPressed: () => _stepAdjustment(5),
                child: const Text('+5'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // Preview
          Container(
            padding: AppSpacing.paddingMd,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: AppSpacing.roundedSm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('New Stock Level:'),
                Text(
                  '$newStock units',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppColors.primaryDark,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Reason Input
          AppTextField(
            controller: _reasonController,
            label: 'Adjustment Reason',
            hintText: 'e.g. Supplier delivery, damage write-off',
          ),
          const SizedBox(height: AppSpacing.lg),

          // Confirm Button
          AppButton(
            label: 'Confirm Adjustment',
            icon: Icons.check,
            isLoading: inventoryState.isSubmitting,
            onPressed: _adjustment == 0 || inventoryState.isSubmitting
                ? null
                : _handleConfirmAdjustment,
          ),
        ],
      ),
    );
  }
}
