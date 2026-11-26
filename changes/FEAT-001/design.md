# FEAT-001: Design

## Approach
Add `VAT_RATE = 0.05` to `app/src/invoice.mjs`. In `quoteInvoice`, compute `vat = round2(subtotal × VAT_RATE)` once, after the subtotal, and `total = round2(subtotal + vat)`. Return `vat` and `currency: 'AED'`. The page already renders the `vat` field; add the "VAT 5%" label.

## Impact
- `app/src/invoice.mjs`: the return shape gains `vat` and `currency` (additive, backwards compatible).
- `POST /api/quote`: the response gains the same fields.
- `app/public/index.html`: VAT row.

## Risks
- **Per-line vs total rounding** gives different results. Mitigation: AC-2 pins calculation on the subtotal.
- **Float precision in rounding.** Mitigation: all amounts go through one helper, `round2`. Its half-up correctness at x.xx5 boundaries is not in this change's scope; flagged for a follow-up review of `money.mjs`.

## Test strategy
| AC | Test |
|---|---|
| AC-1 | `invoice.test.mjs`: "BL-INV-004: VAT is 5% of the subtotal" |
| AC-2 | `invoice.test.mjs`: "BL-INV-004: VAT is computed once on the subtotal, not per line" |
| AC-3 | `server.test.mjs`: "POST /api/quote rejects invalid input with 400" |
| AC-4 | Verified in the browser by the verifier (UI) |

Regression: the existing validation tests (BL-INV-001/002/003).

## Sign-off
- Agent: solution-architect
- Date: 2026-11-20

## Approval
- Approved-by: olga.manuilova
- Date: 2026-11-20
