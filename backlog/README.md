# Backlog

Incoming requests, written the way stakeholders write them: incomplete and ambiguous. Turning them
into testable requirements is the Discover stage's job. Start one with:

```bash
npm run change:new -- BUG-001
```

| ID | Type | Title | Status |
|---|---|---|---|
| FEAT-001 | Feature | Apply UAE VAT to invoices | Done: see `changes/FEAT-001/` (worked example) |
| BUG-001 | Bug | VAT is one fil short on some invoices | Open: good first run of the full flow |
| FEAT-002 | Feature | Discount codes | Open |
| SEC-001 | Security | Quote page builds rows with innerHTML from values | Open: found by `security:scan` (framework v1) |
