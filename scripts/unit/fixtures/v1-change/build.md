# FIX-001: Build

## Changes
- `app/src/server.mjs`: reject more than 100 lines with 400 before the calculation.
- `app/test/server.test.mjs`: two tests for AC-1 and AC-2.

## Tests added
- AC-1: "rejects 101 lines with 400"
- AC-2: "accepts 100 lines"

## Failing before
```
not ok 9 - rejects 101 lines with 400
# fail 1
```

## Passing after
```
# pass 10
# fail 0
```

## Security checks
```
security:scan OK — no secrets, dynamic code execution or unsafe HTML in app/
```

## Sign-off
- Agent: developer
- Date: 2026-11-25
- Principal: olga.manuilova
- Run: run-20261125-fx01
- Model: claude-opus-5-5
- Tools: Read, Edit, Bash
