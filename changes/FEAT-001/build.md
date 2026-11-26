# FEAT-001: Build

## Changes
- `app/src/invoice.mjs`: `VAT_RATE`; VAT computed once on the subtotal; `total = subtotal + vat`; `currency: 'AED'`.
- `app/public/index.html`: "VAT 5%" row in totals.
- `app/test/invoice.test.mjs`: two VAT tests.

## Tests added
- "BL-INV-004: VAT is 5% of the subtotal (FEAT-001)" → AC-1
- "BL-INV-004: VAT is computed once on the subtotal, not per line (FEAT-001)" → AC-2
- AC-3 is covered by the existing "POST /api/quote rejects invalid input with 400"

## Failing before
```
✖ BL-INV-004: VAT is 5% of the subtotal (FEAT-001)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  undefined !== 45
✖ BL-INV-004: VAT is computed once on the subtotal, not per line (FEAT-001)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  undefined !== 0.05
# pass 4
# fail 2
```

## Passing after
```
✔ BL-INV-004: VAT is 5% of the subtotal (FEAT-001)
✔ BL-INV-004: VAT is computed once on the subtotal, not per line (FEAT-001)
✔ BL-INV-001: an invoice needs at least one line
✔ BL-INV-002/003: line validation
✔ POST /api/quote returns totals
✔ POST /api/quote rejects invalid input with 400
# pass 6
# fail 0
```

## Sign-off
- Agent: developer
- Date: 2026-11-20
