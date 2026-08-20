# Money Card — M0 V10 API Contract Gaps & Frozen Specifications Report

**Document Status**: Handover Ready & Frozen V1  
**Source of Truth**: \`M0_Updated_V10_Developer2_Complete_API_Contract.pdf\`  
**Scope**: Strict Contract Boundaries, Removals, and Clarifications for Developer 2

---

## 1. Executive Summary

This document certifies that the **M0 V10 API Contract Pack** contains **zero undefined endpoints** and full end-to-end schema integrity. All fields adhere strictly to M0 V10 rules. Any legacy or deprecated constructs from older M0 versions (V1–V9) have been permanently frozen and removed.

---

## 2. Explicit M0 V10 Removals & Clarifications (Strict Rules)

| Item / Feature | Status in V10 | Developer 2 Backend Implementation Directive |
| :--- | :--- | :--- |
| **`Plan.transaction_limit`** | ❌ **REMOVED** | Plans do NOT contain transaction quota or limit fields. Transactions are unlimited per subscription tier. Do not define `transaction_limit` in Prisma/PostgreSQL or APIs. |
| **Monthly Transaction Count** | 📊 **ANALYTICS ONLY** | Transaction count is aggregated on-the-fly for reporting and performance charts. It must never block POS, issue, recharge, or purchase transactions. |
| **`Product.tags`** | ❌ **REMOVED** | The `tags` field is completely removed from the database schema, CSV columns, and API request/response payloads. |
| **`Product.category`** | 🏷️ **MULTI-SELECT** | `category` is a `string[]` (array of strings) in the API and JSON column / relation in Postgres. In CSV import, categories are pipe-delimited (e.g. `Veg\|Fast Food`). |
| **Product CSV Headers** | 📋 **3 COLUMNS ONLY** | Exactly `itemName,category,price`. No `tags`, `quantity`, or `branchId` columns. Selected branch context is sent via API query/body/path. |
| **Subscription Payment Gateways** | ❌ **REMOVED** | No Razorpay/Stripe checkout or webhook endpoints for subscriptions. Org Admin submits `PlanChangeRequest`, Super Admin reviews/assigns plans and direct bank transfer records. |
| **Analytics Export Formats** | 📄 **PDF ONLY** | `GET /api/v1/analytics/export?format=pdf` returns PDF only. Unified filter scope identical to the preview endpoint. No CSV/Excel exports for analytics. |
| **Formal Reports** | 📄 **PDF ONLY** | `GET /api/v1/reports/:id/pdf` returns PDF only. No CSV/Excel/JSON downloads. |
| **View Analytics Button** | ❌ **REMOVED** | Navigation to the `/analytics` page itself serves as the analytics view. |
| **Standalone `(1 available)` Badge** | ❌ **REMOVED** | Available count is integrated directly into the Cards status filter buttons `[ Available (X) ]`. |

---

## 3. Undefined Fields in M0 (Reported & Resolved)

Per M0 V10 contract directives, if any field was not specified in M0 V10, it is marked here:

1. **Card Physical Barcode vs QR Token**:
   - *Status*: `M0 Specified`.
   - *Resolution*: Cards have both `physicalCardNumber` (e.g. `MC-001`) and `qrToken` (opaque cryptographic hash). Both resolve deterministically to the Card entity.

2. **User Portal Authentication**:
   - *Status*: `M0 Specified`.
   - *Resolution*: Public portal uses short-lived `sessionToken` returned by `POST /api/v1/public/sessions/access` or `POST /api/v1/public/cards/resolve`. Portal tokens cannot perform administrative or POS operations.

3. **Tax & Discount Calculations**:
   - *Status*: `UNDEFINED_IN_M0 (Omitted by Design in V1)`.
   - *Resolution*: Item price is the final gross price inclusive of any cafeteria taxes. No separate discount engine or tax line-item is required for V1 handover.

---

## 4. Permission Model Invariant (20 Frozen Codes)

Developer 2 must implement authorization checks using strictly the **20 frozen M0 permission codes**:
1. `CARD_VIEW`
2. `CARD_ISSUE`
3. `CARD_RETURN`
4. `CARD_BLOCK`
5. `CARD_UNBLOCK`
6. `RECHARGE`
7. `PURCHASE`
8. `REFUND`
9. `SESSION_VIEW`
10. `PRODUCT_VIEW`
11. `PRODUCT_MANAGE`
12. `INVENTORY_VIEW`
13. `INVENTORY_MANAGE`
14. `INVENTORY_IMPORT`
15. `VIEW_ANALYTICS`
16. `VIEW_REPORTS`
17. `STAFF_VIEW`
18. `STAFF_MANAGE`
19. `BRANCH_VIEW`
20. `BRANCH_MANAGE`

*Roles*:
- `SUPER_ADMIN`: Bypass all permission checks; access platform-wide admin endpoints.
- `ORG_ADMIN`: Organization owner; manages branches, staff, subscriptions, limit overrides.
- `STAFF`: Scoped by assigned branch IDs and explicit permission bitmask/array.
