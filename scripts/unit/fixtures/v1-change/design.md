# FIX-001: Design

## Approach
Count the lines in the request handler before any arithmetic and reject more than 100 with a 400.

## Impact
`app/src/server.mjs` (the /api/quote handler). No change to the invoice calculation.

## Risks
- A legitimate large quote is rejected. Mitigation: 100 is above every quote in the last year (finance confirmed).

## Security & threat model
Untrusted JSON input; the check runs before parsing each line, so oversized bodies cannot reach the calculation.

## Context & dependencies
Business rules version recorded at Discover; model claude-opus-5-5; no MCP server needed for the build.

## Tool plan
Build: `Read`, `Edit`, `Bash` (npm test only). Verify: `Read`, `Bash`.

## Autonomy budget
- Max files: 2
- Max retries: 3
- Max sub-agents: 2
- Time box: 1h
- External effects: none

## Rollback & recovery
Revert the commit; trigger: any 400 rate above 1 % on /api/quote; verify by re-running the AC-2 request.

## Human decision points
Design approval (scope and the limit of 100) and release approval (evidence pack), by the product owner.

## Test strategy
| AC | Test |
|---|---|
| AC-1 | server.test.mjs: "rejects 101 lines with 400" |
| AC-2 | server.test.mjs: "accepts 100 lines" |

## Sign-off
- Agent: solution-architect
- Date: 2026-11-25
- Principal: olga.manuilova
- Run: run-20261125-fx01
- Model: claude-opus-5-5

## Approval
- Approved-by:
- Date:
