# MONEY CARD PLATFORM — COMPLETE DEVELOPMENT ROADMAP
## Fast-Track Schedule: 3 Milestones / Day (Dev 2) + 3 Days Post-Merge QA Window

**Document Version**: 4.1.0 (Optimized Compact Layout)
**Source of Truth**: M0 V10 Frozen Contract • `MONEY_CARD_COMPLETE_API_CONTRACT_V10.pdf`
**Working Standard**: 8 Productive Engineering Hours = 1 Working Day • 5 Days / Week
**Backend Execution Pace**: **3 Milestones per Day for Developer 2** • Backend Delivery in **7 Working Days**
**Dedicated Post-Merge QA**: **3 Working Days** for Joint Integration, Concurrency & Release Testing
**Total Project Timeline**: **10 Working Days (2 Calendar Weeks)**

---

### 1. Project Summary & Time Required

| Platform / Track | Developer | Status | Time Completed | Time Remaining | Total Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend (Node.js/Prisma)** | Developer 2 | Starting from Scratch | 0 Days (0h) | **7 Working Days (56h)** | **7 Working Days (56h)** |
| **Web Frontend (React/TS)** | Developer 1 | 91.3% Complete | 21 Working Days (168h) | **1 Working Day (8h)** | **22 Working Days (176h)** |
| **Staff Mobile App (Flutter)** | Developer 1 | 66.1% Complete | 10.25 Working Days (82h) | **2 Working Days (16h)** | **12.25 Working Days (98h)** |
| **Post-Merge Testing & QA** | Dev 1 + Dev 2 | Scheduled Post-Backend | 0 Days (0h) | **3 Working Days (24h)** | **3 Working Days (24h)** |
| **TOTAL PARALLEL LAUNCH** | **Dev 1 + Dev 2** | **Fast-Track Build + Joint QA** | **31.25 Working Days (250h)** | **10 Working Days (80h)** | **10 Working Days (2 Weeks)** |

---

### 2. Developer 2 (Backend) Complete Roadmap Table
All 20 backend milestones required to implement the 65 routes in `MONEY_CARD_COMPLETE_API_CONTRACT_V10.pdf` (Paced at **3 Milestones / Day**):

| Milestone | Task Name | Time Required | Dependencies | Scope / Deliverable |
| :--- | :--- | :--- | :--- | :--- |
| D2-M1 | Backend Foundation & Architecture | 2.5 Hours (0.33 Day) | None | Setup Express, TypeScript, .env, logger, global error envelope middleware, mount /api/v1 router. |
| D2-M2 | Database Schema & Prisma Setup | 2.5 Hours (0.33 Day) | D2-M1 | Connect PostgreSQL, 12 Prisma models & relations, run migrations, seed DB from TEST_DATA.json. |
| D2-M3 | Authentication Module | 3.0 Hours (0.38 Day) | D2-M2 | Login (POST /auth/login), JWT access token (15m), refresh tokens, logout, GET /auth/me, password reset flow. |
| D2-M4 | Authorization & RBAC Middleware | 2.5 Hours (0.33 Day) | D2-M3 | Role guards (SUPER_ADMIN, ORG_ADMIN, STAFF), 20 permissions evaluator, tenant org & branch isolation. |
| D2-M5 | Organizations Management APIs | 2.5 Hours (0.33 Day) | D2-M4 | Super Admin tenant listing, provisioning, detail, name/status updates with inactive cascade. |
| D2-M6 | Plans, Subscriptions & Overrides | 3.0 Hours (0.38 Day) | D2-M5 | Global plans (NO transaction limits), org assignment, custom quota overrides, direct payments, plan requests. |
| D2-M7 | Branches & Staff Management | 2.5 Hours (0.33 Day) | D2-M4 | Branch CRUD, staff CRUD, branch assignments replacement, permission replacement, branch limit checks. |
| D2-M8 | Cards Management & Resolution | 2.5 Hours (0.33 Day) | D2-M7 | Card list with status filters, physical card creation in AVAILABLE state with qrToken, QR resolve, block/unblock. |
| D2-M9 | Card Sessions Lifecycle | 3.0 Hours (0.38 Day) | D2-M8 | Session creation on AVAILABLE card (card -> ACTIVE), active session list, session detail with balance. |
| D2-M10 | Products Catalog Management | 2.5 Hours (0.33 Day) | D2-M7 | Branch products list, product creation with multi-select category array (NO tags), price validation, auto InventoryItem init. |
| D2-M11 | POS & Purchase Financials Engine | 3.0 Hours (0.38 Day) | D2-M9, D2-M10 | Purchase execution in atomic $transaction: server price lookup, balance & stock check, inventory deduction, Transaction record. |
| D2-M12 | Recharge & Payment Records | 2.5 Hours (0.33 Day) | D2-M9 | Card session top-up with CASH and manual UPI verification, balance addition, idempotency reference support. |
| D2-M13 | Refund & Session Settlement | 2.5 Hours (0.33 Day) | D2-M11, D2-M12 | Session return: calculate balance, record REFUND transaction, zero balance, session -> SETTLED, card -> AVAILABLE. |
| D2-M14 | Inventory & 3-Column CSV Import | 3.0 Hours (0.38 Day) | D2-M10 | Stock list, stock adjustments (prevent negative stock), 3-col CSV template (itemName,category,price), 2-phase preview & commit. |
| D2-M15 | Analytics & Performance Metrics | 2.5 Hours (0.33 Day) | D2-M11, D2-M12 | Real-time aggregated metrics (recharge/purchase/refund volume, branch comparison, peak hours), PDF export streaming. |
| D2-M16 | Formal PDF Reports Engine | 2.5 Hours (0.33 Day) | D2-M15 | Formal reports list and binary PDF streaming download (PDF only per M0 V10). |
| D2-M17 | Public Customer User Portal APIs | 3.0 Hours (0.38 Day) | D2-M9 | Public card QR resolution (masked data & portal token), portal session access, active balance, transactions, receipts. |
| D2-M18 | Audit Logging System | 2.5 Hours (0.33 Day) | D2-M4 | Automated audit interceptors for auth events, card state changes, financials, staff assignments, plan changes. |
| D2-M19 | API Contract Parity Verification | 4.0 Hours (0.50 Day) | D2-M1 to D2-M18 | Systematic verification of all 65 routes against MONEY_CARD_COMPLETE_API_CONTRACT_V10.pdf. |
| D2-M20 | Backend Integration & Postman QA | 4.0 Hours (0.50 Day) | D2-M19 | Execution of all 65 requests in POSTMAN_COLLECTION.json (100% pass) and Handover to Dev 1. |

