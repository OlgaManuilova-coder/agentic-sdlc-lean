---
description: Show every change and its gate status, plus what is waiting for a human.
---
<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->

# /sdlc-status

1. `npm run change:status`.
2. For every change waiting on a human gate (G2 or G6 failing only on approval), list: the id, what to read, and the approval command.
3. `npm run policy:lint`. Report any problem.

Do not run any stage.
