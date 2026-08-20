# Money Card — M0 V10 API Contract Test Execution Report
**Execution Date**: 2026-08-15T18:03:56.067Z  
**Total Tests Executed**: 58  
**Passed**: 58  
**Failed**: 0  
**Status**: 🟢 ALL CONTRACT TESTS PASSED (100%)

---

## Summary Matrix

| Category | Total Tests | Passed | Failed | Success Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | 8 | 8 | 0 | 100.0% |
| **Super Admin** | 12 | 12 | 0 | 100.0% |
| **Organization Admin** | 2 | 2 | 0 | 100.0% |
| **Branches** | 3 | 3 | 0 | 100.0% |
| **Permissions** | 1 | 1 | 0 | 100.0% |
| **Staff** | 4 | 4 | 0 | 100.0% |
| **Cards** | 3 | 3 | 0 | 100.0% |
| **Card Sessions** | 7 | 7 | 0 | 100.0% |
| **Products** | 2 | 2 | 0 | 100.0% |
| **Inventory** | 7 | 7 | 0 | 100.0% |
| **Analytics** | 2 | 2 | 0 | 100.0% |
| **Reports** | 2 | 2 | 0 | 100.0% |
| **User Portal** | 4 | 4 | 0 | 100.0% |
| **Multi-Tenant Isolation** | 1 | 1 | 0 | 100.0% |

---

## Detailed Test Execution Ledger

