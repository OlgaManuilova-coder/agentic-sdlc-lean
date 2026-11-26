# Agentic SDLC maturity self-assessment

Score every **stage × control plane** with the highest level whose criteria you meet **fully**. A stage's
level is the **minimum** of its four planes: autonomy cannot outrun control.

Run it interactively with `/sdlc-assess`, or fill `.sdlc/assessment.json` and run `npm run assess`.

Stages: Discover · Design · Build · Review · Verify · Release · Operate.

## Identity: which agent acted, and as whom?

| Level | Criteria (all must hold) |
|---|---|
| 1 | You know which AI tools are used in the stage |
| 2 | Each stage has a named agent; its outputs are labelled with that name |
| 3 | The agent identity appears in every artefact, commit and comment it produces; actions are attributable without asking anyone |
| 4 | Each agent has its own credentials (a service identity, never a human's), least privilege, rotated; humans and agents are distinguishable in every audit log |

## Authority: what may it do?

| Level | Criteria |
|---|---|
| 1 | Agents run with the user's default rights |
| 2 | A written policy per stage: allowed tools, repositories, environments, and what needs approval |
| 3 | The policy is **code** (machine-readable), versioned, reviewed like code, and read by the tooling |
| 4 | Risk-tiered policy: which change classes may proceed without a human, with explicit limits (paths, size, environments) |

## Enforcement: what stops it from doing more?

| Level | Criteria |
|---|---|
| 1 | — |
| 2 | A human reviews and approves every output before it takes effect |
| 3 | Technical blocks: hooks or permissions for forbidden actions, protected branches, no self-merge, gates checked by code |
| 4 | Automatic stop and escalation when an agent leaves policy; tested regularly (you can show a recent block) |

## Evidence: what proves it was right?

| Level | Criteria |
|---|---|
| 1 | — |
| 2 | The stage output is saved with the change |
| 3 | A complete artefact set per change (requirements, design, build proof, independent review, verification, release decision) with a gate log |
| 4 | An evidence pack an auditor can accept **without asking anyone**: approvals with names and times, test proof, review independence, decision rationale |

## Reading the result

- **Heat map:** rows are stages, columns are planes. The lowest cell in a row is the stage's level.
- **Next step per stage:** raise the weakest plane by one level. Do not raise a strong plane further while a weak one lags.
- **Where to start:** the stage with the strongest objective oracle (usually Verify, then Build). Tests and business rules give agents fast, unambiguous feedback.
- **Promotion rule:** move a stage up only when all four planes support the new level **and** its metrics (`docs/framework.md` §4) have held for an agreed period.

## This repository as shipped

`npm run assess` scores the template itself: Discover, Build, Review and Verify reach **L3**. Design
and Release are **L2**, because a human approves every design and release by policy. Operate is
**L0**: production monitoring is part of Agentic SDLC Enterprise, the separate proprietary edition.

---
*Part of the Agentic SDLC Framework © 2026 Olga Manuilova, licensed under [CC BY 4.0](../LICENSE-DOCS.md).*
