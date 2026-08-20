# 📋 Flutter Staff App → Real Backend Integration Audit Report (M18)

**Audit Version**: 1.0.0 (M18 Integration Readiness)  
**Contract Authority**: M0 V10 Frozen Shared System Contract  
**Repository**: `AmigosiaDev/canteen-native` (`main` branch)  
**Target Backend**: Dev 2 `/api/v1` REST Backend + PostgreSQL  

---

## 1. ⚙️ API Mode & Switching Architecture

### Configuration Point
The API mode is configured in [`lib/core/config/app_config.dart`](file:///d:/Flutter%20Money%20card/lib/core/config/app_config.dart):

```dart
static ApiMode apiMode = ApiMode.fromString(
  const String.fromEnvironment('API_MODE', defaultValue: 'mock'),
);

static String baseUrl = const String.fromEnvironment(
  'BASE_URL',
  defaultValue: 'http://localhost:8080/api/v1',
);
```

### Switching Mechanism (Mock → Real)
To run the Flutter app against Dev 2's live backend, provide compile-time or runtime environment parameters:

```bash
# Run against local backend
flutter run --dart-define=API_MODE=real --dart-define=BASE_URL=http://localhost:8080/api/v1

# Run against staging / production backend
flutter run --dart-define=API_MODE=real --dart-define=BASE_URL=https://api.moneycard.io/api/v1

# Production Release Build
flutter build apk --release --dart-define=API_MODE=real --dart-define=BASE_URL=https://api.moneycard.io/api/v1
```

### Mock Interceptor Disconnect in Real Mode
In [`lib/core/network/dio_client.dart`](file:///d:/Flutter%20Money%20card/lib/core/network/dio_client.dart):
- `if (effectiveMock) { dio.interceptors.add(MockApiInterceptor()); }`
- When `API_MODE=real`, `MockApiInterceptor` is **not** added to the Dio pipeline.
- All HTTP calls dispatch directly over TCP/TLS to the real backend host.
- If real API requests fail (network outage, 4xx, 5xx), the app throws a structured `ApiException` and shows the error state. **No silent fallback to mock data exists anywhere.**

---

## 2. 🔄 Data Flow Audit

The end-to-end data pipeline is unified and strictly decoupled across every screen:

$$\text{Flutter UI} \longrightarrow \text{Riverpod Notifier} \longrightarrow \text{Repository} \longrightarrow \text{Service} \longrightarrow \text{Dio Client} \longrightarrow \text{/api/v1} \longrightarrow \text{Backend (PostgreSQL)}$$
$$\text{Backend Response JSON} \longrightarrow \text{ApiService Envelope Handler} \longrightarrow \text{Model.fromJson} \longrightarrow \text{Notifier State} \longrightarrow \text{UI}$$

### Detailed Chain Verification

| Layer | Implementation Class | Verification Status |
| :--- | :--- | :--- |
| **UI Presentation** | `HomeScreen`, `PosCheckoutScreen`, `RechargeScreen`, `ReturnCardScreen`, `CardsScreen`, `SessionsScreen`, `InventoryScreen`, `AnalyticsScreen`, `AddProductScreen` | **PASS** — Consumes Riverpod state directly; zero hardcoded business data |
| **State Management** | `posCartNotifierProvider`, `sessionListNotifierProvider`, `inventoryNotifierProvider`, `rechargeNotifierProvider`, `returnCardNotifierProvider`, `cardDetailsNotifierProvider`, `analyticsNotifierProvider`, `addProductNotifierProvider` | **PASS** — Holds typed immutable state; handles loading, error, and data transitions |
| **Repository Layer** | `ProductRepository`, `SessionRepository`, `InventoryRepository`, `CardRepository`, `AnalyticsRepository`, `BranchRepository`, `AuthRepository` | **PASS** — Enforces domain abstractions; delegates directly to services |
| **Service Layer** | `ProductService`, `SessionService`, `InventoryService`, `CardService`, `AnalyticsService`, `BranchService`, `AuthService` | **PASS** — Enforces endpoint path formatting, payload mapping, and query parameters |
| **Network Client** | `ApiService` + `DioClient` + `AuthInterceptor` + `ErrorInterceptor` | **PASS** — Enforces M0 V10 `{success, data, error}` envelope parsing and bearer auth |

---

## 3. 🎯 Feature-by-Feature Integration Audit

### 3.1 Authentication & Multi-Branch RBAC
- **Login (`POST /auth/login`)**: Sends `{email, password}`; receives `{accessToken, refreshToken, user}`.
- **Current User (`GET /auth/me`)**: Retrieves authorized `AuthUser` with roles, permissions (`List<AppPermission>`), and `assignedBranchIds`.
- **Token Refresh (`POST /auth/refresh`)**: `AuthInterceptor` detects 401s, executes single synchronized token refresh, updates storage, and retries original request.
- **Logout (`POST /auth/logout`)**: Revokes backend session and clears `FlutterSecureStorage`.
- **RBAC**: Enforces all 20 M0 V10 permissions via `PermissionChecker`.

### 3.2 Card Inventory & Dual Issuance
- **List Cards (`GET /cards`)**: Retrieves cards scoped by `branchId` and `status` (`AVAILABLE`, `ACTIVE`, `BLOCKED`).
- **Resolve Card (`POST /cards/resolve`)**: Resolves scanned QR token or physical number; returns 404 if not found (zero auto-creation of unknown cards).
- **Issue Card (`POST /card-sessions`)**: Associates available card with active branch; initiates `ACTIVE` session.
- **Block/Unblock (`POST /cards/:id/block`, `POST /cards/:id/unblock`)**: Modifies card status with audit reason.

### 3.3 Active Sessions & Home Dashboard
- **Active Sessions (`GET /card-sessions?status=ACTIVE`)**:
  - Dynamically calculates active session count.
  - Excludes `SETTLED`, `CLOSED`, `REFUNDED`, and `CANCELLED` sessions.
  - Separates Card Status vs. Session Status.
- **Session Details (`GET /card-sessions/:id`)**: Retrieves live session balance and transaction history.
- **Real-Time Reactivity**: Auto-refreshes session count and balance upon purchase, recharge, issuance, and settlement.

### 3.4 POS Purchases & Pricing
- **Product Catalog (`GET /products?branchId=...&status=ACTIVE`)**: Live product catalog with multi-select category array (zero tags).
- **Create Product (`POST /products`)**: Mock & real product creation form with grouped category suggestions.
- **Purchase Execution (`POST /card-sessions/:id/purchase`)**:
  - Payload: `{items: [{productId: "...", quantity: 2}]}`.
  - Backend authoritative deduction: Updates session balance and decreases product stock in PostgreSQL.

### 3.5 Recharge (Cash & Counter UPI)
- **Recharge (`POST /card-sessions/:id/recharge`)**:
  - Payment methods: `CASH` or `UPI`.
  - Manual UPI Verification: Staff verifies customer payment on store counter QR and enters reference number.
  - Authoritative balance update: Session balance immediately reflects backend credit amount.

### 3.6 Settlement & Card Return
- **Return Card (`POST /card-sessions/:id/return`)**:
  - Settle session, refunds remaining balance to customer.
  - Transitions session to `SETTLED` and card status back to `AVAILABLE`.

### 3.7 Inventory & Stock Adjustments
- **Stock List (`GET /inventory?branchId=...`)**: Fetches stock levels and low-stock alerts.
- **Stock Adjustment (`POST /inventory/:id/adjust`)**: Dispatches adjustments with audit reasons.
- **Movement History (`GET /inventory/movements`)**: Fetches stock movement audit log.

### 3.8 Branch Analytics
- **Analytics (`GET /analytics?branchId=...&range=...`)**: Displays revenue, transactions, purchases, peak hours, and product demand calculated by backend analytics engine.

---

## 4. 🌐 Complete API Endpoint Coverage Table

| Flutter Feature | M0 V10 API Endpoint | HTTP Method | Service / Repository | Riverpod Provider | Response Model | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth Login** | `/api/v1/auth/login` | `POST` | `AuthService` / `AuthRepository` | `authNotifierProvider` | `AuthResponseData` | **READY** |
| **Auth Me** | `/api/v1/auth/me` | `GET` | `AuthService` / `AuthRepository` | `authNotifierProvider` | `AuthUser` | **READY** |
| **Auth Refresh** | `/api/v1/auth/refresh` | `POST` | `AuthService` / `AuthRepository` | `AuthInterceptor` | `AuthResponseData` | **READY** |
| **Auth Logout** | `/api/v1/auth/logout` | `POST` | `AuthService` / `AuthRepository` | `authNotifierProvider` | `void` | **READY** |
| **Branch List** | `/api/v1/branches` | `GET` | `BranchService` / `BranchRepository` | `branchNotifierProvider` | `List<Branch>` | **READY** |
| **Branch By ID** | `/api/v1/branches/:id` | `GET` | `BranchService` / `BranchRepository` | `branchNotifierProvider` | `Branch` | **READY** |
| **Card List** | `/api/v1/cards` | `GET` | `CardService` / `CardRepository` | `availableCardsNotifierProvider` | `List<Card>` | **READY** |
| **Card By ID** | `/api/v1/cards/:id` | `GET` | `CardService` / `CardRepository` | `cardDetailsNotifierProvider` | `Card` | **READY** |
| **Card Resolve** | `/api/v1/cards/resolve` | `POST` | `CardService` / `CardRepository` | `cardDetailsNotifierProvider` | `ResolveQrResponseData` | **READY** |
| **Create Card** | `/api/v1/cards` | `POST` | `CardService` / `CardRepository` | `cardDetailsNotifierProvider` | `Card` | **READY** |
| **Block Card** | `/api/v1/cards/:id/block` | `POST` | `CardService` / `CardRepository` | `cardDetailsNotifierProvider` | `Card` | **READY** |
| **Unblock Card** | `/api/v1/cards/:id/unblock` | `POST` | `CardService` / `CardRepository` | `cardDetailsNotifierProvider` | `Card` | **READY** |
| **List Sessions** | `/api/v1/card-sessions` | `GET` | `SessionService` / `SessionRepository` | `sessionListNotifierProvider` | `List<CardSession>` | **READY** |
| **Session By ID** | `/api/v1/card-sessions/:id` | `GET` | `SessionService` / `SessionRepository` | `sessionDetailsNotifierProvider` | `CardSession` | **READY** |
| **Create Session** | `/api/v1/card-sessions` | `POST` | `SessionService` / `SessionRepository` | `sessionDetailsNotifierProvider` | `CardSession` | **READY** |
| **Recharge** | `/api/v1/card-sessions/:id/recharge` | `POST` | `SessionService` / `SessionRepository` | `rechargeNotifierProvider` | `RechargeResult` | **READY** |
| **Purchase** | `/api/v1/card-sessions/:id/purchase` | `POST` | `SessionService` / `SessionRepository` | `posCartNotifierProvider` | `PurchaseResult` | **READY** |
| **Return Card** | `/api/v1/card-sessions/:id/return` | `POST` | `SessionService` / `SessionRepository` | `returnCardNotifierProvider` | `SessionReturnResult` | **READY** |
| **List Products** | `/api/v1/products` | `GET` | `ProductService` / `ProductRepository` | `posCatalogNotifierProvider` | `List<Product>` | **READY** |
| **Product By ID** | `/api/v1/products/:id` | `GET` | `ProductService` / `ProductRepository` | `productRepositoryProvider` | `Product` | **READY** |
| **Create Product** | `/api/v1/products` | `POST` | `ProductService` / `ProductRepository` | `addProductNotifierProvider` | `Product` | **READY** |
| **List Inventory** | `/api/v1/inventory` | `GET` | `InventoryService` / `InventoryRepository` | `inventoryNotifierProvider` | `List<InventoryItem>` | **READY** |
| **Adjust Stock** | `/api/v1/inventory/:id/adjust` | `POST` | `InventoryService` / `InventoryRepository` | `inventoryNotifierProvider` | `InventoryItem` | **READY** |
| **Movements** | `/api/v1/inventory/movements` | `GET` | `InventoryService` / `InventoryRepository` | `inventoryNotifierProvider` | `List<InventoryMovement>` | **READY** |
| **Analytics** | `/api/v1/analytics` | `GET` | `AnalyticsService` / `AnalyticsRepository` | `analyticsNotifierProvider` | `BranchPerformanceMetric` | **READY** |

---

## 5. 🛡️ Tenancy & Isolation Compliance

1. **Organization Isolation**:
   - Auth state stores `organizationId` from authenticated token.
   - All query operations strictly bound to user's tenancy.
   - `MockApiInterceptor` and real backend reject foreign organization entities.
2. **Branch Isolation**:
   - `currentBranchProvider` supplies active branch.
   - Endpoints (`/products`, `/inventory`, `/card-sessions`, `/analytics`) enforce `branchId` scoping.
   - Staff cannot view or alter unauthorized branch data.

---

## 6. 🧪 Automated Test Suite Status

- **Dart Analysis (`dart analyze .`)**: **0 issues found** (100% clean).
- **Flutter Test Suite (`flutter test`)**: **104/104 tests passing green**:
  - `M0 V10 Data Models Serialization Tests`: 7/7 passing
  - `Mock API Engine & M0 V10 Compliance Tests`: 11/11 passing
  - `Auth Unit & Widget Tests`: 9/9 passing
  - `Card Operations Tests`: 8/8 passing
  - `Session Operations Tests`: 8/8 passing
  - `POS Catalog & Purchase Tests`: 6/6 passing
  - `Recharge Tests`: 8/8 passing
  - `Return Card Tests`: 4/4 passing
  - `Inventory Operations Tests`: 12/12 passing
  - `Analytics Tests`: 10/10 passing
  - `Product Operations & Add Product Tests`: 3/3 passing
  - `Home Dashboard Active Sessions Tests`: 5/5 passing
  - `Design System & Shell Tests`: 13/13 passing

---

## 7. 🏁 Final Status & Verdict

```
================================================================================
                    FINAL AUDIT VERDICT:
          READY FOR DEV 2 BACKEND INTEGRATION ✅
================================================================================
```

### Integration Summary
- **Real API Switch Ready**: Simply run with `--dart-define=API_MODE=real --dart-define=BASE_URL=<URL>`.
- **Zero Mock Leakage**: Mock interceptors and test accounts are conditionally isolated.
- **Contract Fidelity**: Conforms 100% to M0 V10 Shared System Contract.
- **Financial Authoritativeness**: All transaction sums, card balances, and stock quantities are backend-authoritative.
