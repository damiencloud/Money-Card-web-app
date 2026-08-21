import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/auth_user.dart';
import '../models/branch.dart';
import '../repositories/branch_repository.dart';
import 'api_providers.dart';
import 'auth_provider.dart';

class BranchState {
  final List<Branch> assignedBranches;
  final Branch? currentBranch;
  final bool isLoading;
  final String? error;

  const BranchState({
    this.assignedBranches = const [],
    this.currentBranch,
    this.isLoading = false,
    this.error,
  });

  BranchState copyWith({
    List<Branch>? assignedBranches,
    Branch? currentBranch,
    bool? isLoading,
    String? error,
  }) {
    return BranchState(
      assignedBranches: assignedBranches ?? this.assignedBranches,
      currentBranch: currentBranch ?? this.currentBranch,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class BranchNotifier extends StateNotifier<BranchState> {
  final BranchRepository _branchRepository;

  BranchNotifier(this._branchRepository) : super(const BranchState());

  /// Immediately sync with user assigned branches (instant 0ms resolution)
  void syncWithUser(AuthUser user) {
    final activeBranches = user.assignedBranches
        .where((b) => b.status.toUpperCase() == 'ACTIVE')
        .toList();

    if (activeBranches.isNotEmpty) {
      Branch? active = state.currentBranch;
      if (active == null || !activeBranches.any((b) => b.id == active!.id)) {
        active = activeBranches.first;
      }
      state = state.copyWith(
        assignedBranches: activeBranches,
        currentBranch: active,
        isLoading: false,
        error: null,
      );
    } else {
      state = state.copyWith(
        assignedBranches: [],
        currentBranch: null,
        isLoading: false,
        error: 'Your assigned branch is currently inactive. Please contact your Organization Administrator.',
      );
    }
  }

  /// Background refresh to detect live branch disabling/enabling by Org Admin
  Future<void> refreshBranchesSilently() async {
    try {
      final activeBranches = await _branchRepository.getBranches(forceRefresh: true);
      final activeOnly = activeBranches
          .where((b) => b.status.toUpperCase() == 'ACTIVE')
          .toList();

      Branch? current = state.currentBranch;
      if (current != null && !activeOnly.any((b) => b.id == current!.id)) {
        // Current branch was disabled by Org Admin! Invalidate it immediately
        current = activeOnly.isNotEmpty ? activeOnly.first : null;
      } else if (current == null && activeOnly.isNotEmpty) {
        current = activeOnly.first;
      }

      state = state.copyWith(
        assignedBranches: activeOnly,
        currentBranch: current,
        error: activeOnly.isEmpty
            ? 'Your assigned branch is currently inactive. Please contact your Organization Administrator.'
            : null,
      );
    } catch (_) {
      // Ignore background network errors
    }
  }

  Future<void> loadAssignedBranches(List<String> assignedBranchIds) async {
    if (assignedBranchIds.isEmpty) {
      state = state.copyWith(
        assignedBranches: [],
        currentBranch: null,
        error: 'Your assigned branch is currently inactive. Please contact your Organization Administrator.',
      );
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final allBranches = await _branchRepository.getBranches(forceRefresh: true);
      final assigned = allBranches
          .where((b) => assignedBranchIds.contains(b.id) && b.status.toUpperCase() == 'ACTIVE')
          .toList();

      Branch? active = state.currentBranch;
      if (active == null || !assigned.any((b) => b.id == active!.id)) {
        active = assigned.isNotEmpty ? assigned.first : null;
      }

      state = state.copyWith(
        assignedBranches: assigned,
        currentBranch: active,
        isLoading: false,
        error: assigned.isEmpty
            ? 'Your assigned branch is currently inactive. Please contact your Organization Administrator.'
            : null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void selectBranch(Branch branch) {
    if (state.assignedBranches.any((b) => b.id == branch.id && b.status.toUpperCase() == 'ACTIVE')) {
      state = state.copyWith(currentBranch: branch);
    }
  }

  void clear() {
    state = const BranchState();
  }
}

final branchNotifierProvider =
    StateNotifierProvider<BranchNotifier, BranchState>((ref) {
  final branchRepo = ref.watch(branchRepositoryProvider);
  final notifier = BranchNotifier(branchRepo);

  // Synchronize assigned branches immediately when user logs in or profile revalidates
  ref.listen(currentUserProvider, (previous, next) {
    if (next != null) {
      notifier.syncWithUser(next);
    } else {
      notifier.clear();
    }
  }, fireImmediately: true);

  return notifier;
});

final currentBranchProvider = Provider<Branch?>((ref) {
  final branchState = ref.watch(branchNotifierProvider);
  return branchState.currentBranch;
});
