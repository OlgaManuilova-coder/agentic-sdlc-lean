---
description: Run a single stage of the Agentic SDLC for a change (discover, design, build, review, verify, release).
argument-hint: "<stage> <CHANGE-ID>"
---
<!-- © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean -->

# /sdlc-stage

Arguments: `$ARGUMENTS`.

1. Look up the stage in `sdlc.policy.json → stages`: its agent, gate and artefact. An unknown stage means stopping and listing the valid ones.
2. `npm run change:use -- <ID>`. If the artefact does not exist yet, create it: `npm run change:artefact -- <ID> <artefact>` (requirements already exists).
3. Check that the previous gates pass (`npm run gates -- <ID> --up-to <previous gate>`). If they do not, stop and say which gate is missing.
4. Dispatch that stage's agent. For **review**, pass only the requirements, design, build.md, `git diff app/` and the test output.
5. Print the gate result for this stage.