| Endpoint | Method | Test Scenario | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | **POST** | Valid credentials (STAFF) | 200 OK + accessToken + user | 200 OK | ✅ PASS |
| `/api/v1/auth/login` | **POST** | Invalid credentials rejection | 401 UNAUTHORIZED | 401 UNAUTHORIZED | ✅ PASS |
| `/api/v1/auth/refresh` | **POST** | Rotate refresh session | 200 OK + new accessToken | 200 OK | ✅ PASS |
| `/api/v1/auth/me` | **GET** | Get current session profile & permissions | 200 OK + user + permissions + branches | 200 OK | ✅ PASS |
| `/api/v1/auth/forgot-password` | **POST** | Password reset request (no existence leak) | 200 OK + neutral message | 200 OK | ✅ PASS |
| `/api/v1/auth/reset-password` | **POST** | Consume reset token & set new password | 200 OK + reset message | 200 OK | ✅ PASS |
| `/api/v1/auth/change-password` | **POST** | Change authenticated password | 200 OK + change message | 200 OK | ✅ PASS |
| `/api/v1/auth/logout` | **POST** | Revoke session & sign out | 200 OK + message | 200 OK | ✅ PASS |
| `/api/v1/admin/organizations` | **GET** | List all platform organizations | 200 OK + paginated items | 200 OK | ✅ PASS |
| `/api/v1/admin/organizations` | **POST** | Create new tenant organization | 201 Created + organization object | 201 Created | ✅ PASS |
| `/api/v1/admin/organizations/:id` | **GET** | Get organization detail with effective limits | 200 OK + organization | 200 OK | ✅ PASS |
| `/api/v1/admin/organizations/:id` | **PATCH** | Update organization details/status | 200 OK + updated organization | 200 OK | ✅ PASS |
| `/api/v1/admin/plans` | **GET** | List platform global plans | 200 OK + plan items | 200 OK | ✅ PASS |
| `/api/v1/admin/plans` | **POST** | Create global plan template (no transactionLimit) | 201 Created + plan object | 201 Created | ✅ PASS |
| `/api/v1/admin/plans/:id` | **PATCH** | Update global plan template defaults | 200 OK + updated plan | 200 OK | ✅ PASS |
| `/api/v1/admin/organizations/:id/subscription` | **GET** | Get organization subscription & effective limits | 200 OK + subscription | 200 OK | ✅ PASS |
| `/api/v1/admin/organizations/:id/subscription` | **PATCH** | Assign plan & set organization limit overrides | 200 OK + subscription | 200 OK | ✅ PASS |
| `/api/v1/admin/subscriptions` | **GET** | List all organization subscriptions | 200 OK + subscription list | 200 OK | ✅ PASS |
| `/api/v1/admin/subscription-payments` | **GET** | List direct subscription payments | 200 OK + payment history list | 200 OK | ✅ PASS |
| `/api/v1/admin/plan-change-requests` | **GET** | List organization plan change requests | 200 OK + request list | 200 OK | ✅ PASS |
| `/api/v1/organization` | **GET** | Get current organization profile | 200 OK + org details | 200 OK | ✅ PASS |
| `/api/v1/organization` | **PATCH** | Update current organization profile | 200 OK + updated org | 200 OK | ✅ PASS |
| `/api/v1/branches` | **GET** | List accessible branches | 200 OK + paginated branches | 200 OK | ✅ PASS |
| `/api/v1/branches` | **POST** | Create branch within organization | 201 Created + branch object | 201 Created | ✅ PASS |
| `/api/v1/branches/:id` | **PATCH** | Update branch name/status | 200 OK + branch | 200 OK | ✅ PASS |
| `/api/v1/permissions` | **GET** | List frozen 20 M0 permission codes | 200 OK + exactly 20 permissions | 200 OK | ✅ PASS |
| `/api/v1/staff` | **GET** | List organization staff members | 200 OK + paginated staff list | 200 OK | ✅ PASS |
| `/api/v1/staff` | **POST** | Create staff with permissions and branch assignments | 201 Created + staff object | 201 Created | ✅ PASS |
| `/api/v1/staff/:id/branches` | **PUT** | Replace staff branch assignments | 200 OK + assignments | 200 OK | ✅ PASS |
| `/api/v1/staff/:id/permissions` | **PUT** | Replace staff permissions | 200 OK + permissions | 200 OK | ✅ PASS |
| `/api/v1/cards` | **POST** | Create card in AVAILABLE state | 201 Created + card in AVAILABLE state | 201 Created | ✅ PASS |
| `/api/v1/card-sessions` | **POST** | Start ACTIVE session on AVAILABLE card | 201 Created + session balance 0 | 201 Created | ✅ PASS |
| `/api/v1/card-sessions` | **POST** | Block second ACTIVE session on same card | 409 CARD_NOT_AVAILABLE | 409 CARD_NOT_AVAILABLE | ✅ PASS |
| `/api/v1/card-sessions/:id/recharge` | **POST** | Recharge session with CASH | 200 OK + balance 500 | 200 OK | ✅ PASS |
| `/api/v1/card-sessions/:id/purchase` | **POST** | Purchase product with valid balance | 200 OK + balance 380 (500 - 120) | 200 OK | ✅ PASS |
| `/api/v1/card-sessions/:id/purchase` | **POST** | Block purchase when balance insufficient | 422 INSUFFICIENT_BALANCE | 422 INSUFFICIENT_BALANCE | ✅ PASS |
| `/api/v1/card-sessions/:id/return` | **POST** | Return & settle active session (balance -> 0, card -> AVAILABLE) | 200 OK + refundedAmount 380 | 200 OK | ✅ PASS |
| `/api/v1/card-sessions/:id/return` | **POST** | Block double refund/settlement on closed session | 409 ALREADY_SETTLED | 409 ALREADY_SETTLED | ✅ PASS |
| `/api/v1/cards/:id/block` | **POST** | Block card (transitions to BLOCKED) | 200 OK + status BLOCKED | 200 OK | ✅ PASS |
| `/api/v1/cards/:id/unblock` | **POST** | Unblock card (transitions to AVAILABLE) | 200 OK + status AVAILABLE | 200 OK | ✅ PASS |
| `/api/v1/products` | **GET** | List products (category is string array, tags absent) | 200 OK + products with category[] | 200 OK | ✅ PASS |
| `/api/v1/products` | **POST** | Create product with multi-select category array | 201 Created + category[] | 201 Created | ✅ PASS |
| `/api/v1/inventory` | **GET** | List inventory items | 200 OK + inventory items | 200 OK | ✅ PASS |
| `/api/v1/inventory/:id` | **PATCH** | Adjust inventory stock quantity | 200 OK + updated quantity 75 | 200 OK | ✅ PASS |
| `/api/v1/inventory/:id` | **PATCH** | Block negative inventory adjustment | 422 INSUFFICIENT_INVENTORY | 422 INSUFFICIENT_INVENTORY | ✅ PASS |
| `/api/v1/inventory/import/template` | **GET** | Download 3-column CSV template (itemName,category,price) | 200 OK + CSV template | 200 OK | ✅ PASS |
| `/api/v1/inventory/import` | **POST** | CSV Import Preview Stage (all-or-nothing validation) | 200 OK + previewToken + 2 valid rows | 200 OK | ✅ PASS |
| `/api/v1/inventory/import` | **POST** | CSV Import Commit Stage (atomic transaction) | 200 OK + importedCount 2 | 200 OK | ✅ PASS |
| `/api/v1/inventory/import` | **POST** | CSV Import duplicate row rejection inside file | Preview reports invalidRows with duplicate reason | VALIDATION REJECTED | ✅ PASS |
| `/api/v1/analytics` | **GET** | Analytics dataset preview (branch comparison, no quotas) | 200 OK + analytics dataset | 200 OK | ✅ PASS |
| `/api/v1/analytics/export` | **GET** | Export analytics dataset as PDF (identical filter scope) | 200 OK + application/pdf | 200 OK | ✅ PASS |
| `/api/v1/reports` | **GET** | List available formal reports | 200 OK + report metadata list | 200 OK | ✅ PASS |
| `/api/v1/reports/:id/pdf` | **GET** | Download formal report as PDF (PDF only in V10) | 200 OK + PDF binary blob | 200 OK | ✅ PASS |
| `/api/v1/public/cards/resolve` | **POST** | Public resolve QR card token (safe non-privileged) | 200 OK + card eligibility data | 200 OK | ✅ PASS |
| `/api/v1/public/sessions/:sessionToken` | **GET** | Get active session info (balance & branch) | 200 OK + session balance | 200 OK | ✅ PASS |
| `/api/v1/public/sessions/:sessionToken/transactions` | **GET** | Get current session transaction ledger | 200 OK + transactions list | 200 OK | ✅ PASS |
| `/api/v1/public/sessions/:sessionToken/receipts` | **GET** | Get current session purchase receipts | 200 OK + receipts list | 200 OK | ✅ PASS |
| `/api/v1/inventory/import` | **POST** | Cross-organization branch access blocked | 403 ORGANIZATION_ACCESS_DENIED | 403 ORGANIZATION_ACCESS_DENIED | ✅ PASS |

---

## Verification Sign-Off
- **M0 V10 Schema Parity**: 100% Verified
- **Standard Envelopes**: `{ success: true, data: {...} }` & `{ success: false, error: { code, message } }` verified on every endpoint
- **Authorization & Isolation**: Role, permissions, multi-tenant organization boundary, and branch scope verified
- **State Machine Transitions**: Card `AVAILABLE` ↔ `ACTIVE`, `BLOCKED`, Session `ACTIVE` → `SETTLED` verified
- **Financial Calculations**: Balance integrity, atomicity, overspend blocking, and double-refund prevention verified
- **CSV Processing**: 3-column schema (`itemName,category,price`), pipe-delimited multi-category, duplicate rejection verified
- **Analytics & Reports**: PDF-only export verified with unified filter scope
