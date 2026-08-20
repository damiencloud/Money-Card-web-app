# Money Card — Staff Application (Flutter)

A Flutter mobile application designed for cafeteria and POS staff operations within the Money Card ecosystem, built according to the **M0 V10 Shared System Contract**.

---

## 🏛 Architecture Overview

```
Flutter UI (Staff Shell / Features)
       ↓
Riverpod Providers (StateNotifiers & async providers)
       ↓
Repositories (Domain abstractions & caching)
       ↓
Services (HTTP payload helpers & endpoint calls)
       ↓
Dio API Client (/api/v1 with Auth, Error, and Mock interceptors)
       ↓
Backend /api/v1 (Mock API during M13; Real API in future milestones)
```

> **Strict Architectural Boundary**: The UI never communicates with Dio directly. All network requests flow through Riverpod providers, Repositories, and Services.

---

## 📂 Project Structure

```
lib/
├── core/
│   ├── config/              # App environment and timeout configuration
│   ├── constants/           # ApiEndpoints, AppColors, AppSpacing, Permissions (20)
│   ├── errors/              # ApiErrorCode (M0 V10) & ApiException
│   ├── network/             # DioClient & Auth/Error/Mock Interceptors
│   ├── storage/             # TokenStorage (SecureTokenStorage & InMemoryTokenStorage)
│   ├── theme/               # Modern Material3 AppTheme (Light & Dark)
│   └── utils/               # Formatters, QrValidator, Logger
│
├── models/                  # M0 V10 Shared Models (AuthUser, Card, Session, Product, etc.)
├── repositories/            # AuthRepository, CardRepository, BranchRepository
├── services/                # ApiService, AuthService, CardService, BranchService
├── providers/               # Riverpod State Providers (Auth, Branch, Permission, Theme)
├── routing/                 # GoRouter with Protected Route Guards
├── features/                # Domain Screens (Auth, Cards, Sessions, Products, Inventory, Analytics)
├── widgets/                 # Reusable UI States (Loading, Empty, Error, Network, QR Scanner)
└── main.dart                # Application entry point with ProviderScope
```

---

## 🔐 Authentication & Permissions

- **Operational Role**: `STAFF` (Strictly only `STAFF`).
- **Permissions**: Fully supports the 20 M0 V10 permission identifiers (Cards, Sessions, Inventory, Reports, Staff, Branch).
- **Branch Context**: Displays assigned branches with active branch switcher in the App Shell.
- **Secure Storage**: Tokens are stored using `FlutterSecureStorage` with encryption.

---

## 📷 QR Scanner Foundation

- Uses `mobile_scanner` with runtime camera permission handling.
- Extracts opaque QR tokens (`https://.../c/{token}` or raw token).
- Debounces duplicate scans.
- Dispatches parsed tokens to the repository layer for card & session resolution.

---

## 🧪 Testing & Verification

Run tests:
```bash
flutter test
```

Run static analysis:
```bash
flutter analyze
```

---

## 🚀 Running the Application

```bash
flutter run
```
