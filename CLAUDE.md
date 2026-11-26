<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->
# CLAUDE.md

## What this repo is
A template of the **Agentic SDLC Framework** (`docs/framework.md`): one agent per lifecycle stage,
gates checked by code, policy as code, enforcement hooks, and an evidence trail per change, on a
small runnable invoicing app (`app/`, AED with 5% VAT).

## How work flows
Every change lives in `changes/<ID>/` (current id in `.sdlc/current-change`). Stages in order: Discover
(G1) → Design (G2, **human approval**) → Build (G3) → Review (G4, independent) → Verify (G5) → Release
(G6, **human approval**) → Operate (G7). Run a change with `/sdlc-deliver <ID>`. Check gates with `npm run gates -- <ID>`.

## Commands
`/sdlc-deliver`, `/sdlc-stage`, `/sdlc-status`, `/sdlc-operate`, `/sdlc-assess`. npm: read `package.json`
(`check`, `test`, `gates`, `change:*`, `assess`, `policy:lint`, `app:start`).

## Framework v1
Ten cross-cutting requirements (`docs/v1-spec.md`, status `docs/v1-status.md`). The control plane
(`sdlc.policy.json → controlPlane`) is sealed by a human and verified on every gate run: never change it by any
tool. Sign-offs name the human Principal. Gates can be `AWAITING_HUMAN`. Operate (G7) is part of lean v1.

## Essential rules
- Stage agents read `.claude/knowledge/shared-instructions.md` first; the oracle is `.claude/knowledge/business-rules.md`.
- `app/src/` is locked until G2 passes (hook). Tests are never weakened (hook). Agents never write approvals (hook); `npm run approve` is for humans only (denied to agents).
- Review runs in a fresh context with artefacts, diff and test output only.
- Never push to main, merge, or edit `sdlc.policy.json`, hooks or settings.
