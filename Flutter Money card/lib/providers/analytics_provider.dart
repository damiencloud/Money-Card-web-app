import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/analytics.dart';
import '../repositories/analytics_repository.dart';
import 'api_providers.dart';
import 'branch_provider.dart';

const Object _analyticsSentinel = Object();

class AnalyticsState {
  final bool isLoading;
  final BranchPerformanceMetric? analytics;
  final String selectedRange; // 'Today', 'Week', 'Month'
  final String? errorMessage;

  const AnalyticsState({
    this.isLoading = false,
    this.analytics,
    this.selectedRange = 'Today',
    this.errorMessage,
  });

  AnalyticsState copyWith({
    bool? isLoading,
    BranchPerformanceMetric? analytics,
    String? selectedRange,
    Object? errorMessage = _analyticsSentinel,
  }) {
    return AnalyticsState(
      isLoading: isLoading ?? this.isLoading,
      analytics: analytics ?? this.analytics,
      selectedRange: selectedRange ?? this.selectedRange,
      errorMessage: errorMessage == _analyticsSentinel
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}

class AnalyticsNotifier extends StateNotifier<AnalyticsState> {
  final AnalyticsRepository _analyticsRepository;
  final String? _currentBranchId;

  AnalyticsNotifier(this._analyticsRepository, this._currentBranchId)
      : super(const AnalyticsState()) {
    loadAnalytics();
  }

  Future<void> loadAnalytics() async {
    final branchId = _currentBranchId;
    if (branchId == null) return;

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final data = await _analyticsRepository.getBranchAnalytics(
        branchId: branchId,
        range: state.selectedRange,
      );

      state = state.copyWith(
        isLoading: false,
        analytics: data,
      );
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load branch analytics.',
      );
    }
  }

  void setRange(String range) {
    state = state.copyWith(selectedRange: range);
    loadAnalytics();
  }
}

final StateNotifierProvider<AnalyticsNotifier, AnalyticsState> analyticsNotifierProvider =
    StateNotifierProvider<AnalyticsNotifier, AnalyticsState>((ref) {
  final analyticsRepository = ref.watch(analyticsRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return AnalyticsNotifier(analyticsRepository, currentBranch?.id);
});
