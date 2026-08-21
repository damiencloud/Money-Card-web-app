import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/dio_client.dart';
import '../core/storage/secure_storage_service.dart';
import '../core/storage/token_storage.dart';
import '../repositories/analytics_repository.dart';
import '../repositories/auth_repository.dart';
import '../repositories/branch_repository.dart';
import '../repositories/card_repository.dart';
import '../repositories/inventory_repository.dart';
import '../repositories/product_repository.dart';
import '../repositories/session_repository.dart';
import '../services/analytics_service.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/branch_service.dart';
import '../services/card_service.dart';
import '../services/inventory_service.dart';
import '../services/product_service.dart';
import '../services/session_service.dart';

/// Provider for secure token storage
final Provider<TokenStorage> tokenStorageProvider = Provider<TokenStorage>((ref) {
  return SecureTokenStorage();
});

/// Callback triggered on 401 unauthenticated / session expiry
final Provider<void Function()?> sessionExpiredCallbackProvider =
    Provider<void Function()?>((ref) => null);

/// Callback to execute token refresh
final Provider<Future<String?> Function(String)?> refreshTokenCallbackProvider =
    Provider<Future<String?> Function(String)?>((ref) => null);

/// Provider for configured Dio HTTP Client with automatic silent token refresh
final Provider<DioClient> dioClientProvider = Provider<DioClient>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);

  return DioClient.create(
    tokenStorage: tokenStorage,
    onRefreshToken: (refreshToken) async {
      try {
        final authService = ref.read(authServiceProvider);
        final response = await authService.refreshToken(refreshToken);
        await tokenStorage.saveTokens(
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? refreshToken,
        );
        return response.accessToken;
      } catch (_) {
        await tokenStorage.clearTokens();
        return null;
      }
    },
    onSessionExpired: () {
      try {
        // Clear tokens on hard expiration
        tokenStorage.clearTokens();
      } catch (_) {}
    },
  );
});

/// Provider for Base ApiService
final Provider<ApiService> apiServiceProvider = Provider<ApiService>((ref) {
  final client = ref.watch(dioClientProvider);
  return ApiService(client.dio);
});

/// Providers for Services
final Provider<AuthService> authServiceProvider = Provider<AuthService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return AuthService(api);
});

final Provider<CardService> cardServiceProvider = Provider<CardService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return CardService(api);
});

final Provider<SessionService> sessionServiceProvider = Provider<SessionService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return SessionService(api);
});

final Provider<ProductService> productServiceProvider = Provider<ProductService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return ProductService(api);
});

final Provider<InventoryService> inventoryServiceProvider = Provider<InventoryService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return InventoryService(api);
});

final Provider<AnalyticsService> analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return AnalyticsService(api);
});

final Provider<BranchService> branchServiceProvider = Provider<BranchService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return BranchService(api);
});

/// Providers for Repositories
final Provider<AuthRepository> authRepositoryProvider = Provider<AuthRepository>((ref) {
  final authService = ref.watch(authServiceProvider);
  final tokenStorage = ref.watch(tokenStorageProvider);
  return AuthRepository(
    authService: authService,
    tokenStorage: tokenStorage,
  );
});

final Provider<CardRepository> cardRepositoryProvider = Provider<CardRepository>((ref) {
  final cardService = ref.watch(cardServiceProvider);
  return CardRepository(cardService);
});

final Provider<SessionRepository> sessionRepositoryProvider = Provider<SessionRepository>((ref) {
  final sessionService = ref.watch(sessionServiceProvider);
  return SessionRepository(sessionService);
});

final Provider<ProductRepository> productRepositoryProvider = Provider<ProductRepository>((ref) {
  final productService = ref.watch(productServiceProvider);
  return ProductRepository(productService);
});

final Provider<InventoryRepository> inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  final inventoryService = ref.watch(inventoryServiceProvider);
  return InventoryRepository(inventoryService);
});

final Provider<AnalyticsRepository> analyticsRepositoryProvider = Provider<AnalyticsRepository>((ref) {
  final analyticsService = ref.watch(analyticsServiceProvider);
  return AnalyticsRepository(analyticsService);
});

final Provider<BranchRepository> branchRepositoryProvider = Provider<BranchRepository>((ref) {
  final branchService = ref.watch(branchServiceProvider);
  return BranchRepository(branchService);
});
