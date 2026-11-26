<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->
# {{ID}}: Requirements

## Request
<!-- Quote or summarise the backlog item. Link: backlog/{{ID}}.md -->

## Intent
<!-- CR-01. The business outcome in one or two sentences. Bump the version on any material change: it invalidates approvals. -->
- Intent-version: 1

## Non-goals
<!-- What this change deliberately does NOT do. -->

## Constraints
<!-- Technical, legal, time, compatibility constraints. -->

## Data classification
<!-- public | internal | personal | financial. Personal/financial data adds the regulated overlay (docs/v1-spec.md S12). -->
internal

## Sources
<!-- CR-02. Each source with its trust and version or date: business rules = authoritative; backlog, docs, code you read = advisory;
     scan results and agent output = generated; tickets, customer text, web = untrusted.
     An AC that rests only on untrusted sources (e.g. a customer message) fails G1 until a rule or a human confirms it. -->
- S1: backlog/{{ID}}.md — advisory — YYYY-MM-DD
- S2: .claude/knowledge/business-rules.md — authoritative — Rules-version below
- Rules-version: <npm run rules:version>

## Reproduction
<!-- Bugfix and security changes (scenario S2): exact steps and the observed wrong result, reproduced before any fix. For a defect found by analysis or a scan, a constructed reproduction (input + resulting wrong behaviour) is valid; say so. Delete for features. -->

## Change class
<!-- feature | bugfix | hotfix | security | control. Hotfix, security and control always need a human design and release decision, whatever the tier. Deliberately left blank: choose. -->


## Acceptance criteria
<!-- One line per criterion. Exact values. Each maps to a rule id from .claude/knowledge/business-rules.md, or NEW, and may cite sources (S1). -->
- **AC-1** Given … When … Then … (BL-XXX-000)

## Proposed rules
<!-- Required when any AC cites NEW: the proposed rule text (cite it as NEW in the AC; a human assigns the id when merging it into business-rules.md). -->

## Out of scope

## Open questions
<!-- G1 fails unless this section says None. Ask the requester, then resolve. -->
None

## Sign-off
- Agent: product-analyst
- Date: YYYY-MM-DD
- Principal: <human this run acts for, from sdlc.policy.json "humans">
- Run: run-YYYYMMDD-<short id>
- Model: <model id, e.g. claude-opus-5-5>
