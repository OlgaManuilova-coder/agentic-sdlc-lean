# FEAT-001: Verification

## Evidence
| AC | How verified | Evidence | Result |
|---|---|---|---|
| AC-1 | API `POST /api/quote` with `[{description:"Consulting hour",quantity:2,unitPrice:450}]` | `{"subtotal":900,"vat":45,"total":945,"currency":"AED"}` | PASS |
| AC-2 | API, three lines of 1 × 0.30 | `{"subtotal":0.9,"vat":0.05,"total":0.95}` | PASS |
| AC-3 | API with `{"lines":[]}` | HTTP 400 `{"error":"an invoice needs at least one line"}` | PASS |
| AC-4 | UI via Playwright MCP: page loaded with the default line 2 × 450, clicked Calculate | Subtotal 900.00, VAT 5% 45.00, Total 945.00; screenshot `results/FEAT-001/ac4-quote.png` | PASS |

## Rule check
No violations observed for the ACs. An exploratory boundary check at 20.70 reproduced the rounding issue the reviewer raised (VAT 1.03, expected 1.04). It is tracked as BUG-001 and is outside FEAT-001's scope.

## Sign-off
- Agent: verifier
- Date: 2026-11-21
