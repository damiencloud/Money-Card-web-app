import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/inventory.dart';
import '../repositories/inventory_repository.dart';
import 'api_providers.dart';
import 'branch_provider.dart';

const Object _sentinel = Object();

class InventoryListState {
  final bool isLoading;
  final bool isSubmitting;
  final List<InventoryItem> items;
  final String searchQuery;
  final String statusFilter; // 'ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'
  final List<InventoryMovement> movements;
  final String? errorMessage;
  final String? successMessage;

  const InventoryListState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.items = const [],
    this.searchQuery = '',
    this.statusFilter = 'ALL',
    this.movements = const [],
    this.errorMessage,
    this.successMessage,
  });

  List<InventoryItem> get filteredItems {
    var result = items;
    if (statusFilter != 'ALL') {
      result = result.where((item) => item.status.value == statusFilter).toList();
    }
    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      result = result.where((item) => item.productName.toLowerCase().contains(q)).toList();
    }
    return result;
  }

  InventoryListState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<InventoryItem>? items,
    String? searchQuery,
    String? statusFilter,
    List<InventoryMovement>? movements,
    Object? errorMessage = _sentinel,
    Object? successMessage = _sentinel,
  }) {
    return InventoryListState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      items: items ?? this.items,
      searchQuery: searchQuery ?? this.searchQuery,
      statusFilter: statusFilter ?? this.statusFilter,
      movements: movements ?? this.movements,
      errorMessage: errorMessage == _sentinel
          ? this.errorMessage
          : errorMessage as String?,
      successMessage: successMessage == _sentinel
          ? this.successMessage
          : successMessage as String?,
    );
  }
}

class InventoryNotifier extends StateNotifier<InventoryListState> {
  final InventoryRepository _inventoryRepository;
  final String? _currentBranchId;
  Timer? _messageTimer;

  InventoryNotifier(this._inventoryRepository, this._currentBranchId)
      : super(const InventoryListState());

  @override
  void dispose() {
    _messageTimer?.cancel();
    super.dispose();
  }

  Future<void> loadInventory({bool force = false}) async {
    final branchId = _currentBranchId;
    if (branchId == null) return;
    if (!force && state.isLoading) return;

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final items = await _inventoryRepository.getInventory(
        branchId: branchId,
        search: state.searchQuery.isNotEmpty ? state.searchQuery : null,
        status: state.statusFilter != 'ALL' ? state.statusFilter : null,
      );

      state = state.copyWith(
        isLoading: false,
        items: items,
      );
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load branch inventory.',
      );
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    loadInventory();
  }

  void setStatusFilter(String status) {
    state = state.copyWith(statusFilter: status);
    loadInventory();
  }

  Future<bool> adjustStock({
    required String inventoryId,
    required int adjustment,
    String? reason,
  }) async {
    if (state.isSubmitting || adjustment == 0) return false;

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    try {
      final updatedItem = await _inventoryRepository.adjustStock(
        inventoryId: inventoryId,
        adjustment: adjustment,
        reason: reason,
      );

      final updatedList = state.items.map((item) {
        return item.id == updatedItem.id ? updatedItem : item;
      }).toList();

      state = state.copyWith(
        isSubmitting: false,
        items: updatedList,
        successMessage: 'Stock updated to ${updatedItem.currentStock} units.',
      );

      // Auto-dismiss the success feedback message after 3 seconds
      _messageTimer?.cancel();
      _messageTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          state = state.copyWith(successMessage: null);
        }
      });

      // Refresh movement history
      loadMovements();

      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to adjust stock. Please try again.',
      );
      return false;
    }
  }

  Future<void> loadMovements([String? inventoryId]) async {
    final branchId = _currentBranchId;
    if (branchId == null) return;

    try {
      final movements = await _inventoryRepository.getInventoryMovements(
        branchId: branchId,
        inventoryId: inventoryId,
      );
      state = state.copyWith(movements: movements);
    } catch (_) {
      // Non-critical, ignore silent failures
    }
  }

  void clearMessages() {
    _messageTimer?.cancel();
    state = state.copyWith(errorMessage: null, successMessage: null);
  }
}

final StateNotifierProvider<InventoryNotifier, InventoryListState> inventoryNotifierProvider =
    StateNotifierProvider<InventoryNotifier, InventoryListState>((ref) {
  final inventoryRepository = ref.watch(inventoryRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return InventoryNotifier(inventoryRepository, currentBranch?.id);
});
