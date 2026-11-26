---
description: Take a backlog item through the full Agentic SDLC — requirements, design, human approval, build, independent review, verification, release readiness.
argument-hint: "<CHANGE-ID e.g. BUG-001>"
---
<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->

# /sdlc-deliver

Change: `$ARGUMENTS`

Dispatch the **sdlc-orchestrator** agent with this change id. It runs every stage with its own agent,
checks each gate with `npm run gates`, and **stops at the human checkpoints** (design approval, release
decision), showing the exact approval command.

When it stops, print:
- the gate table (`npm run change:status`);
- what the human needs to do next, with the exact command;
- the paths of the artefacts to read.
