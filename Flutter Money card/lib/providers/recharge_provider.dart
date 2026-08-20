import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/card_session.dart';
import '../models/transaction.dart';
import '../repositories/session_repository.dart';
import 'api_providers.dart';
import 'session_operations_provider.dart';

class RechargeState {
  final PaymentMethod paymentMethod;
  final double amount;
  final String? paymentReference;
  final bool isStaffVerified;
  final bool isSubmitting;
  final RechargeResult? rechargeResult;
  final String? errorMessage;

  const RechargeState({
    this.paymentMethod = PaymentMethod.cash,
    this.amount = 0.0,
    this.paymentReference,
    this.isStaffVerified = false,
    this.isSubmitting = false,
    this.rechargeResult,
    this.errorMessage,
  });

  bool get canSubmit {
    if (amount <= 0 || isSubmitting) return false;
    if (paymentMethod == PaymentMethod.upi && !isStaffVerified) return false;
    return true;
  }

  RechargeState copyWith({
    PaymentMethod? paymentMethod,
    double? amount,
    String? paymentReference,
    bool? isStaffVerified,
    bool? isSubmitting,
    RechargeResult? rechargeResult,
    String? errorMessage,
  }) {
    return RechargeState(
      paymentMethod: paymentMethod ?? this.paymentMethod,
      amount: amount ?? this.amount,
      paymentReference: paymentReference ?? this.paymentReference,
      isStaffVerified: isStaffVerified ?? this.isStaffVerified,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      rechargeResult: rechargeResult ?? this.rechargeResult,
      errorMessage: errorMessage,
    );
  }
}

class RechargeNotifier extends StateNotifier<RechargeState> {
  final SessionRepository _sessionRepository;
  final SessionDetailsNotifier? _sessionDetailsNotifier;
  final void Function()? _onRechargeSuccess;

  RechargeNotifier(this._sessionRepository, [this._sessionDetailsNotifier, this._onRechargeSuccess])
      : super(const RechargeState());

  void setPaymentMethod(PaymentMethod method) {
    state = state.copyWith(
      paymentMethod: method,
      isStaffVerified: false,
      errorMessage: null,
    );
  }

  void setAmount(double amount) {
    state = state.copyWith(amount: amount, errorMessage: null);
  }

  void setPaymentReference(String reference) {
    state = state.copyWith(
      paymentReference: reference.trim().isEmpty ? null : reference.trim(),
      errorMessage: null,
    );
  }

  void setStaffVerified(bool verified) {
    state = state.copyWith(isStaffVerified: verified, errorMessage: null);
  }

  Future<RechargeResult?> executeRecharge(String sessionId) async {
    if (!state.canSubmit) return null;

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    try {
      final result = await _sessionRepository.recharge(
        sessionId: sessionId,
        amount: state.amount,
        paymentMethod: state.paymentMethod,
        externalReference: state.paymentReference,
      );

      state = state.copyWith(
        isSubmitting: false,
        rechargeResult: result,
      );

      // Refresh parent session details if notifier provided
      _sessionDetailsNotifier?.updateSessionBalance(result.balance);
      _onRechargeSuccess?.call();

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
        errorMessage: 'Unable to process recharge. Please verify network and try again.',
      );
      return null;
    }
  }

  void reset() {
    state = const RechargeState();
  }
}

final StateNotifierProvider<RechargeNotifier, RechargeState> rechargeNotifierProvider =
    StateNotifierProvider<RechargeNotifier, RechargeState>((ref) {
  final sessionRepository = ref.watch(sessionRepositoryProvider);
  final sessionDetailsNotifier = ref.watch(sessionDetailsNotifierProvider.notifier);
  return RechargeNotifier(sessionRepository, sessionDetailsNotifier, () {
    try {
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
    } catch (_) {}
  });
});
