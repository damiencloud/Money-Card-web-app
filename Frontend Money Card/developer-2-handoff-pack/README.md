# Money Card — Developer 2 Backend Handover Pack (M0 V10 Frozen)

Welcome! This folder contains the **complete, implementation-ready API specifications, JSON contracts, database models, Postman test collection, seed data, and official M0 V10 specification PDF** for building the Money Card backend.

---

## 📁 Package Contents

```
developer-2-handoff-pack/
│
├── M0_Updated_V10_Developer2_Complete_API_Contract.pdf  <-- 📄 Official M0 V10 PDF (Single Source of Truth)
├── README.md                                           <-- 📖 This Guide
├── DEVELOPER_2_HANDOFF.md                              <-- 🏗️ Architecture, Prisma Schema & Implementation Steps
├── API_CONTRACT_TEST_REPORT.md                         <-- 📋 Master Endpoint Blueprint (Request/Response JSONs)
├── COMPLETE_ENDPOINT_INVENTORY.md                      <-- 🗺️ Quick Route & Permission Matrix (52 Endpoints)
├── API_CONTRACT_GAPS.md                                <-- 🛡️ Frozen Rules & Removals (No transaction_limit, no tags)
│
├── POSTMAN_COLLECTION.json                             <-- 🧪 Postman v2.1 Test Suite (All 52 Endpoints)
├── ERROR_CONTRACTS.json                                <-- 🚨 21 Standard M0 Error Envelopes & HTTP Codes
├── TEST_DATA.json                                      <-- 💾 Multi-Tenant Seed Fixtures for Postgres DB
│
└── api-contracts/                                      <-- 📦 Individual JSON Contract Files (By Module)
    ├── common/                                         <-- Success, Error & Pagination Envelopes
    ├── auth/                                           <-- Login, Refresh, Logout, Me, Passwords
    ├── admin/                                          <-- Orgs, Plans, Subscriptions, Overrides, Plan Requests
    ├── branches/                                       <-- Branch CRUD
    ├── staff/                                          <-- Staff CRUD, Branch & Permission assignment
    ├── permissions/                                    <-- 20 Frozen Permission Codes
    ├── cards/                                          <-- Card issue, QR resolve, Block/Unblock, CSV template
    ├── card-sessions/                                  <-- Session create, Recharge (CASH/UPI), Purchase, Return
    ├── products/                                       <-- Multi-select categories, pricing (no tags)
    ├── inventory/                                      <-- Adjustments, 3-column CSV template, Preview, Commit
    ├── analytics/                                      <-- Aggregated metrics, PDF export
    ├── reports/                                        <-- Formal PDF report downloads
    ├── subscriptions/                                  <-- Org subscription tiers & payments
    ├── plan-change-requests/                           <-- Upgrade / Downgrade requests
    └── public-user-portal/                             <-- Public QR resolve, short-lived portal JWTs, receipts
```

---

## 🚀 Quickstart Guide for Developer 2

### 1. Review the Core Rules (M0 V10 Invariants)
- **Plans**: No `transaction_limit`. Transactions are unlimited per tier. Monthly transaction counts are for analytics/reporting only.
- **Products**: No `tags`. Categories are multi-select `string[]` (pipe-delimited `Veg|Fast Food` in CSV).
- **CSV Import**: Exactly 3 columns: `itemName,category,price`. Branch ID is sent in the request context.
- **Reports & Analytics**: Exports are **PDF download only** (`application/pdf`).
- **Cards**: Initial state is `AVAILABLE`. Issue transitions to `ACTIVE`. Settle refunds remaining balance and returns card to `AVAILABLE`.

### 2. Set Up Database with Prisma
Open **`DEVELOPER_2_HANDOFF.md`** to review the recommended Prisma schema and PostgreSQL models.

### 3. Seed Local Database
Use the multi-tenant fixtures in **`TEST_DATA.json`** to populate your local database.

### 4. Build Endpoints Matching JSON Contracts
- Match request bodies and response envelopes with files in **`api-contracts/`** or **`API_CONTRACT_TEST_REPORT.md`**.
- Return standard errors matching **`ERROR_CONTRACTS.json`**.

### 5. Validate with Postman
Import **`POSTMAN_COLLECTION.json`** into Postman and run against `http://localhost:4000/api/v1`.

### 6. Connect with the Frontend
In the frontend repository, set:
```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:4000/api/v1
```
The frontend is 100% synchronized and will immediately connect to your live backend!
