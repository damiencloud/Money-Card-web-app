import '../features/auth/change_password_screen.dart';
import '../core/constants/permission_constants.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/cards/card_details_screen.dart';
import '../features/cards/cards_screen.dart';
import '../features/cards/issue_card_screen.dart';
import '../features/home/home_screen.dart';
import '../features/inventory/inventory_screen.dart';
import '../features/more/mock_qr_codes_screen.dart';
import '../features/more/more_screen.dart';
import '../features/payments/recharge_screen.dart';
import '../features/payments/return_card_screen.dart';
import '../features/pos/pos_checkout_screen.dart';
import '../features/pos/pos_scan_purchase_screen.dart';
import '../features/products/products_screen.dart';
import '../features/receipt/bill_receipt_screen.dart';
import '../features/sessions/session_details_screen.dart';
import '../features/sessions/sessions_screen.dart';
import '../models/receipt_bill.dart';
import '../providers/auth_provider.dart';
import '../widgets/shell/staff_app_shell.dart';
import '../widgets/states/app_unauthorized_state.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();
final shellNavigatorKey = GlobalKey<NavigatorState>();

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen<AuthState>(authNotifierProvider, (_, _) {
      notifyListeners();
    });
  }
}

/// Router Provider configured with stable singleton GoRouter and reactive refreshListenable
final Provider<GoRouter> appRouterProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _AuthListenable(ref);
  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/app/home',
    refreshListenable: refreshListenable,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final authState = ref.read(authNotifierProvider);
      final isLoggingIn = state.matchedLocation == '/login';

      // 1. Initial startup session check in progress
      if (authState.status == AuthStatus.initial) {
        return null;
      }

      // 2. Unauthenticated or Session Expired -> enforce login
      if (!authState.isAuthenticated) {
        return isLoggingIn ? null : '/login';
      }

      // 3. Authenticated Staff attempting to view Login -> redirect to Home
      if (isLoggingIn) {
        return '/app/home';
      }

      return null;
    },
    routes: [
      // Public Route: Login
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),

      // Password Change (Mandatory & Voluntary)
      GoRoute(
        path: '/change-password',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const ChangePasswordScreen(),
      ),

      // Access Denied / Unauthorized Route
      GoRoute(
        path: '/unauthorized',
        builder: (context, state) => Scaffold(
          appBar: AppBar(title: const Text('Access Denied')),
          body: const SafeArea(
            child: AppUnauthorizedState(),
          ),
        ),
      ),

      // QR Scanner & Unified POS Purchase Flow
      GoRoute(
        path: '/app/scanner',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PosScanPurchaseScreen(),
      ),

      // Card Details & Issuing routes
      GoRoute(
        path: '/app/cards/issue',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const IssueCardScreen(),
      ),
      GoRoute(
        path: '/app/cards/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final cardId = state.pathParameters['id'] ?? '';
          return CardDetailsScreen(cardId: cardId);
        },
      ),

      // Session Details route
      GoRoute(
        path: '/app/sessions/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return SessionDetailsScreen(sessionId: sessionId);
        },
      ),

      // POS Checkout Screen
      GoRoute(
        path: '/app/pos/:sessionId',
        parentNavigatorKey: rootNavigatorKey,
        redirect: (context, state) {
          final user = ref.read(currentUserProvider);
          final permissions = user?.permissions ?? [];
          if (!permissions.contains(AppPermission.purchase)) {
            return '/unauthorized';
          }
          return null;
        },
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId'] ?? '';
          return PosCheckoutScreen(sessionId: sessionId);
        },
      ),

      // Recharge Screen
      GoRoute(
        path: '/app/recharge/:sessionId',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId'] ?? '';
          final card = state.uri.queryParameters['card'];
          return RechargeScreen(sessionId: sessionId, physicalCardNumber: card);
        },
      ),

      // Return Card Screen (Supports both /app/return-card/:sessionId and /app/return/:sessionId)
      GoRoute(
        path: '/app/return-card/:sessionId',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId'] ?? '';
          final card = state.uri.queryParameters['card'];
          return ReturnCardScreen(sessionId: sessionId, physicalCardNumber: card);
        },
      ),
      GoRoute(
        path: '/app/return/:sessionId',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId'] ?? '';
          final card = state.uri.queryParameters['card'];
          return ReturnCardScreen(sessionId: sessionId, physicalCardNumber: card);
        },
      ),

      // Standalone nested routes for More items
      GoRoute(
        path: '/app/products',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const ProductsScreen(),
      ),
      GoRoute(
        path: '/app/inventory',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const InventoryScreen(),
      ),
      GoRoute(
        path: '/app/analytics',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: '/app/more/mock-qr',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const MockQrCodesScreen(),
      ),
      GoRoute(
        path: '/app/bill',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final bill = state.extra is ReceiptBill
              ? state.extra as ReceiptBill
              : ReceiptBill.mockPurchase();
          return BillReceiptScreen(bill: bill);
        },
      ),

      // Redirect /app root to /app/home
      GoRoute(
        path: '/app',
        redirect: (context, state) => '/app/home',
      ),

      // Four-Section Protected Shell Routes
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) {
          return StaffAppShell(
            currentPath: state.matchedLocation,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/app/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: '/app/cards',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CardsScreen(),
            ),
          ),
          GoRoute(
            path: '/app/sessions',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SessionsScreen(),
            ),
          ),
          GoRoute(
            path: '/app/more',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MoreScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});
