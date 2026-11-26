<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->
# {{ID}}: Verification

## Verification paths
<!-- CR-07. One line per independent path used: deterministic | api | browser | static | security | eval | adversarial | production. -->
- deterministic: npm test
- api: POST /api/quote against the running app

## Evidence
| AC | How verified | Evidence | Result |
|---|---|---|---|
| AC-1 | | | PASS |

## Rule check
<!-- Always-on: any BL-* violation observed, even outside the ACs. -->
No violations observed.

## Sign-off
- Agent: verifier
- Date: YYYY-MM-DD
- Principal: <human this run acts for, from sdlc.policy.json "humans">
- Run: run-YYYYMMDD-<short id>
- Model: <model id, e.g. claude-opus-5-5>
- Tools: Read, Bash, mcp__playwright-chrome
