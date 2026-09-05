# SonarQube Post-Analysis Report — Money Card System
**Generated**: 2026-09-04 16:52:00
**Project Key**: Money-card-system
**SonarQube Host**: http://localhost:9000

---

## 1. Summary Quality Metrics
- **Total Lines of Code (NCLOC)**: 48,358
- **Vulnerabilities**: 0 (Rating: **A** / 1.0)
- **Bugs**: 0 (Rating: **A** / 1.0)
- **Security Hotspots**: 0 (Security Review Rating: **A** / 1.0)
- **Maintainability (SQALE Rating)**: **A** / 1.0
- **Duplicated Lines Density**: 4.3%
- **Code Smells**: 686 (mostly cognitive complexity rules on complex business controllers)

---

## 2. Issues Remediation (Current Run)
- **Frontend Accessibility Bug Fixed**:
  - `PermissionMatrix.tsx:190` — Added `role="button"`, `tabIndex={0}`, and keyboard accessibility listener (`onKeyDown` for `Enter`/`Space`) to category accordion header, clearing `typescript:S1082`.
- **Card Deletion & M0 Lifecycle**:
  - Validated type safety, database transactions, foreign key disassociation (`ON DELETE SET NULL`), and audit event creation.

---

## 3. Test & Build Verification
- **Backend Vitest**: 93 / 93 passed (100%)
- **Card Deletion Unit Test**: Passed (100%)
- **Backend TypeScript Build**: 0 errors (`npx tsc --noEmit`)
- **Frontend TypeScript Build**: 0 errors (`npx tsc --noEmit`)
- **Flutter Mobile Analysis**: 0 fatal warnings (`flutter analyze`)

---

## 4. Dashboard Access
- **SonarQube Local Dashboard**: [http://localhost:9000/dashboard?id=Money-card-system](http://localhost:9000/dashboard?id=Money-card-system)
