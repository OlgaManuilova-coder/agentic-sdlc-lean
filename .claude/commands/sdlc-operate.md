---
description: Run the Operate stage (G7) for a released change — watch window, signals, new error signatures, HEALTHY/DEGRADED.
argument-hint: "<CHANGE-ID> [--window 24h]"
---
<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->

# /sdlc-operate

Change: `$ARGUMENTS`.

1. Check that G6 passes (`npm run gates -- <ID> --up-to G6`). If it does not, stop: the change is not released.
2. Create `operate.md` if missing (`npm run change:artefact -- <ID> operate.md`).
3. Dispatch **sre-operator** with the change id, the watch window (default 24h from the release approval date) and the signal sources available in this environment.
4. Print the G7 result. When Health is DEGRADED, list the new backlog items it created.
