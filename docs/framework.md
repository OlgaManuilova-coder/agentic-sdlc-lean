# The Agentic SDLC Framework

**A maturity and control model for delivering software with AI agents, safely.**

Author: Olga Manuilova · © 2026 · Licensed under [CC BY 4.0](../LICENSE-DOCS.md). Reuse is welcome with attribution.

---

## Why a framework

Most teams adopt AI in software delivery one tool at a time: a coding assistant here, a test generator
there. Productivity goes up locally. Control goes down globally: nobody can say which agent changed
what, under whose authority, what stopped it from going too far, or what proves the result is right.

The question is not *"can agents do this stage?"*. Increasingly they can. The question is
**"can we trust, govern and prove what they did?"** This framework answers it in three parts:

1. **Seven stages** of the lifecycle, each with a stage agent and an exit gate.
2. **Five maturity levels** that describe how much a stage is delegated to agents.
3. **Four control planes** that every level must satisfy before it is allowed to go higher.

> **Identity is not authority. Authority is not enforcement. Enforcement is not evidence.**
> Four different questions, four different control problems.

---

## 1. Seven stages and their gates

| # | Stage | Agent's job | Exit gate | What passes the gate |
|---|---|---|---|---|
| 1 | **Discover** | Turn a request into testable requirements | **G1 Testable** | Every acceptance criterion is observable, has exact values, and maps to a business rule |
| 2 | **Design** | Propose the change: approach, impact, risks, test strategy | **G2 Approved** | A human approved the design; risks have mitigations |
| 3 | **Build** | Implement the design, **tests first** | **G3 Proven** | New tests failed before the change and pass after; no test was weakened |
| 4 | **Review** | Independent review of the diff in a fresh context | **G4 Reviewed** | No blocking findings; the reviewer did not see the author's reasoning |
| 5 | **Verify** | Run the change as a user and against the rules | **G5 Verified** | Every acceptance criterion has evidence; no rule violations |
| 6 | **Release** | Assess readiness: evidence completeness, risk, rollback | **G6 Ready** | The evidence pack is complete; a human made the release decision |
| 7 | **Operate** | Watch production signals and feed findings back | **G7 Healthy** | No new error signatures attributable to the change within the watch window |

Gates are **checked by code**, not by a model's opinion: a gate is a set of artefacts with required
sections and recorded approvals (`npm run gates -- <CHANGE-ID>`).

### Framework v1: cross-cutting requirements
The stages are frozen. What v1 adds runs **across** them: ten cross-cutting requirements, each with a
check that fails in a named gate ([v1-spec.md](v1-spec.md) §5, implementation: [v1-status.md](v1-status.md)).

| Requirement | One line | Fails in |
|
---

## 2. Five maturity levels

Levels are assessed **per stage**. A team can be at L3 in Verify and L1 in Design. That is normal, and
it is the point: autonomy is earned stage by stage.

| Level | Name | Who does the work | Who decides | Typical example |
|---|---|---|---|---|
| **L0** | Manual | Humans | Humans | No AI in the stage |
| **L1** | Assisted | Humans, with AI suggestions | Humans | A coding assistant completes lines |
| **L2** | Delegated | An agent produces the stage output | A human approves **every** output | An agent writes the test plan; a lead approves it |
| **L3** | Orchestrated | Agents chain stages with code-checked gates | A human approves at **defined checkpoints** | Requirements to verification run end to end; one human approval of the design |
| **L4** | Governed autonomy | Agents act within policy | Humans govern **by exception**, from evidence | Low-risk changes ship on a complete evidence pack; anything outside policy escalates |

There is no L5 "fully autonomous". An organisation that cannot explain, stop and audit an agent does
not have autonomy, it has risk.

### Promotion rule

A stage may move up one level only when **all four control planes** are in place at the target level
(section 3) **and** the stage's metrics have held for an agreed period (section 4). Moving down is always
allowed and should be fast.

---

## 3. Four control planes

Each plane answers a different question. Teams usually solve the first and assume the other three.

