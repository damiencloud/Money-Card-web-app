# SonarQube Post-Remediation Analysis Report — Money Card System
**Generated**: 2026-09-03 10:21:43
**Project Key**: Money-card-system

---

## 1. Summary Metrics
- **Total Lines of Code (NCLOC)**: 46579
- **Vulnerabilities**: 0 (Remediated: 11 fixed)
- **Bugs**: 0 (Remediated: 18 fixed)
- **Security Hotspots**: 0
- **Code Smells**: 654 (Reduced from 665)
- **New Code Issues**: 0

---

## 2. Remediated Vulnerabilities (11 Fixed)
- products.controller.ts:24 — Replaced Math.random() with 
ode:crypto andomUUID().
- CameraQrScanner.tsx:19 — Replaced Math.random() with cryptographic generateSecureToken().
- CardsPage.tsx:517, 533, 553 — Replaced Math.random() with generateSecureToken().
- AdminPlansSubscriptionsView.tsx:242 — Replaced Math.random() with generateSecureNumericCode().
- cards.ts:121, 162, 375 — Replaced Math.random() with generateSecureToken().
- inventory.ts:354 — Replaced Math.random() with generateSecureToken().
- store.ts:86 — Replaced Math.random() in generateId with generateSecureToken().

---

## 3. Remediated Bugs (18 Fixed)
- ProductsPage.tsx:188-191, 551 — Removed dead constant truthiness and redundant fallbacks.
- SessionsPage.tsx:189 — Removed unreachable 'Main Cafeteria' fallback.
- StaffPage.tsx:1271 — Replaced redundant ternary {canManage ? 'Close' : 'Close'} with 'Close'.
- userPortal.ts:57 — Removed redundant || 'UNASSIGNED' fallback.
- Accessibility & Click Handlers:
  - CardsPage.tsx:1408 — Converted dropzone <div> to native <button type="button">.
  - PortalTransactionsPage.tsx:131 — Converted transaction expander <div> to native <button type="button">.
  - Removed unnecessary click stopPropagation wrappers on action layouts across ProductsPage.tsx, AdminPlansSubscriptionsView.tsx, AdminPlansView.tsx, BranchesPage.tsx, ReportsPage.tsx, and StaffPage.tsx.

---

## 4. Test Verification
- **Backend Vitest**: 93 / 93 passed (100%)
- **Frontend Vitest**: 57 / 57 passed (100%)
- **TypeScript Builds**: 0 compilation errors
