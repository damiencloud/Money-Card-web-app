import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/card_session.dart';
import '../repositories/session_repository.dart';
import 'api_providers.dart';
import 'session_operations_provider.dart';

class ReturnCardState {
  final bool isSubmitting;
  final SessionReturnResult? returnResult;
  final String? errorMessage;

  const ReturnCardState({
    this.isSubmitting = false,
    this.returnResult,
    this.errorMessage,
  });

  ReturnCardState copyWith({
    bool? isSubmitting,
    SessionReturnResult? returnResult,
    String? errorMessage,
  }) {
    return ReturnCardState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      returnResult: returnResult ?? this.returnResult,
      errorMessage: errorMessage,
    );
  }
}

class ReturnCardNotifier extends StateNotifier<ReturnCardState> {
  final SessionRepository _sessionRepository;
  final SessionListNotifier? _sessionListNotifier;

  ReturnCardNotifier(this._sessionRepository, [this._sessionListNotifier])
      : super(const ReturnCardState());

  Future<SessionReturnResult?> executeReturn(String sessionId) async {
    if (state.isSubmitting) return null;

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    try {
      final result = await _sessionRepository.returnSession(sessionId);

      state = state.copyWith(
        isSubmitting: false,
        returnResult: result,
      );

      // Refresh active sessions list
      _sessionListNotifier?.loadSessions();

      return result;
    } on ApiException catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: e.message,
      );
      return null;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to return card. Please verify network and try again.',
      );
      return null;
    }
  }

  void reset() {
    state = const ReturnCardState();
  }
}

final StateNotifierProvider<ReturnCardNotifier, ReturnCardState> returnCardNotifierProvider =
    StateNotifierProvider<ReturnCardNotifier, ReturnCardState>((ref) {
  final sessionRepository = ref.watch(sessionRepositoryProvider);
  final sessionListNotifier = ref.watch(sessionListNotifierProvider.notifier);
  return ReturnCardNotifier(sessionRepository, sessionListNotifier);
});