| Plane | Question | Controls (examples) | Failure if missing |
|---|---|---|---|
| **Identity** | *Which* agent acted, and as whom? | A named agent per stage; its own credentials (never a human's); every action attributable | "The AI did it": no accountability |
| **Authority** | What *may* it do? | Policy per stage: allowed tools, repos, environments; read vs write; what needs human approval | Agents with a developer's full rights |
| **Enforcement** | What *stops* it from doing more? | Hooks that block forbidden actions; protected branches; no self-merge; gates as code | Policy exists only in a prompt and is ignored under pressure |
| **Evidence** | What *proves* it was right? | Artefacts per change, test results, an independent review, approvals with names and times; one evidence pack per change | Nothing to show an auditor, a regulator or a post-mortem |

### Minimum controls per level

| Level | Identity | Authority | Enforcement | Evidence |
|---|---|---|---|---|
| L1 | Tool use is known | Default IDE rights | — | — |
| L2 | Named agent per stage | Written policy per stage | Human approves each output | Output saved with the change |
| L3 | Agent identity in commits and comments | Policy as code (machine-readable) | Hooks + gates as code + protected branches | Full artefact set per change; gate log |
| L4 | Separate credentials per agent, least privilege | Risk-tiered policy (what may ship without a human) | Automatic stop and escalation outside policy | Evidence pack sufficient for audit without asking anyone |

---

## 4. Metrics

Measure delivery and trust together. Speed without trust is how incidents happen; trust without speed
is how pilots die.

**Delivery** (DORA-style): lead time for change, deployment frequency, change failure rate, time to restore.

**Agentic trust:**

| Metric | Definition | Healthy signal |
|---|---|---|
| Gate first-pass rate | Changes passing each gate on the first attempt | Rising |
| Human override rate | Agent outputs a human rejected or rewrote | Falling, then stable |
| Unchanged-merge rate | Agent-authored changes merged without human edits | Rising for low-risk work |
| Evidence completeness | Changes with a complete evidence pack at release | 100% |
| Escaped defects | Production defects in agent-delivered changes vs others | Not worse than the baseline |
| Escalations | Agent actions stopped by enforcement | Non-zero (proof the controls work), with each one explained |

---

## 5. Adoption path

1. **Baseline:** self-assess every stage (`docs/assessment.md`). Most teams start at L1 almost everywhere.
2. **Pick one stage with a strong oracle:** Verify is usually first, because tests and business rules give objective feedback. See the companion template [agentic-qa-lean](https://github.com/OlgaManuilova-coder/agentic-qa-lean).
3. **Build the four planes at L2** for that stage, then measure.
4. **Add the neighbouring stages** (Build and Review) and orchestrate to L3 with code-checked gates.
5. **Introduce L4 only for a defined low-risk class** of change, with an evidence pack an auditor would accept.
6. **Review quarterly:** promote, hold or demote each stage on the metrics.

---

## 6. Anti-patterns

- **Autonomy before evidence:** letting agents ship before you can show what they did.
- **Policy in prompts only:** a prompt asks; only a hook or a gate enforces.
- **Self-review:** the same agent (or the same context) writing and approving a change.
- **Shared human credentials:** agents acting as a developer's account. You lose identity and least privilege at once.
- **One big switch:** "we are AI-first now" across all stages at once, instead of earning levels stage by stage.
- **Measuring only speed:** velocity goes up and nobody notices trust going down until an incident.

---

## How this repository implements the framework

| Framework element | Implementation |
|---|---|
| Stages and stage agents | `.claude/agents/`, one agent per stage plus an orchestrator |
| Gates as code | `scripts/gates.mjs` + the artefact templates in `.sdlc/templates/` |
| Authority (policy as code) | `sdlc.policy.json` |
| Enforcement | `.claude/hooks/` (no code before an approved design; no weakened tests) + `.claude/settings.json` permissions |
| Evidence | `changes/<ID>/`: one folder per change, with every artefact and a gate log |
| Assessment | `docs/assessment.md` + `npm run assess` |
