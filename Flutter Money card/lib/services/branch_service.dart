import '../core/constants/api_endpoints.dart';
import '../models/branch.dart';
import 'api_service.dart';

class BranchService {
  final ApiService _apiService;

  BranchService(this._apiService);

  Future<List<Branch>> getBranches() async {
    return _apiService.get<List<Branch>>(
      ApiEndpoints.branches,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => Branch.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }

  Future<Branch> getBranchById(String id) async {
    return _apiService.get<Branch>(
      ApiEndpoints.branchById(id),
      fromJson: (data) => Branch.fromJson(data as Map<String, dynamic>),
    );
  }
}
