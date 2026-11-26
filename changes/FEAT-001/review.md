# FEAT-001: Independent review

<!-- Reviewed in a fresh context with: requirements.md, design.md, build.md, git diff app/, test output. -->

**Verdict:** APPROVE

## Blocking
None

## Non-blocking
- `round2` uses `Math.round(value * 100) / 100`. Binary floating point makes some x.xx5 products land just below the half (for example 20.70 × 0.05 = 1.0349999…), so they round down. That would violate BL-INV-005. It does not affect this change's ACs, but it should be tracked as a defect. Raised as **BUG-001**.

## Rule check
- BL-INV-004: VAT is computed once on the subtotal ✓
- BL-INV-006: total = subtotal + VAT, AED ✓
- BL-INV-005: depends on `round2`; see the non-blocking note above
- BL-API-001: invalid input returns 400 ✓

## Sign-off
- Agent: independent-reviewer
- Date: 2026-11-20
