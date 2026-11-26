---
description: Agentic SDLC maturity self-assessment — interview, score per stage and control plane, and a next-step roadmap.
argument-hint: "[organisation or team name]"
---
<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->

# /sdlc-assess

Team: `$ARGUMENTS` (empty means assessing this repository).

1. For each of the 7 stages, ask the user the criteria questions from `docs/assessment.md`, one stage at a time, at most 4 questions per round.
2. Score each control plane 0–4 by the criteria (the highest level **fully** met). When unsure, take the lower level and note why.
3. Write `results/assessment-<team>-<date>.json` in the shape of `.sdlc/assessment.json`. Run `npm run assess -- <that file>`.
4. Present: the heat map (stage × plane), each stage's level (the minimum across planes), and the **three highest-value next steps**. Value means the weakest plane in the stage closest to the next level, preferring stages with a strong oracle (Verify, Build).
