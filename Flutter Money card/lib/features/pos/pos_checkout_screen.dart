import '../../widgets/states/app_unauthorized_state.dart';
import '../../providers/permission_provider.dart';
import '../../core/constants/permission_constants.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/card_session.dart';
import '../../models/receipt_bill.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/pos_cart_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_bottom_sheet.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';
import '../receipt/bill_receipt_screen.dart';

class PosCheckoutScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const PosCheckoutScreen({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<PosCheckoutScreen> createState() => _PosCheckoutScreenState();
}

class _PosCheckoutScreenState extends ConsumerState<PosCheckoutScreen> {
  final _searchController = TextEditingController();

  final List<String> _categories = [
    'All',
    'Veg',
    'Non-Veg',
    'Vegan',
    'Breakfast',
    'Lunch',
    'Dinner',
    'Snacks',
    'Beverages',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      ref.read(posCatalogNotifierProvider.notifier).loadProducts();
      ref.read(posCartNotifierProvider.notifier).clearCart();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showCartBottomSheet() {
    AppBottomSheet.show(
      context,
      title: 'Current Cart',
      trailing: TextButton(
        onPressed: () {
          ref.read(posCartNotifierProvider.notifier).clearCart();
          Navigator.of(context).pop();
        },
        child: const Text('Clear Cart', style: TextStyle(color: AppColors.error)),
      ),
      child: Consumer(
        builder: (context, ref, _) {
          final cartState = ref.watch(posCartNotifierProvider);
          final cartNotifier = ref.read(posCartNotifierProvider.notifier);

          if (cartState.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(AppSpacing.lg),
              child: Center(
                child: Text('Your cart is empty.'),
              ),
            );
          }

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 280),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: cartState.cartItemList.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, idx) {
                    final item = cartState.cartItemList[idx];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.product.itemName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  '₹${item.unitPrice.toStringAsFixed(2)} × ${item.quantity}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '₹${item.itemTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 20),
                                onPressed: () => cartNotifier.decreaseQuantity(item.product.id),
                              ),
                              Text(
                                '${item.quantity}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, size: 20),
                                onPressed: () => cartNotifier.increaseQuantity(item.product.id),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Cart Total',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '₹${cartState.totalAmount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              AppButton(
                label: 'Confirm & Charge Balance',
                icon: Icons.check_circle_outline,
                isLoading: cartState.isSubmitting,
                onPressed: () {
                  Navigator.of(context).pop();
                  _handleConfirmPurchase();
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _handleConfirmPurchase() async {
    final cartState = ref.read(posCartNotifierProvider);
    final sessionState = ref.read(sessionDetailsNotifierProvider);

    if (cartState.isEmpty) return;

    final currentBalance = sessionState.session?.balance ?? 0.0;
    if (cartState.totalAmount > currentBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Insufficient balance! Required: ₹${cartState.totalAmount.toStringAsFixed(2)}, Available: ₹${currentBalance.toStringAsFixed(2)}',
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        scrollable: true,
        title: const Text('Confirm Purchase'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Items: ${cartState.totalItemCount}'),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Total Charge: ₹${cartState.totalAmount.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              'Current Balance: ₹${currentBalance.toStringAsFixed(2)}',
              style: const TextStyle(color: AppColors.textSecondaryLight, fontSize: 13),
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
            child: const Text('Confirm & Deduct'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    // Execute purchase
    final result = await ref
        .read(posCartNotifierProvider.notifier)
        .executePurchase(widget.sessionId);

    if (result != null && mounted) {
      // Update session balance in riverpod
      ref
          .read(sessionDetailsNotifierProvider.notifier)
          .updateSessionBalance(result.balance);

      // Show Purchase Success Dialog
      _showPurchaseSuccessDialog(result);
    } else if (mounted) {
      final error = ref.read(posCartNotifierProvider).errorMessage ?? 'Purchase failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showPurchaseSuccessDialog(PurchaseResult result) {
    final branch = ref.read(currentBranchProvider);
    final user = ref.read(currentUserProvider);
    final cart = ref.read(posCartNotifierProvider);
    final session = ref.read(sessionDetailsNotifierProvider).session;

    final billItems = cart.items.values.map((item) => ReceiptBillItem(
      name: item.product.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.itemTotal,
    )).toList();

    final totalAmount = result.amount > 0 ? result.amount : cart.totalAmount;
    final remainingBalance = result.balance;
    final previousBalance = (result.balanceBefore != null && result.balanceBefore! > 0)
        ? result.balanceBefore!
        : ((session?.balance != null && session!.balance > 0)
            ? session.balance
            : (remainingBalance + totalAmount));
    final amountDeducted = totalAmount;

    final bill = ReceiptBill(
      organizationName: 'MONEY CARD',
      branchName: branch?.name ?? 'Main Cafeteria',
      receiptTitle: 'SALES RECEIPT',
      transactionId: result.transactionId.isNotEmpty
          ? result.transactionId
          : 'TXN-${DateTime.now().millisecondsSinceEpoch}',
      timestamp: DateTime.now(),
      cardIdentifier: session?.displayCardNumber ?? 'Active Card',
      sessionId: session?.id ?? widget.sessionId,
      staffName: user?.name,
      items: billItems,
      subtotal: totalAmount,
      totalAmount: totalAmount,
      previousBalance: previousBalance,
      amountDeducted: amountDeducted,
      remainingBalance: remainingBalance,
      paymentMethod: 'Card Session',
      sessionStatus: 'ACTIVE',
    );

    ref.read(posCartNotifierProvider.notifier).clearCart();
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => BillReceiptScreen(
          bill: bill,
          onDone: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasPurchasePermission = ref.watch(hasPermissionProvider(AppPermission.purchase));
    if (!hasPurchasePermission) {
      return Scaffold(
        appBar: AppBar(title: const Text('POS Menu & Purchase')),
        body: const SafeArea(child: AppUnauthorizedState()),
      );
    }

    final catalogState = ref.watch(posCatalogNotifierProvider);
    final catalogNotifier = ref.read(posCatalogNotifierProvider.notifier);
    final cartState = ref.watch(posCartNotifierProvider);
    final cartNotifier = ref.read(posCartNotifierProvider.notifier);
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final session = sessionState.session;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('POS Menu & Purchase'),
            if (session != null)
              Text(
                'Balance: ₹${session.balance.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12, color: AppColors.primary),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          // 1. Prominent Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search food or products',
                prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 22),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          catalogNotifier.setSearchQuery('');
                          setState(() {});
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                filled: true,
                fillColor: AppColors.surfaceLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
                isDense: true,
              ),
              onChanged: (val) {
                catalogNotifier.setSearchQuery(val);
                setState(() {});
              },
            ),
          ),

          // 2. Category Selector Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
            child: Row(
              children: _categories.map((cat) {
                final isSelected = catalogState.selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.xs),
                  child: ChoiceChip(
                    label: Text(cat),
                    selected: isSelected,
                    onSelected: (_) => catalogNotifier.setCategoryFilter(cat),
                    selectedColor: AppColors.primaryLight,
                    backgroundColor: AppColors.surfaceLight,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),

          // Error Banner if purchase failed
          if (cartState.errorMessage != null) ...[
            Container(
              padding: AppSpacing.paddingMd,
              color: AppColors.errorLight,
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      cartState.errorMessage!,
                      style: const TextStyle(color: AppColors.error, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // 3. Product Catalog List
          Expanded(
            child: _buildCatalogContent(catalogState, cartState, cartNotifier),
          ),

          // 4. Bottom Floating Cart Bar (persists across search & filters)
          if (!cartState.isEmpty)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${cartState.totalItemCount} items selected',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondaryLight,
                          ),
                        ),
                        Text(
                          '₹${cartState.totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    Expanded(
                      child: AppButton(
                        label: 'View Cart (${cartState.totalItemCount})',
                        icon: Icons.shopping_cart_checkout,
                        height: 48,
                        isLoading: cartState.isSubmitting,
                        onPressed: cartState.isSubmitting ? null : _showCartBottomSheet,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCatalogContent(
    PosCatalogState catalogState,
    PosCartState cartState,
    PosCartNotifier cartNotifier,
  ) {
    if (catalogState.isLoading) {
      return const AppLoadingView(message: 'Loading menu items...');
    }

    if (catalogState.filteredProducts.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => ref.read(posCatalogNotifierProvider.notifier).loadCatalog(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 80),
            AppEmptyState(
              title: 'No products found',
              description: 'No food items match your search or filter.',
              icon: Icons.search_off,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(posCatalogNotifierProvider.notifier).loadCatalog(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppSpacing.paddingMd,
        itemCount: catalogState.filteredProducts.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
        final product = catalogState.filteredProducts[index];
        final cartItem = cartState.items[product.id];
        final quantityInCart = cartItem?.quantity ?? 0;
        final isVeg = product.category.any((c) => c.toLowerCase() == 'veg');
        final isNonVeg = product.category.any((c) => c.toLowerCase() == 'non-veg');

        return AppCard(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              // Product Food Image / Icon container
              Container(
                width: 52,
                height: 52,
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
                  size: 26,
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.itemName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Wrap(
                      spacing: 4,
                      children: product.category.take(3).map((cat) {
                        return AppBadge(
                          label: cat,
                          variant: cat.toLowerCase() == 'veg'
                              ? AppBadgeVariant.success
                              : (cat.toLowerCase() == 'non-veg'
                                  ? AppBadgeVariant.error
                                  : AppBadgeVariant.neutral),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: AppSpacing.sm,
                      runSpacing: 2,
                      children: [
                        Text(
                          '₹${product.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          product.currentStock > 0
                              ? '${product.currentStock} in stock'
                              : 'Out of stock',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: product.currentStock > 0
                                ? (product.currentStock < 10
                                    ? AppColors.warning
                                    : AppColors.success)
                                : AppColors.error,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Add (+) / Quantity Controls
              if (quantityInCart == 0)
                AppButton(
                  label: 'Add',
                  icon: Icons.add,
                  isFullWidth: false,
                  height: 38,
                  onPressed: () => cartNotifier.addToCart(product),
                )
              else
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: AppSpacing.roundedSm,
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove, size: 18, color: AppColors.primaryDark),
                        onPressed: () => cartNotifier.decreaseQuantity(product.id),
                      ),
                      Text(
                        '$quantityInCart',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 18, color: AppColors.primaryDark),
                        onPressed: () => cartNotifier.increaseQuantity(product.id),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
      ),
    );
  }
}
