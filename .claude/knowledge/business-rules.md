# Business rules: invoice quoting (demo app)

The oracle for every stage. Requirements map acceptance criteria to these ids, reviewers check diffs
against them, and verifiers judge behaviour by them. A violation is a defect even if no acceptance
criterion mentions it. Severity comes from this table. Ids are never reused.

| ID | Rule | Severity if broken |
|---|---|---|
| BL-INV-001 | An invoice has at least one line; an empty invoice is rejected with a clear error. | Medium |
| BL-INV-002 | Quantity is a positive integer. | High |
| BL-INV-003 | Every line has a non-empty description; unit price is a non-negative amount with at most 2 decimals. | High |
| BL-INV-004 | VAT is 5% (UAE standard rate) of the taxable subtotal, calculated **once** on the subtotal, not per line. | Critical |
| BL-INV-005 | Every money amount (line amount, subtotal, VAT, total) is rounded **half-up** to 2 decimals (fils). `x.xx5` always rounds up. | Critical |
| BL-INV-006 | Total = subtotal + VAT. Currency is AED. | Critical |
| BL-API-001 | Invalid input returns HTTP 400 with a human-readable error; it never returns 500 or a partial result. | High |

---
*Agentic SDLC Framework (lean edition) · © 2026 Olga Manuilova*
