import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../core/errors/error_codes.dart';
import '../models/auth_user.dart';
import '../repositories/auth_repository.dart';
import 'api_providers.dart';

enum AuthStatus {
  initial,
  unauthenticated,
  authenticating,
  authenticated,
  refreshing,
  sessionExpired,
  error,
}

class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;

  const AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  const AuthState.initial()
      : status = AuthStatus.initial,
        user = null,
        errorMessage = null;

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isLoading => status == AuthStatus.authenticating || status == AuthStatus.initial;
  bool get isSessionExpired => status == AuthStatus.sessionExpired;
  bool get isAuthenticating => status == AuthStatus.authenticating;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;

  AuthNotifier(this._authRepository) : super(const AuthState.initial()) {
    checkAuthStatus();
  }

  /// Check stored credentials on app startup
  Future<void> checkAuthStatus() async {
    state = state.copyWith(status: AuthStatus.initial);
    try {
      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        state = AuthState(
          status: AuthStatus.authenticated,
          user: user,
        );
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  /// Perform Staff Login with email and password
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(
      status: AuthStatus.authenticating,
      errorMessage: null,
    );

    try {
      final user = await _authRepository.login(
        email: email.trim(),
        password: password,
      );

      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
      );
      return true;
    } on ApiException catch (e) {
      String userMessage;

      if (e.code.name.toUpperCase().contains('STAFF_INACTIVE') || e.message.toLowerCase().contains('no longer active') || e.message.toLowerCase().contains('deactivated')) {
        userMessage = 'Your staff account is no longer active. Please contact your Organization Administrator.';
      } else if (e.code.name.toUpperCase().contains('ORGANIZATION_INACTIVE') || e.message.toLowerCase().contains('organization')) {
        userMessage = 'Your organization account is currently inactive or suspended. Please contact platform administration.';
      } else if (e.code == ApiErrorCode.unauthorized || e.statusCode == 401) {
        userMessage = 'Email or password is incorrect.';
      } else if (e.code == ApiErrorCode.networkError || e.code == ApiErrorCode.timeoutError) {
        userMessage = 'Unable to connect. Check your internet connection and try again.';
      } else if (e.code == ApiErrorCode.validationError) {
        userMessage = e.message.isNotEmpty ? e.message : 'Please check your email and password format.';
      } else {
        userMessage = 'Something went wrong. Please try again.';
      }

      state = AuthState(
        status: AuthStatus.error,
        errorMessage: userMessage,
      );
      return false;
    } catch (e) {
      state = const AuthState(
        status: AuthStatus.error,
        errorMessage: 'Unable to connect. Check your internet connection and try again.',
      );
      return false;
    }
  }

  /// Invalidate session and log out
  Future<void> logout() async {
    state = state.copyWith(status: AuthStatus.authenticating);
    try {
      await _authRepository.logout();
    } finally {
      state = const AuthState(
        status: AuthStatus.unauthenticated,
        user: null,
      );
    }
  }

  /// Mark session as expired and wipe credentials
  void setSessionExpired() {
    state = const AuthState(
      status: AuthStatus.sessionExpired,
      user: null,
      errorMessage: 'Your session has expired. Please log in again.',
    );
  }

  /// Clear active error state
  void clearError() {
    if (state.status == AuthStatus.error) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: null,
      );
    }
  }
}

/// Main Auth State Provider
final StateNotifierProvider<AuthNotifier, AuthState> authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthNotifier(authRepository);
});

/// Current authenticated user convenience provider
final Provider<AuthUser?> currentUserProvider = Provider<AuthUser?>((ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.user;
});

/// Is Authenticated boolean convenience provider
final Provider<bool> isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.isAuthenticated;
});