**Developer 2 Total Time**: **7 Working Days (56 Hours / 1.4 Working Weeks)**

---

### 3. Developer 1 (Web Frontend) Roadmap Table
*(React • TypeScript • Vite • Mock API & Real API Adapter)*

| Milestone | Task Name | Time Required | Current Status | Scope / Deliverable |
| :--- | :--- | :--- | :--- | :--- |
| M1 | Foundation & Design System | 2.0 Days (16h) | ■ COMPLETED | Design tokens, dark/light themes, responsive navigation, top header, breadcrumbs, standard UI kit. |
| M2 | Authentication & RBAC Suite | 2.0 Days (16h) | ■ COMPLETED | Login screens, forgot password modal (neutral response), reset password, change password, profile dropdown, role guards. |
| M3 | Cards Management & Issue | 2.0 Days (16h) | ■ COMPLETED | Card list, QR barcode viewer modal, manual card creation, CSV template download & import, status filter with Available count. |
| M4 | Sessions Management | 1.75 Days (14h) | ■ COMPLETED | Active session dashboard, session issuance, branch filtering, live session balance indicators, session details modal. |
| M5 | POS Terminal & Products | 2.25 Days (18h) | ■ COMPLETED | POS checkout cart, product catalog grid, search/filter, multi-select category tags (string[]), price calculation (no tags). |
| M6 | Payments, Recharge & Refunds | 1.5 Days (12h) | ■ COMPLETED | Cash top-up modal, manual UPI verification modal, digital receipt modal, session return/refund modal with settlement confirmation. |
| M7 | Inventory & 3-Column CSV | 2.0 Days (16h) | ■ COMPLETED | Live inventory table, stock adjustments, low stock badges, 3-column CSV template download, branch 2-phase preview & commit. |
| M8 | Analytics & Peak Demand | 2.0 Days (16h) | ■ COMPLETED | Real-time analytics dashboard, branch performance comparison table, peak hours traffic charts, hourly breakdown, PDF export. |
| M9 | Offline Resilience & Mock Store | 1.5 Days (12h) | ■ COMPLETED | In-memory mock database store, realistic latency simulation, localStorage state persistence, reset store utility. |
| M10 | Admin Controls & Subscriptions | 2.25 Days (18h) | ■ COMPLETED | Super Admin tenant org manager, plan comparison matrix, plan upgrade/downgrade request form, limit overrides manager. |
| M11 | Web Polish & Contract QA | 1.75 Days (14h) | ■ COMPLETED | Automated contract test runner integration, 58/58 test pass verification, zero TypeScript errors, production build optimization. |
| M12 | Web Real Backend Integration | 1.0 Day (8h) | ■ REMAINING (POST-MERGE) | Switch .env VITE_USE_MOCK_API=false to point to live Node.js server (http://localhost:4000/api/v1), smoke test all 65 routes. |

**Web Frontend Status**: **21 Working Days (168 Hours) COMPLETED • 1 Working Day (8 Hours) REMAINING**

---

### 4. Developer 1 (Flutter Mobile App) Roadmap Table
*(Flutter Money card • Android First • Light Mode Only • Minimal UI)*

| Milestone | Task Name | Time Required | Current Status | Scope / Deliverable |
| :--- | :--- | :--- | :--- | :--- |
| M13 | Flutter Foundation & Architecture | 1.75 Days (14h) | ■ COMPLETED | Light theme, Dio network client with Auth/Error/Mock interceptors, SecureStorage token manager, AppRouter, AppShell. |
| M14 | Staff Authentication & Permissions | 1.5 Days (12h) | ■ COMPLETED | Login screen, token refresh handling, branch switcher, PermissionGuard, role/permission providers, auth service. |
| M15 | Staff Cards & QR Operations | 2.25 Days (18h) | ■ COMPLETED | Camera QR scanner (QRScannerView), manual card entry fallback, QR resolve (POST /cards/resolve), card list, Home active session counter. |
| M16 | Payments, POS Checkout & Return | 2.75 Days (22h) | ■ COMPLETED | Cash recharge screen, manual UPI verification screen (store's physical QR used), POS catalog cart (POSCartProvider), return card & refund screen. |
| M17 | Inventory & Shift Analytics | 2.0 Days (16h) | ■ COMPLETED | Inventory screen with live stock, quick stock adjustment, AddProductScreen with multi-category selector, staff AnalyticsScreen with volume cards. |
| M18 | Real Backend Integration & QA | 1.0 Day (8h) | ■ REMAINING (POST-MERGE) | Switch AppConfig useMockApi = false to point to live Node.js server, verify Dio JSON serialization against live API, test error dialogs (ERROR_CONTRACTS.json). |
| M19 | Hardware & Scanner Hardening | 0.5 Day (4h) | ■ REMAINING (POST-MERGE) | Physical Android device camera optimization for low-light conditions, scan vibration feedback, thermal receipt printer readiness. |
| M20 | Android Production QA & Release | 0.5 Day (4h) | ■ REMAINING (POST-MERGE) | Release keystore signing, ProGuard rules, Android APK/AAB build generation, offline network error handling validation. |

**Flutter Mobile Status**: **10.25 Working Days (82 Hours) COMPLETED • 2 Working Days (16 Hours) REMAINING**

---

### 5. Master Parallel Daily Schedule Table

| Timeline | Developer 2 (Backend Track) | Developer 1 (Web & Flutter Track) | Daily Target Output |
| :--- | :--- | :--- | :--- |
| Day 1 | D2-M1 (Foundation), D2-M2 (Prisma DB), D2-M3 (Auth) | Flutter Camera QR Scanner Optimization on Android | *Backend running with DB connection & Auth; Flutter camera scanner tested.* |
| Day 2 | D2-M4 (RBAC), D2-M5 (Orgs), D2-M6 (Plans & Overrides) | Flutter Shift Sales Analytics UI Polish & SnackBar Refinements | *Admin, Plans & Orgs ready on Backend; Flutter UI hardened.* |
| Day 3 | D2-M7 (Staff), D2-M8 (Cards), D2-M9 (Card Sessions) | Flutter Offline Test Suite Execution & Token Hardening | *Cards & Sessions live on Backend; Flutter mock suite 100% verified.* |
| Day 4 | D2-M10 (Products), D2-M11 (POS Engine), D2-M12 (Recharge) | Automated Integration Test Suite Preparation for Web & Mobile | *Core Financial & POS engines complete on Backend.* |
| Day 5 | D2-M13 (Refunds), D2-M14 (CSV Import), D2-M15 (Analytics & PDF) | Standby for Backend Financial Endpoints Verification | *CSV Import, Analytics & PDF Reports functional on Backend.* |
| Day 6 | D2-M16 (Reports), D2-M17 (Portal), D2-M18 (Audit Logging) | Web Frontend & Flutter Live API Configuration Scripts Ready | *Public Portal & Reports live on Backend; all 65 routes implemented.* |
| Day 7 | D2-M19 (Parity), D2-M20 (Postman 65 Requests QA) | Pre-merge verification of Web (M1–M11) and Flutter (M13–M17) | *■ BACKEND 100% DELIVERED FOR MERGING!* |
| Day 8 | Joint Backend Support & CORS / Query Logs Verification | Web M12: Real API Integration & 65-Route Contract QA | *Web Frontend 100% Integrated with live backend!* |
| Day 9 | Joint Backend Support & Live PostgreSQL Transaction Monitoring | Flutter M18: Live Integration & Hardware QR Scanner QA | *Flutter Mobile 100% Integrated with live backend!* |
| Day 10 | Final Backend Support, Multi-Tenant Boundary & Concurrency Tests | Flutter M19 & M20: Production Build & Final Release Sign-Off | *■ FINAL SIGN-OFF: Web, Mobile, and Backend 100% Integrated!* |

### ■ Final Summary:
- **Total Project Calendar Duration (Parallel)**: **10 Working Days (2 Calendar Weeks)**
- **Backend Delivery (Dev 2)**: **7 Working Days (at 3 Milestones / Day)**
- **Post-Merge Integration & Testing (Dev 1 + Dev 2)**: **3 Working Days (Days 8, 9, 10)**