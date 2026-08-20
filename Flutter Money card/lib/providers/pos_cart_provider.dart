import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/card_session.dart';
import '../models/cart_item.dart';
import '../models/product.dart';
import '../repositories/product_repository.dart';
import '../repositories/session_repository.dart';
import 'api_providers.dart';
import 'branch_provider.dart';
import 'session_operations_provider.dart';

// ==========================================
// 1. PRODUCT CATALOG STATE & NOTIFIER
// ==========================================

class PosCatalogState {
  final bool isLoading;
  final List<Product> products;
  final String selectedCategory; // 'All' or specific category name
  final String searchQuery;
  final String? errorMessage;

  const PosCatalogState({
    this.isLoading = false,
    this.products = const [],
    this.selectedCategory = 'All',
    this.searchQuery = '',
    this.errorMessage,
  });

  List<Product> get filteredProducts {
    var list = products;
    if (selectedCategory != 'All') {
      final filter = selectedCategory.toLowerCase();
      list = list.where((p) {
        return p.category.any((c) => c.toLowerCase() == filter);
      }).toList();
    }
    if (searchQuery.trim().isNotEmpty) {
      final query = searchQuery.trim().toLowerCase();
      list = list.where((p) {
        final matchesName = p.itemName.toLowerCase().contains(query);
        final matchesCategory = p.category.any((c) => c.toLowerCase().contains(query));
        return matchesName || matchesCategory;
      }).toList();
    }
    return list;
  }

  List<String> get availableCategories {
    final set = <String>{'All'};
    for (final p in products) {
      set.addAll(p.category);
    }
    return set.toList();
  }

  PosCatalogState copyWith({
    bool? isLoading,
    List<Product>? products,
    String? selectedCategory,
    String? searchQuery,
    String? errorMessage,
  }) {
    return PosCatalogState(
      isLoading: isLoading ?? this.isLoading,
      products: products ?? this.products,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class PosCatalogNotifier extends StateNotifier<PosCatalogState> {
  final ProductRepository _productRepository;
  final String? _currentBranchId;

  PosCatalogNotifier(this._productRepository, this._currentBranchId)
      : super(const PosCatalogState()) {
    loadProducts();
  }

  Future<void> loadProducts() async {
    final branchId = _currentBranchId;
    if (branchId == null) return;

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final products = await _productRepository.getProducts(
        branchId: branchId,
        status: 'ACTIVE',
      );
      state = state.copyWith(
        isLoading: false,
        products: products,
      );
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load branch products.',
      );
    }
  }

  void setCategoryFilter(String category) {
    state = state.copyWith(selectedCategory: category);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }
}

final StateNotifierProvider<PosCatalogNotifier, PosCatalogState> posCatalogNotifierProvider =
    StateNotifierProvider<PosCatalogNotifier, PosCatalogState>((ref) {
  final productRepository = ref.watch(productRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return PosCatalogNotifier(productRepository, currentBranch?.id);
});

// ==========================================
// 2. POS CART STATE & NOTIFIER
// ==========================================

class PosCartState {
  final Map<String, CartItem> items; // productId -> CartItem
  final bool isSubmitting;
  final PurchaseResult? purchaseResult;
  final String? errorMessage;

  const PosCartState({
    this.items = const {},
    this.isSubmitting = false,
    this.purchaseResult,
    this.errorMessage,
  });

  List<CartItem> get cartItemList => items.values.toList();
  int get totalItemCount => items.values.fold(0, (sum, i) => sum + i.quantity);
  double get totalAmount => items.values.fold(0.0, (sum, i) => sum + i.itemTotal);
  bool get isEmpty => items.isEmpty;

  PosCartState copyWith({
    Map<String, CartItem>? items,
    bool? isSubmitting,
    PurchaseResult? purchaseResult,
    String? errorMessage,
  }) {
    return PosCartState(
      items: items ?? this.items,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      purchaseResult: purchaseResult ?? this.purchaseResult,
      errorMessage: errorMessage,
    );
  }
}

class PosCartNotifier extends StateNotifier<PosCartState> {
  final SessionRepository _sessionRepository;
  final void Function()? _onPurchaseSuccess;

  PosCartNotifier(this._sessionRepository, [this._onPurchaseSuccess]) : super(const PosCartState());

  void addToCart(Product product) {
    final updated = Map<String, CartItem>.from(state.items);
    if (updated.containsKey(product.id)) {
      final existing = updated[product.id]!;
      updated[product.id] = existing.copyWith(quantity: existing.quantity + 1);
    } else {
      updated[product.id] = CartItem(product: product, quantity: 1);
    }
    state = state.copyWith(items: updated);
  }

  void increaseQuantity(String productId) {
    if (!state.items.containsKey(productId)) return;
    final updated = Map<String, CartItem>.from(state.items);
    final item = updated[productId]!;
    updated[productId] = item.copyWith(quantity: item.quantity + 1);
    state = state.copyWith(items: updated);
  }

  void decreaseQuantity(String productId) {
    if (!state.items.containsKey(productId)) return;
    final updated = Map<String, CartItem>.from(state.items);
    final item = updated[productId]!;
    if (item.quantity > 1) {
      updated[productId] = item.copyWith(quantity: item.quantity - 1);
    } else {
      updated.remove(productId);
    }
    state = state.copyWith(items: updated);
  }

  void removeItem(String productId) {
    final updated = Map<String, CartItem>.from(state.items);
    updated.remove(productId);
    state = state.copyWith(items: updated);
  }

  void clearCart() {
    state = const PosCartState();
  }

  /// Execute purchase transaction
  Future<PurchaseResult?> executePurchase(String sessionId) async {
    if (state.isEmpty || state.isSubmitting) return null;

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    try {
      final purchasePayload = state.items.values.map((item) => item.toPurchaseJson()).toList();
      final result = await _sessionRepository.purchase(
        sessionId: sessionId,
        items: purchasePayload,
      );

      state = state.copyWith(
        isSubmitting: false,
        purchaseResult: result,
      );

      _onPurchaseSuccess?.call();

      return result;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to process purchase. Check balance and network.',
      );
      return null;
    }
  }

  void resetPurchaseState() {
    state = state.copyWith(purchaseResult: null, errorMessage: null);
  }
}

final StateNotifierProvider<PosCartNotifier, PosCartState> posCartNotifierProvider =
    StateNotifierProvider<PosCartNotifier, PosCartState>((ref) {
  final sessionRepository = ref.watch(sessionRepositoryProvider);
  return PosCartNotifier(sessionRepository, () {
    try {
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
    } catch (_) {}
  });
});
