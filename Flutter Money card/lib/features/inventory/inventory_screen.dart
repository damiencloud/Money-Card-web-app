import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/branch.dart';
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
import '../../widgets/states/app_unauthorized_state.dart';

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
    final branchState = ref.watch(branchNotifierProvider);
    final currentBranch = branchState.currentBranch;
    final assignedBranches = branchState.assignedBranches;

    return PermissionGuard(
      mode: PermissionGuardMode.any,
      permissions: const [AppPermission.inventoryView, AppPermission.productView],
      fallback: const AppUnauthorizedState(),
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Menu & Inventory'),
                    if (currentBranch != null)
                      Text(
                        currentBranch.name,
                        style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              if (assignedBranches.length > 1 && currentBranch != null)
                _buildBranchSwitcher(context, ref, currentBranch, assignedBranches),
            ],
          ),
          bottom: TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Menu & Stock', icon: Icon(Icons.inventory_2_outlined, size: 18)),
              Tab(text: 'Restock History', icon: Icon(Icons.add_shopping_cart, size: 18)),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            // Tab 1: Menu & Stock Levels
            _buildStockTab(context, inventoryState, notifier),

            // Tab 2: Movement History
            _buildMovementsTab(inventoryState, notifier),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchSwitcher(
    BuildContext context,
    WidgetRef ref,
    Branch currentBranch,
    List<Branch> assignedBranches,
  ) {
    return PopupMenuButton<Branch>(
      initialValue: currentBranch,
      onSelected: (branch) {
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
      },
      itemBuilder: (context) {
        return assignedBranches.map((branch) {
          final isSelected = branch.id == currentBranch.id;
          return PopupMenuItem<Branch>(
            value: branch,
            child: Row(
              children: [
                Icon(
                  Icons.storefront,
                  size: 18,
                  color: isSelected ? AppColors.primary : AppColors.textSecondaryLight,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  branch.name,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: AppSpacing.roundedSm,
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.swap_horiz, size: 16, color: AppColors.primaryDark),
            const SizedBox(width: 4),
            const Text(
              'Switch Branch',
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.primaryDark),
          ],
        ),
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
                  hintText: 'Search food or product name...',
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
            onRefresh: () async {
              await notifier.loadInventory();
              await notifier.loadMovements();
            },
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
      return const AppLoadingView(message: 'Loading menu & inventory...');
    }

    if (state.errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          Center(
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
          ),
        ],
      );
    }

    if (state.filteredItems.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          AppEmptyState(
            title: 'No Items Found',
            description: 'No menu or stock records match the current filter.',
            icon: Icons.inventory_2_outlined,
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.paddingMd,
      itemCount: state.filteredItems.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final item = state.filteredItems[index];
        final isVeg = item.category.any((c) => c.toLowerCase() == 'veg');
        final isNonVeg = item.category.any((c) => c.toLowerCase() == 'non-veg');
        final categoryLabel = item.category.isNotEmpty ? item.category.join(', ') : 'Menu Item';

        return AppCard(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Food Category Icon / Image Container
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isVeg
                      ? AppColors.successLight
                      : (isNonVeg ? AppColors.errorLight : AppColors.primaryLight),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isVeg
                      ? Icons.eco
                      : (isNonVeg ? Icons.kebab_dining : Icons.fastfood_outlined),
                  color: isVeg
                      ? AppColors.success
                      : (isNonVeg ? AppColors.error : AppColors.primary),
                  size: 24,
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Product Info & Price
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
                              fontSize: 16,
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
                    const SizedBox(height: 2),
                    Text(
                      categoryLabel,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        if (item.price > 0)
                          Text(
                            '\u20b9${item.price.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        if (item.price > 0) const SizedBox(width: AppSpacing.md),
                        Text(
                          'Stock: ${item.currentStock} units',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: item.isOutOfStock
                                ? AppColors.error
                                : item.isLowStock
                                    ? AppColors.warning
                                    : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Reorder threshold: ${item.reorderLevel} units',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textTertiaryLight,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),

              // Restock Button (INVENTORY_MANAGE guarded)
              PermissionGuard.single(
                permission: AppPermission.inventoryManage,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.add_shopping_cart, size: 15, color: AppColors.primary),
                  label: const Text('Restock', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    visualDensity: VisualDensity.compact,
                  ),
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
    // Filter strictly for restocks / positive stock additions
    final restockMovements = state.movements.where((m) => m.changeQuantity > 0).toList();

    if (restockMovements.isEmpty && state.isLoading) {
      return const AppLoadingView(message: 'Loading restock history...');
    }

    if (restockMovements.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async {
          await notifier.loadMovements();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 80),
            AppEmptyState(
              title: 'No Restock History',
              description: 'Stock additions, fresh batches, and restocks will appear here.',
              icon: Icons.add_shopping_cart,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await notifier.loadMovements();
      },
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppSpacing.paddingMd,
        itemCount: restockMovements.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final movement = restockMovements[index];

          return AppCard(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: const BoxDecoration(
                    color: AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.add_shopping_cart,
                    color: AppColors.success,
                    size: 18,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        movement.productName.isNotEmpty ? movement.productName : 'Product Restock',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        movement.reason != null && movement.reason!.isNotEmpty
                            ? movement.reason!
                            : 'Restock / Fresh Batch Addition',
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        movement.staffName != null && movement.staffName!.isNotEmpty
                            ? 'By ${movement.staffName} • ${movement.createdAt}'
                            : movement.createdAt,
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
                      '+${movement.changeQuantity} units',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.success,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Balance: ${movement.balanceAfter}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
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
  int _adjustment = 10;
  final _reasonController = TextEditingController(text: 'Restock / Fresh Batch');

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  void _stepAdjustment(int delta) {
    setState(() {
      _adjustment = (_adjustment + delta).clamp(-widget.item.currentStock, 99999);
    });
  }

  void _setDirectAdjustment(int val) {
    setState(() {
      _adjustment = val;
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

    final quickIncrements = [5, 10, 25, 50, 100];
    final quickReasons = ['Restock', 'Fresh Kitchen Batch', 'Vendor Delivery', 'Count Correction', 'Waste / Damaged'];

    return AppBottomSheet(
      title: 'Restock & Adjust Stock',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.item.productName,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Current Stock on Hand:', style: TextStyle(color: AppColors.textSecondaryLight)),
              Text(
                '${widget.item.currentStock} units',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ],
          ),
          const Divider(height: AppSpacing.lg),

          // Quick Restock Presets
          const Text('Quick Restock Quantity (+Units)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: 6,
            children: quickIncrements.map((qty) {
              final isSelected = _adjustment == qty;
              return ActionChip(
                label: Text('+$qty'),
                backgroundColor: isSelected ? AppColors.primaryLight : AppColors.surfaceLight,
                labelStyle: TextStyle(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                ),
                onPressed: () => _setDirectAdjustment(qty),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Adjustment Steppers
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
                    fontSize: 24,
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
                const Text('Updated Stock After Restock:'),
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

          // Reason Quick Chips
          const Text('Reason / Note', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: quickReasons.map((reason) {
              final isSelected = _reasonController.text == reason;
              return ActionChip(
                label: Text(reason, style: const TextStyle(fontSize: 11)),
                backgroundColor: isSelected ? AppColors.primaryLight : AppColors.surfaceLight,
                onPressed: () {
                  setState(() {
                    _reasonController.text = reason;
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Reason Custom Input
          AppTextField(
            controller: _reasonController,
            label: 'Custom Note / Audit Reason',
            hintText: 'e.g. Morning kitchen batch, fresh patties prepared',
          ),
          const SizedBox(height: AppSpacing.lg),

          // Confirm Button
          AppButton(
            label: 'Confirm Restock',
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
