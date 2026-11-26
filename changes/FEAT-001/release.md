# FEAT-001: Release readiness

## Evidence pack
- G1 requirements: 4 ACs, all mapped to rules
- G2 design: approved by olga.manuilova on 2026-11-20
- G3 build: 2 new tests failing before, 6/6 passing after
- G4 review: APPROVE; one non-blocking finding raised as BUG-001
- G5 verification: 4/4 ACs PASS, with API and UI evidence
- Files changed: `app/src/invoice.mjs`, `app/public/index.html`, `app/test/invoice.test.mjs`

## Risk
Low. The change is additive (new fields), with no data migration. One known defect (BUG-001: rounding at x.xx5 boundaries) affects some amounts by one fil. It is accepted for this release because VAT was previously absent altogether, and it is scheduled next.

## Rollback
Revert the FEAT-001 commit. No data or configuration to restore.

**Decision:** GO

## Sign-off
- Agent: release-manager
- Date: 2026-11-21

## Approval
- Approved-by: olga.manuilova
- Date: 2026-11-21
