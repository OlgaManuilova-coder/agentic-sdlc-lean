# FEAT-001: Requirements

## Request
Finance: "We need VAT on our quotes. It's 5% in the UAE. Please show it on the quote page and in the API." (backlog/FEAT-001.md)

## Acceptance criteria
- **AC-1** Given one line of 2 × AED 450.00, When a quote is requested, Then subtotal is 900.00, VAT is 45.00 and total is 945.00 in AED (BL-INV-004, BL-INV-006)
- **AC-2** Given three lines of 1 × AED 0.30, When a quote is requested, Then VAT is calculated once on the subtotal 0.90 and equals 0.05, not 0.03 from per-line rounding (BL-INV-004, BL-INV-005)
- **AC-3** Given an empty list of lines, When a quote is requested through the API, Then the response is HTTP 400 with the error "an invoice needs at least one line" (BL-INV-001, BL-API-001)
- **AC-4** Given the quote page with one line of 2 × AED 450.00, When the user clicks Calculate, Then the page shows Subtotal 900.00, VAT 5% 45.00 and Total 945.00 (BL-INV-004, BL-INV-006)

## Out of scope
Discounts, zero-rated or exempt items, other currencies, invoice numbering and PDF output.

## Open questions
None

## Sign-off
- Agent: product-analyst
- Date: 2026-11-20
