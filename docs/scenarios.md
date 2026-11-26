# Worked scenarios S1–S6 (framework v1, lean edition)

The lean edition proves the architecture with the six scenarios the spec requires (docs/v1-spec.md §7). Each
is an executable test in `scripts/unit/scenarios.test.mjs` that runs in a sealed copy of the repository
(`npm test`). Human decisions inside these tests are simulated in the temporary copy; in the repository
itself only a human records them (`npm run approve`).

| # | Scenario | Control path it proves | Requirement |
|---|---|---|---|
| S1 | Standard feature | All seven gates PASS; every AC traced from intent to evidence | CR-01 |
| S2 | Bugfix | No reproduction ⇒ G1 fails; no test that failed before the fix ⇒ G3 fails | CR-01, CR-07 |
| S3 | Hotfix | A human release decision and a follow-up change that exists in the backlog | CR-09, CR-08 |
| S4 | Rollback | Objective trigger, verified restoration, incident and re-entry; the change is honestly "not live" | CR-09 |
| S5 | Rejected release | CHANGES_REQUIRED blocks; weakening the gate code breaks the seal; rework needs a fresh human approval of the changed content | CR-04, CR-08 |
| S6 | Authority / control violation | Product change touching a control path fails G3; raising your own authority by any tool breaks the seal; hooks block edits, shell writes and sealing; an agent cannot approve; code locked without a human design decision | CR-03, CR-04 |

Also tested: CR-10 (a copied or empty review explanation fails G4).

S7–S12 (provider/tool failure, stale or poisoned context, approval expiry, partial failure and retry,
security review failure, sensitive-data overlay) are part of the Enterprise edition.

## Live work
- `changes/FEAT-001`: S1 under framework v0 (legacy, judged by the v0 rules).
- `backlog/SEC-001`: found by `npm run security:scan` the day the scan was added; to be delivered live.

---
*Agentic SDLC Framework (lean edition) · © 2026 Olga Manuilova*
