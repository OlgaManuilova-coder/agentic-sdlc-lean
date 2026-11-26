<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->
# {{ID}}: Operate

## Watch window
<!-- From release to +N hours/days; environment. -->

## Signals checked
<!-- Error logs, 4xx/5xx rates, latency, business metrics. Source and query per signal. -->
- Evidence-capture: OK

## New error signatures
None

**Health:** HEALTHY | DEGRADED | ROLLED_BACK

## Rollback
<!-- Only when rolled back (CR-09). -->
- Trigger:
- Rollback-verified:
- Re-entry:

## Incident
<!-- Only when rolled back: what happened, impact, containment. -->

## Sign-off
- Agent: sre-operator
- Date: YYYY-MM-DD
- Principal: <human this run acts for, from sdlc.policy.json "humans">
- Run: run-YYYYMMDD-<short id>
- Model: <model id, e.g. claude-opus-5-5>
