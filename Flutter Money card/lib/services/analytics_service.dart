import '../core/constants/api_endpoints.dart';
import '../models/analytics.dart';
import 'api_service.dart';

class AnalyticsService {
  final ApiService _apiService;

  AnalyticsService(this._apiService);

  /// Fetch branch-scoped performance analytics (GET /api/v1/analytics)
  Future<BranchPerformanceMetric> getBranchAnalytics({
    required String branchId,
    String? range,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': branchId,
      'range': ?range,
    };

    return _apiService.get<BranchPerformanceMetric>(
      ApiEndpoints.analytics,
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is Map<String, dynamic>) {
          if (data['branchPerformance'] is List && (data['branchPerformance'] as List).isNotEmpty) {
            return BranchPerformanceMetric.fromJson((data['branchPerformance'] as List).first as Map<String, dynamic>);
          }
          return BranchPerformanceMetric.fromJson(data);
        }
        return const BranchPerformanceMetric(branchId: '', branchName: '');
      },
    );
  }
}
