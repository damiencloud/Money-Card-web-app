import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/card_session.dart';
import '../repositories/session_repository.dart';
import 'api_providers.dart';
import 'branch_provider.dart';

// ==========================================
// 1. SESSIONS LIST STATE & NOTIFIER
// ==========================================

class SessionListState {
  final bool isLoading;
  final List<CardSession> sessions;
  final String statusFilter; // 'ACTIVE', 'ALL', 'SETTLED'
  final String searchQuery;
  final String? errorMessage;

  const SessionListState({
    this.isLoading = false,
    this.sessions = const [],
    this.statusFilter = 'ACTIVE',
    this.searchQuery = '',
    this.errorMessage,
  });

  List<CardSession> get filteredSessions {
    var list = sessions;
    if (statusFilter != 'ALL') {
      list = list.where((s) => s.status.value == statusFilter).toList();
    }
    if (searchQuery.trim().isEmpty) return list;
    final query = searchQuery.trim().toLowerCase();
    return list.where((s) {
      final id = s.id.toLowerCase();
      final cardId = s.cardId.toLowerCase();
      final pcn = (s.physicalCardNumber ?? '').toLowerCase();
      return id.contains(query) || cardId.contains(query) || pcn.contains(query);
    }).toList();
  }

  SessionListState copyWith({
    bool? isLoading,
    List<CardSession>? sessions,
    String? statusFilter,
    String? searchQuery,
    String? errorMessage,
  }) {
    return SessionListState(
      isLoading: isLoading ?? this.isLoading,
      sessions: sessions ?? this.sessions,
      statusFilter: statusFilter ?? this.statusFilter,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class SessionListNotifier extends StateNotifier<SessionListState> {
  final SessionRepository _sessionRepository;
  final String? _currentBranchId;

  SessionListNotifier(this._sessionRepository, this._currentBranchId)
      : super(const SessionListState());

  Future<void> loadSessions({bool force = false}) async {
    if (!force && state.isLoading) return;
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final statusParam = state.statusFilter == 'ALL' ? null : state.statusFilter;
      final sessions = await _sessionRepository.listSessions(
        branchId: _currentBranchId,
        status: statusParam,
      );

      state = state.copyWith(
        isLoading: false,
        sessions: sessions,
      );
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load active sessions. Please check your connection.',
      );
    }
  }

  void setStatusFilter(String status) {
    state = state.copyWith(statusFilter: status);
    loadSessions();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }
}

final StateNotifierProvider<SessionListNotifier, SessionListState> sessionListNotifierProvider =
    StateNotifierProvider<SessionListNotifier, SessionListState>((ref) {
  final sessionRepository = ref.watch(sessionRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return SessionListNotifier(sessionRepository, currentBranch?.id);
});

// ==========================================
// 2. SESSION DETAILS STATE & NOTIFIER
// ==========================================

class SessionDetailsState {
  final bool isLoading;
  final bool isSubmitting;
  final CardSession? session;
  final SessionReturnResult? returnResult;
  final String? errorMessage;
  final String? successMessage;

  const SessionDetailsState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.session,
    this.returnResult,
    this.errorMessage,
    this.successMessage,
  });

  SessionDetailsState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    CardSession? session,
    SessionReturnResult? returnResult,
    String? errorMessage,
    String? successMessage,
  }) {
    return SessionDetailsState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      session: session ?? this.session,
      returnResult: returnResult ?? this.returnResult,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class SessionDetailsNotifier extends StateNotifier<SessionDetailsState> {
  final SessionRepository _sessionRepository;

  SessionDetailsNotifier(this._sessionRepository)
      : super(const SessionDetailsState());

  /// Load active session by ID
  Future<void> loadSessionById(String sessionId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final session = await _sessionRepository.getSessionById(sessionId);
      state = state.copyWith(
        isLoading: false,
        session: session,
      );
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load session details.',
      );
    }
  }

  /// Create new session for an available card
  Future<CardSession?> createSession({
    required String cardId,
    required String branchId,
    String? customerName,
    String? customerPhone,
    double initialAmount = 0,
    String paymentMethod = 'CASH',
  }) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final session = await _sessionRepository.createSession(
        cardId: cardId,
        branchId: branchId,
        customerName: customerName,
        customerPhone: customerPhone,
        initialAmount: initialAmount,
        paymentMethod: paymentMethod,
      );
      state = state.copyWith(
        isSubmitting: false,
        session: session,
        successMessage: 'Session started successfully.',
      );
      return session;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to start session. Please try again.',
      );
      return null;
    }
  }

  /// Return/settle an active session and refund remaining balance
  Future<SessionReturnResult?> returnSession(String sessionId) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final result = await _sessionRepository.returnSession(sessionId);
      state = state.copyWith(
        isSubmitting: false,
        returnResult: result,
        successMessage: 'Session returned successfully.',
      );
      return result;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to settle session. Please try again.',
      );
      return null;
    }
  }

  /// Update local session balance after purchase or recharge
  void updateSessionBalance(double newBalance) {
    if (state.session != null) {
      state = state.copyWith(
        session: state.session!.copyWith(balance: newBalance),
      );
    }
  }

  void clearMessages() {
    state = state.copyWith(errorMessage: null, successMessage: null);
  }
}

final StateNotifierProvider<SessionDetailsNotifier, SessionDetailsState> sessionDetailsNotifierProvider =
    StateNotifierProvider<SessionDetailsNotifier, SessionDetailsState>((ref) {
  final sessionRepository = ref.watch(sessionRepositoryProvider);
  return SessionDetailsNotifier(sessionRepository);
});
