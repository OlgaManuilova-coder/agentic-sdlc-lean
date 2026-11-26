<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->
# Always-on rules (kept short)

- Every stage agent reads `.claude/knowledge/shared-instructions.md` first.
- All work belongs to a change: `changes/<ID>/`, current id in `.sdlc/current-change`.
- Gates are checked by code (`npm run gates`), never by opinion.
- Code is locked until the design is approved (hook). Tests are never weakened (hook). Agents never approve (hook + deny).
- Review is independent: a fresh context without the author's reasoning.
- Never push to main, merge, or edit the policy, hooks or settings.
