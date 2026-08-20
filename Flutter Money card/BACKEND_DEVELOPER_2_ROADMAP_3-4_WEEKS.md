# 💳 Money Card Platform — Complete Development Roadmap (3–4 Weeks Horizon)

**Document Version**: 5.0.0 (Expanded 3–4 Weeks Engineering Plan)  
**Source of Truth**: M0 V10 Frozen Contract • `MONEY_CARD_COMPLETE_API_CONTRACT_V10.pdf`  
**Working Standard**: 8 Productive Engineering Hours = 1 Working Day • 5 Days / Week  
**Backend Execution Pace**: 1.25 to 1.5 Milestones per Day for Developer 2 (15 Working Days)  
**Dedicated Joint E2E Integration Window**: 5 Working Days (Week 4)  
**Total Project Calendar Timeline**: **20 Working Days (4 Calendar Weeks)**  
**Excel Spreadsheet File**: [`MONEY_CARD_DEVELOPMENT_ROADMAP_3-4_WEEKS.xlsx`](file:///d:/Flutter%20Money%20card/MONEY_CARD_DEVELOPMENT_ROADMAP_3-4_WEEKS.xlsx)

---

## 1. 📊 Project Summary & Time Required

| Platform / Track | Lead Developer | Architecture Status | Completed Work | Remaining Work | Total Allocated Time | Progress (%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend API (Node.js / Prisma / PostgreSQL)** | Developer 2 | **Starting from Scratch** | 0 Days (0h) | **15 Working Days (120h)** | **15 Working Days (120h)** | `0.0%` |
| **Web Frontend (React / TS / Vite)** | Developer 1 | **91.3% Complete** (M1–M11 Verified) | 21 Working Days (168h) | **1 Working Day (8h)** | **22 Working Days (176h)** | `95.5%` |
| **Staff Mobile App (Flutter Native)** | Developer 1 | **100% Client Ready** (M13–M17, M19 Done) | 11 Working Days (88h) | **1.5 Working Days (12h)** | **12.5 Working Days (100h)** | `88.0%` |
| **Joint Post-Merge Integration & Release QA** | Dev 1 + Dev 2 | **Scheduled for Week 4** | 0 Days (0h) | **5 Working Days (40h)** | **5 Working Days (40h)** | `0.0%` |
| **TOTAL PARALLEL LAUNCH** | **Dev 1 + Dev 2** | **Full System Delivery** | **32 Working Days (256h)** | **20 Working Days (160h)** | **20 Working Days (4 Weeks)** | `61.5%` |

---

## 2. 🛠️ Developer 2 (Backend) Complete 20-Milestone Roadmap Table

Paced realistically across **Weeks 1 to 3 (15 Working Days / 120 Hours)**:

| Milestone | Task & Module Name | Scheduled Timeline | Time (Days) | Time (Hours) | Dependencies | Endpoint Scope | Key Deliverables & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **D2-M1** | **Backend Foundation & Error Architecture** | Week 1 • Day 1 | 0.5 Day | 4.0h | None | Global Router | Express TypeScript setup, `.env`, Winston logger, M0 V10 `{success, data, error}` envelope middleware, CORS. |
| **D2-M2** | **PostgreSQL Schema & Prisma ORM Setup** | Week 1 • Day 1–2 | 0.75 Day | 6.0h | D2-M1 | Migrations & Seeds | 12 Prisma models & relations, migrations runner, seed database from `TEST_DATA.json`. |
| **D2-M3** | **Authentication Module & JWT Lifecycle** | Week 1 • Day 2 | 0.75 Day | 6.0h | D2-M2 | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password` (7 routes) | Argon2/Bcrypt hashing, 15m JWT access tokens, 7d refresh tokens with database revocation, getMe enriched with permissions & branches. |
| **D2-M4** | **Authorization & Multi-Tenant Middleware** | Week 1 • Day 3 | 0.75 Day | 6.0h | D2-M3 | Middleware Layer | Role guards (`SUPER_ADMIN`, `ORG_ADMIN`, `STAFF`), 20 granular permissions evaluator, tenant organization & assigned branch isolation filter. |
| **D2-M5** | **Organizations Management APIs** | Week 1 • Day 4 | 0.75 Day | 6.0h | D2-M4 | `GET/POST /organizations`, `GET/PUT/DELETE /organizations/:id` (5 routes) | Super Admin tenant listing, tenant provisioning with default branch & admin creation, status updates with cascading deactivation. |
| **D2-M6** | **Subscription Plans & Quota Overrides** | Week 1 • Day 5 | 0.75 Day | 6.0h | D2-M5 | `GET/POST /plans`, `PUT /plans/:id`, `GET/POST /plans/requests`, `POST /plans/requests/:id/approve/reject`, `PUT /organizations/:id/limits` (8 routes) | Global pricing plans (NO transaction limits), custom org quota overrides (card/branch limits), plan change approval workflow. |
| **D2-M7** | **Branches & Staff Management APIs** | Week 2 • Day 6 | 0.75 Day | 6.0h | D2-M4 | `GET/POST /branches`, `GET/PUT /branches/:id`, `GET/POST /staff`, `GET/PUT/DELETE /staff/:id` (9 routes) | Branch CRUD with org isolation, Staff CRUD, branch assignments replacement, permission array replacement, branch count limit checks. |
| **D2-M8** | **Card Inventory & Dual QR Resolution** | Week 2 • Day 7 | 0.75 Day | 6.0h | D2-M7 | `GET/POST /cards`, `GET /cards/:id`, `POST /cards/resolve`, `POST /cards/:id/block`, `POST /cards/:id/unblock` (6 routes) | Authoritative card inventory, `AVAILABLE` state on import, opaque `qrToken` mapping, `POST /cards/resolve` with active session enrichment, block/unblock. |
| **D2-M9** | **Card Sessions Lifecycle & Balances** | Week 2 • Day 8 | 0.75 Day | 6.0h | D2-M8 | `GET/POST /card-sessions`, `GET /card-sessions/:id` (3 routes) | Session creation on `AVAILABLE` card (transitions card to `ACTIVE`), active session list filtered by branch, session detail with balance. |
| **D2-M10** | **Product Catalog Management APIs** | Week 2 • Day 9 | 0.75 Day | 6.0h | D2-M7 | `GET/POST /products`, `GET/PUT/DELETE /products/:id` (5 routes) | Branch product catalog, multi-select category array (`List<String>`, NO tags), price validation, auto `InventoryItem` record initialization. |
| **D2-M11** | **POS Checkout & Purchase Financials Engine** | Week 2 • Day 10 | 1.0 Day | 8.0h | D2-M9, D2-M10 | `POST /card-sessions/:id/purchase` (1 route) | Atomic Prisma `$transaction`: server price lookup, balance verification, stock verification, balance deduction, stock decrease, `Transaction` record. |
| **D2-M12** | **Card Recharge & Payment Records** | Week 3 • Day 11 | 0.75 Day | 6.0h | D2-M9 | `POST /card-sessions/:id/recharge` (1 route) | Card session top-up with `CASH` or manual `UPI` verification reference, atomic balance credit, idempotency reference validation, `Transaction` record. |
| **D2-M13** | **Refund & Session Settlement** | Week 3 • Day 11–12 | 0.75 Day | 6.0h | D2-M11, D2-M12 | `POST /card-sessions/:id/return` (1 route) | Session settlement: calculates remaining balance, records `REFUND` transaction, zeroes session balance, marks session `SETTLED`, resets card to `AVAILABLE`. |
| **D2-M14** | **Inventory Control & 3-Column CSV Import** | Week 3 • Day 12–13 | 1.0 Day | 8.0h | D2-M10 | `GET /inventory`, `POST /inventory/:id/adjust`, `GET /inventory/movements`, `POST /inventory/import-csv`, `GET /inventory/csv-template` (5 routes) | Stock level tracking, manual stock adjustments with audit reason (`RESTOCK`/`ADJUSTMENT`), 3-col CSV parser (`itemName,category,price`) with 2-phase preview & commit. |
| **D2-M15** | **Real-Time Branch Analytics & Aggregations** | Week 3 • Day 13 | 0.75 Day | 6.0h | D2-M11, D2-M12 | `GET /analytics`, `GET /analytics/demand` (2 routes) | Aggregated metrics calculation: total revenue, recharge volume, purchase volume, active sessions, peak demand hours, top-selling items. |
| **D2-M16** | **Formal PDF Reports Engine** | Week 3 • Day 14 | 0.75 Day | 6.0h | D2-M15 | `GET /reports`, `POST /reports/generate`, `GET /reports/:id/download` (3 routes) | Formal business reports list, asynchronous report generator using PDFKit, binary streaming PDF download conforming to M0 V10. |
| **D2-M17** | **Public Customer User Portal APIs** | Week 3 • Day 14 | 0.75 Day | 6.0h | D2-M9 | `POST /portal/resolve`, `GET /portal/session`, `GET /portal/transactions` (3 routes) | Public card QR resolution with data masking, temporary portal session token, live card balance lookup, customer transaction receipt history. |
| **D2-M18** | **System Audit Logging & Interceptors** | Week 3 • Day 15 | 0.75 Day | 6.0h | D2-M4 | `GET /audit-logs`, `GET /audit-logs/:id` (2 routes) | Automated Prisma middleware logging all auth events, card state transitions, financial transactions, staff changes, and plan modifications. |
| **D2-M19** | **API Contract Parity Verification** | Week 3 • Day 15 | 0.75 Day | 6.0h | D2-M1 to D2-M18 | Full 65 Routes | Rigorous schema validation verifying every endpoint against `MONEY_CARD_COMPLETE_API_CONTRACT_V10.pdf`: envelopes, status codes, query params. |
| **D2-M20** | **Postman QA Collection Pass & Handover** | Week 3 • Day 15 | 0.75 Day | 6.0h | D2-M19 | Postman Suite (65 Requests) | Automated Postman Collection Runner execution covering all 65 endpoints across Super Admin, Org Admin, and Staff roles (100% pass certification). |

---

## 3. 🗓️ Master Parallel Daily Schedule (4 Weeks / 20 Working Days)

```
========================================================================================
WEEK 1: ARCHITECTURE, DATABASE SCHEMA, MULTI-TENANT AUTH & RBAC (DAYS 1–5)
========================================================================================
Day 1  | Dev 2: D2-M1 (Express TS Setup & Error Envelope)    | Dev 1: Flutter Mock QR & Camera Verification
Day 2  | Dev 2: D2-M2 (Prisma Schema, 12 Models & Seed)     | Dev 1: Web Frontend M1–M6 Contract Audit
Day 3  | Dev 2: D2-M3 (Auth Module: JWT, Refresh, Password)  | Dev 1: Flutter Hardware Haptics & Thermal Testing
Day 4  | Dev 2: D2-M4 (RBAC & Multi-Tenant Middleware)      | Dev 1: Web M7–M10 Tenancy & RBAC Verification
Day 5  | Dev 2: D2-M5 (Organizations) & D2-M6 (Plans/Limits)| Dev 1: Cross-Platform Model Type-Check Review

========================================================================================
WEEK 2: BRANCH & STAFF CRUD, CARDS INVENTORY, SESSIONS & POS ENGINE (DAYS 6–10)
========================================================================================
Day 6  | Dev 2: D2-M7 (Branches & Staff Management APIs)     | Dev 1: Flutter Active Sessions Dynamic Count QA
Day 7  | Dev 2: D2-M8 (Cards Inventory & QR Resolver API)   | Dev 1: Flutter Card Resolver Debouncing QA
Day 8  | Dev 2: D2-M9 (Card Sessions Lifecycle & Balances)   | Dev 1: Flutter Issue Card Session Creation Flow
Day 9  | Dev 2: D2-M10 (Product Catalog Multi-Category API)  | Dev 1: Web POS Catalog Multi-Category QA
Day 10 | Dev 2: D2-M11 (POS Purchase Engine $transactions)   | Dev 1: Flutter POS Checkout Cart & Pricing QA

========================================================================================
WEEK 3: PAYMENTS, INVENTORY, ANALYTICS, REPORTS, PORTAL & POSTMAN QA (DAYS 11–15)
========================================================================================
Day 11 | Dev 2: D2-M12 (Recharge) & D2-M13 (Refunds/Return)  | Dev 1: Flutter Recharge & Settlement Dialogs QA
Day 12 | Dev 2: D2-M14 (Inventory Adjustments & 3-Col CSV)  | Dev 1: Web 3-Column CSV Import Engine Testing
Day 13 | Dev 2: D2-M15 (Real-Time Analytics & Aggregations)  | Dev 1: Web & Mobile Analytics Volume Cards QA
Day 14 | Dev 2: D2-M16 (PDF Reports) & D2-M17 (User Portal) | Dev 1: Flutter Digital PDF Receipt & System Share QA
Day 15 | Dev 2: D2-M18 (Audit) & D2-M19/M20 (Postman QA)    | Dev 1: Pre-Merge Verification (100% Postman Pass!)

========================================================================================
WEEK 4: JOINT INTEGRATION, CONCURRENCY STRESS, HARDWARE & PRODUCTION RELEASE (DAYS 16–20)
========================================================================================
Day 16 | Dev 2: Joint Backend Support (CORS, Queries, DB)    | Dev 1: Web M12 Real API Integration (65 Routes)
Day 17 | Dev 2: Joint Backend Support (JWT Sessions & POS)  | Dev 1: Flutter M18 Real API Integration & Live QA
Day 18 | Dev 2: Concurrency Stress & Balance Race Conditions | Dev 1: Multi-Branch Simultaneous Purchases QA
Day 19 | Dev 2: Final Security Audit & SQL Injection Guard   | Dev 1: M19 Digital PDF Receipt & QR Camera Live QA
Day 20 | Dev 2: Production DB Migration & Server Deployment | Dev 1: M20 Release Keystore & Google Play AAB
========================================================================================
🏁 FINAL MILESTONE GATE (DAY 20): ALL 3 PLATFORMS 100% INTEGRATED & CERTIFIED LIVE!
========================================================================================
```

---

## 4. 📁 Excel Workbook Structure Overview

The generated file [`MONEY_CARD_DEVELOPMENT_ROADMAP_3-4_WEEKS.xlsx`](file:///d:/Flutter%20Money%20card/MONEY_CARD_DEVELOPMENT_ROADMAP_3-4_WEEKS.xlsx) contains **6 dedicated sheets**:

1. **`1. Executive Summary`**: High-level platform summaries, progress tracking, time allocations, and fast-track vs. 3–4 weeks comparative analysis.
2. **`2. Dev 2 (Backend Roadmap)`**: Detailed breakdown of milestones `D2-M1` through `D2-M20` with dependencies, deliverables, hour budgets, and acceptance criteria.
3. **`3. Dev 1 (Web Frontend)`**: `M1` through `M12` tracking table (95.5% complete).
4. **`4. Dev 1 (Flutter Staff App)`**: `M13` through `M20` tracking table (88.0% complete, 118 automated tests passing).
5. **`5. Master Daily Schedule (3-4W)`**: Coordinated Day 1 to Day 20 daily task table with sign-off milestones.
6. **`6. 65-Route API Matrix`**: Comprehensive reference matrix of all 65 M0 V10 routes categorized by domain with HTTP methods, roles, payloads, and expected response structures.
