# FIX-001: Requirements

<!-- Test fixture: a complete, valid framework-v1 change used by scripts/unit/*.test.mjs. Not a real delivery. -->

## Request
Finance: "The quote API should reject a request with more than 100 lines." (backlog/FIX-001.md)

## Intent
Protect the quote service from oversized requests while keeping every valid quote unchanged.
- Intent-version: 1

## Non-goals
Pagination of lines; changing the VAT calculation; UI changes.

## Constraints
Backwards compatible for requests with 1–100 lines; error format per BL-API-001.

## Data classification
internal

## Sources
- S1: backlog/FIX-001.md — advisory — 2026-11-25
- S2: .claude/knowledge/business-rules.md — authoritative — Rules-version below
- Rules-version: {{RULES_VERSION}}

## Change class
feature

## Acceptance criteria
- **AC-1** Given a quote request with 101 lines, When it is posted to /api/quote, Then the response is 400 with the error "too many lines: maximum is 100" (BL-API-001, S1)
- **AC-2** Given a quote request with 100 valid lines, When it is posted to /api/quote, Then the response is 200 with the totals (BL-INV-004)

## Risk tier
standard

## Out of scope
Rate limiting.

## Open questions
None

## Sign-off
- Agent: product-analyst
- Date: 2026-11-25
- Principal: olga.manuilova
- Run: run-20261125-fx01
- Model: claude-opus-5-5
