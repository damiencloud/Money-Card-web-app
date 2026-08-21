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
    if (user.assignedBranches.isNotEmpty) {
      Branch? active = state.currentBranch;
      if (active == null || !user.assignedBranches.any((b) => b.id == active!.id)) {
        active = user.assignedBranches.first;
      }
      state = state.copyWith(
        assignedBranches: user.assignedBranches,
        currentBranch: active,
        isLoading: false,
      );
    } else if (user.assignedBranchIds.isNotEmpty) {
      loadAssignedBranches(user.assignedBranchIds);
    } else {
      state = const BranchState();
    }
  }

  Future<void> loadAssignedBranches(List<String> assignedBranchIds) async {
    if (assignedBranchIds.isEmpty) {
      state = state.copyWith(assignedBranches: [], currentBranch: null);
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final allBranches = await _branchRepository.getBranches();
      final assigned = allBranches
          .where((b) => assignedBranchIds.contains(b.id))
          .toList();

      Branch? active = state.currentBranch;
      if (active == null || !assigned.any((b) => b.id == active!.id)) {
        active = assigned.isNotEmpty ? assigned.first : null;
      }

      state = state.copyWith(
        assignedBranches: assigned,
        currentBranch: active,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void selectBranch(Branch branch) {
    if (state.assignedBranches.any((b) => b.id == branch.id)) {
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
