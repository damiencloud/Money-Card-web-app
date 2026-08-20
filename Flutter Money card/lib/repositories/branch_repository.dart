import '../models/branch.dart';
import '../services/branch_service.dart';

class BranchRepository {
  final BranchService _branchService;
  List<Branch>? _cachedBranches;

  BranchRepository(this._branchService);

  Future<List<Branch>> getBranches({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedBranches != null) {
      return _cachedBranches!;
    }
    final branches = await _branchService.getBranches();
    _cachedBranches = branches;
    return branches;
  }

  Future<Branch> getBranchById(String id) async {
    return _branchService.getBranchById(id);
  }

  void clearCache() {
    _cachedBranches = null;
  }
}
