# Agentic SDLC v1 — Research, Requirements & Scenario Specification

**Author / Framework Owner:** Olga Manuilova  
**Prepared:** 24 November 2026  
**Status:** Working specification for Agentic SDLC v1 freeze — **v1.1** (25 November 2026)  
**Purpose:** Consolidate the current Agentic SDLC architecture, external research validation, gap analysis, cross-cutting requirements, Lean vs Full scope, and required worked scenarios into one implementation-ready specification.

## Changes in v1.1 (25 November 2026)

1. **Twelve cross-cutting requirements consolidated into ten** (§5.0): Autonomy Budget joins Authority (CR-03), Dependency Resilience joins Provenance (CR-06), Security joins Independent Verification (CR-07). Nothing is dropped.
2. **Every requirement ends with a "Blocking check"**: the deterministic check that fails, and in which gate. This enforces §11 ("no decorative governance") inside the specification itself.
3. **New CR-10 Understanding**: the reviewer explains the change in their own words; G4 fails without it or when it copies the builder.
4. S12 names the **UAE Personal Data Protection Law (PDPL)** as an example regulated overlay.
5. §13: every source is cited by its exact page and date (verified 25 November 2026).
6. Implementation status: [§15](#15-implementation-status-v11).

---

## 1. Executive Summary

The current Agentic SDLC architecture is strong enough to freeze as the core of v1. The research does **not** justify adding more lifecycle stages. The framework should retain:

**Seven lifecycle stages**

`Discover → Design → Build → Review → Verify → Release → Operate`

**Five maturity levels**

`L0 Manual → L1 Assisted → L2 Delegated → L3 Orchestrated → L4 Governed Autonomy`

There is intentionally no “full autonomy” level. An agent that cannot be explained, constrained, stopped, and verified is not mature autonomy; it is uncontrolled risk.

**Four control planes**

`Identity → Authority → Enforcement → Evidence`

External research across agent runtimes, enterprise SDLC tooling, security guidance, banking/FinTech controls, and practitioner discussions broadly validates these boundaries. The main gaps are not missing lifecycle stages but missing **cross-cutting requirements** that must apply across the seven stages.

The most important additions for v1 are:

0. *(v1.1: these ten were consolidated with the rest into ten requirements; see §5.0.)*
1. **Control-Plane Integrity** — an agent must not be able to weaken the controls that constrain it.
2. **Execution Provenance** — every consequential result must be traceable to the exact agent, model, prompt, skill, policy, tool, environment, and evidence set that produced it.
3. **Human Approval Quality** — human involvement is not automatically meaningful oversight; the approver must have evidence, decision authority, bounded scope, and a clear decision objective.
4. **Autonomy Budget** — autonomy must be bounded by task, risk, retries, fan-out, time, token/cost, tools, and stop conditions.
5. **Intent & Traceability** — business intent must become a first-class, versioned artifact linked through design, code, tests, evidence, release, and production observation.
6. **Context & Memory Integrity** — context is an execution dependency and must have provenance, freshness, conflict handling, and poisoning controls.
7. **Tool / MCP Trust Boundaries** — the framework must control not only agent permissions but every path by which tools and MCP servers can read, write, or create external effects.
8. **Verification & Eval Architecture** — deterministic tests, behavioral evals, policy evals, adversarial evals, workflow/trace evals, and production validation must be distinguished.
9. **Recovery, Replay & Containment** — consequential actions need idempotency, retry limits, rollback semantics, approval expiry, and safe recovery.
10. **Supply-Chain / Dependency Assurance** — models, prompts, skills, plugins, MCP servers, providers, data sources, cloud dependencies, and fallbacks form an agentic supply chain that must be auditable and testable.

The framework also needs **worked scenarios**, not only a happy-path feature delivery. At minimum, Lean should demonstrate standard feature delivery, bugfix, hotfix, rollback, rejected release, and authority/control violation. Full should add provider/tool failure, stale context, approval expiry, partial failure/retry, security-review failure, and regulated/sensitive-data scenarios.

The desired final product is not “an AI coding workflow.” It is a **governed delivery system that can prove why an agent was allowed to act, what constrained it, what evidence supports the result, and how the organization recovers when the result is wrong.**

---

## 2. Current Agentic SDLC Baseline

### 2.1 Seven lifecycle stages and deterministic gates

| Stage | Gate | Current passing condition |
|---|---|---|
| Discover | **G1 Testable** | Acceptance criteria are explicit, testable, linked to business rules, and contain concrete values where needed. |
| Design | **G2 Approved** | Approach, impact, risks, and verification strategy are documented; required human approval is present. |
| Build | **G3 Proven** | Tests fail before the change and pass after it; the agent has not weakened existing tests or controls. |
| Review | **G4 Reviewed** | Independent reviewer works in a clean context and is not the author of the change. |
| Verify | **G5 Verified** | Evidence exists for every acceptance criterion using appropriate API/browser/system-level verification. |
| Release | **G6 Ready** | Evidence package, risk, rollback/recovery plan, and release decision are complete; required human decision is captured. |
| Operate | **G7 Healthy** | Post-release observation shows no unacceptable new errors or degradation and production evidence is captured. |

### 2.2 Maturity model

| Level | Meaning |
|---|---|
| L0 Manual | Humans perform the work and controls manually. |
| L1 Assisted | Agents support humans but do not own stage execution. |
| L2 Delegated | Agents execute bounded work; humans retain frequent control points. |
| L3 Orchestrated | Multi-agent workflow executes across stages under explicit gates and policies. |
| L4 Governed Autonomy | Bounded autonomous execution is allowed only where identity, authority, enforcement, evidence, and risk conditions are satisfied. |

**Maturity rule:** maturity of a stage is determined by its weakest required control plane or required cross-cutting control. A stage cannot claim L4 merely because execution is automated.

### 2.3 Four control planes

| Plane | Core question |
|---|---|
| Identity | Which agent acted, which run/instance, and on whose behalf? |
| Authority | What was the agent allowed to do at that moment? |
| Enforcement | What technically prevented the agent from exceeding that authority? |
| Evidence | What proves what happened and why the result is acceptable? |

### 2.4 Existing implementation strengths

The existing Lean and Full implementations already provide a strong baseline:

- deterministic gates as code;
- policy-as-code for stage maturity, human approvals, and write permissions;
- hooks that block code changes before design approval and prevent test weakening;
- independent review in a clean context;
- risk-based paths in Full;
- security review for high-risk changes;
- separate agent authorship / commit identity in Full;
- evidence packages and governance audit capability;
- metrics for first-pass gate success, evidence completeness, autonomous change share, delivery time, and escaped defects;
- a practical UAE invoice demo with VAT, API, web UI, tests, and intentionally seeded defects.

The research therefore extends the existing architecture rather than replacing it.

---

## 3. Research Validation: What the Market Is Converging On

### 3.1 Agent runtimes: guardrails, approvals, tracing, evals

Current agent platforms increasingly treat the following as first-class engineering concerns:

- pre-action and post-action guardrails;
- explicit human approvals around consequential tools/actions;
- resumable execution state;
- tracing of tool calls and workflow decisions;
- datasets, graders, and repeatable eval runs;
- separation between agent behavior and deterministic controls.

**Implication for Agentic SDLC:** `Enforcement` and `Evidence` must be executable and testable, not policy text around an autonomous agent.

### 3.2 Enterprise SDLC tooling: agent identity and scoped permissions

Enterprise development tooling is beginning to separate agent identity from human identity, use service accounts or requester-scoped permissions, and record agent activity separately in audit logs.

**Implication:** identity must be an engineering control, not simply a label in logs. The framework should require distinct identities for material agent actions and trace the principal/delegation relationship.

### 3.3 Security guidance: memory/context and agentic supply chain

Agentic security guidance increasingly treats context poisoning, memory manipulation, tool/plugin compromise, and external agent/tool dependencies as distinct attack surfaces.

**Implication:** context, skills, prompts, plugins, MCP servers, and models belong in the SDLC evidence and supply-chain model.

### 3.4 Banking / FinTech direction: identity is not enough

Financial-services initiatives increasingly distinguish:

- agent identity;
- represented principal;
- mandate;
- current authority;
- institution-side acceptance controls;
- transaction/action evidence;
- human decision boundaries.

**Implication:** the framework’s `Authority` plane should explicitly include delegation, mandate, expiry/revocation, and per-action acceptance rather than only static permissions.

### 3.5 Practitioner pain signals from Reddit

Reddit discussions are useful as **pain signals**, not normative evidence. Recurring issues include:

- AI generation outpacing human review capacity;
- “working” code that developers no longer understand;
- approval fatigue and shallow permission review;
- hooks or controls that can be bypassed through another path;
- agents attempting to modify the controls that block them;
- runaway subagents, retry loops, and excessive token/cost consumption;
- successful single tasks masking brittle long-horizon behavior.

**Implication:** verification capacity, control integrity, path-independent enforcement, understanding/context integrity, and autonomy budgets belong in the framework.

---

## 4. Frozen Core for Agentic SDLC v1

The following are **frozen** for v1 unless implementation testing proves a structural defect:

- seven lifecycle stages;
- five maturity levels;
- four control planes;
- deterministic stage gates;
- risk-based human involvement;
- independent review principle;
- evidence package as a release requirement;
- no “full autonomy” maturity level.

The following should **not** be introduced as new lifecycle stages:

- Governance;
- Security;
- Evaluation;
- Human Oversight;
- Compliance;
- Context Management.

These are cross-cutting requirements that apply to multiple stages.

---

# 5. Cross-Cutting Requirements for v1

v1.1 consolidates the original twelve requirements into ten (§5.0). Every requirement ends with a
**Blocking check**: the deterministic check that fails, and where. A requirement without a blocking check
is documentation, not a control (§11).

## 5.0 Consolidation map (v1.0 → v1.1)

| v1.1 | Merges v1.0 | Why one requirement |
|---|---|---|
| CR-01 Intent & Traceability | CR-01 | unchanged |
| CR-02 Context & Memory Integrity | CR-02 | unchanged |
| CR-03 Identity, Mandate, Authority & Autonomy Budget | CR-03 + CR-10 | a budget is part of current authority: what the agent may do *now*, how much, until when |
| CR-04 Control-Plane Integrity | CR-04 | unchanged |
| CR-05 Tool & MCP Trust Boundaries | CR-05 | unchanged |
| CR-06 Execution Provenance, Supply Chain & Dependency Resilience | CR-06 + CR-12 | one dependency inventory serves provenance, exposure queries and fallback |
| CR-07 Independent Verification & Security | CR-07 + CR-11 | security is one verification path with its own independent verifier |
| CR-08 Human Decision Quality | CR-08 | unchanged |
| CR-09 Recovery, Replay & Containment | CR-09 | unchanged |
| **CR-10 Understanding (new)** | — | practitioner pain "working code nobody understands" had no control |

---

## CR-01 — Intent & End-to-End Traceability

### Objective
Make business intent a versioned, machine-traceable artifact rather than an implicit assumption inside a ticket or prompt.

### Required controls
- A change has a unique ID and an `Intent-version`.
- Intent states: business outcome; in-scope behaviour; **non-goals**; **constraints**; risk assumptions; **data classification**; acceptance criteria with IDs; known ambiguity.
- Lineage: `Intent → Design → Code/Config → Tests/Evals → Evidence → Release Decision → Production Observation`. Every AC appears in the design's test strategy and in the verification evidence.
- A material change to intent after design approval invalidates the approval (CR-08).
- The release evidence names the intent version implemented.

### Blocking check
- **Lean:** G1 fails without Intent, Non-goals, Constraints, Data classification and AC IDs. G2 fails if an AC is missing from the test strategy. G5 fails if an AC has no evidence row.
- **Full:** + `npm run trace` coverage = 100 % for release; approval digest covers requirements, so an intent edit after approval fails G2/G6.

### Lean / Full
Lean: versioned intent section, AC IDs, AC→test→evidence mapping. Full: automated traceability report and metric, intent-change invalidation.

---

## CR-02 — Context & Memory Integrity

### Objective
Treat context as an execution dependency whose quality directly affects agent decisions. **Context is an input dependency, not background information.**

### Required controls
- Sources have provenance and priority: authoritative, advisory, untrusted/external, generated (`.sdlc/context-sources.json`).
- Requirements list their sources with version or date.
- Conflicts resolve by declared precedence or escalate to a human; untrusted text (tickets, customer messages, web) never overrides an authoritative rule.
- Freshness is observable: the business-rules version used at Discover is recorded and compared at release.
- Memory writes are governed: agents never write authoritative knowledge directly (they propose; a human merges).
- A clean-context review path exists (CR-07).

### Blocking check
- **Lean:** G1 fails without a `Sources` section; an AC justified only by an untrusted source fails G1.
- **Full:** G6 fails when the business rules changed after G1 (`Rules-version` mismatch): stale context must be re-validated (S8).

### Lean / Full
Lean: source hierarchy, versioned instructions, context budget, clean-context reviewer. Full: provenance record, stale-context check, poisoning tests, memory-write controls.

---

## CR-03 — Identity, Mandate, Authority & Autonomy Budget

### Objective
Prove who acted, on whose behalf, under what mandate, with what current authority, and within what budget.
**Identity tells us who is acting. Mandate tells us what they represent. Authority determines what is allowed now. The budget bounds how much.**

### Required controls
- Every material action reconstructs: principal; agent; run/instance; delegated objective; mandate/scope; current authority; credential used; expiry/revocation state; action; approval/override.
- `human identity != agent identity` for material actions.
- Authority is task- and state-sensitive; delegated authority expires or can be revoked, and revocation propagates to queued and retried work.
- **Autonomy is task-scoped:** `Task class × Risk × Evidence × Confidence × Reversibility → Allowed autonomy`. Budget dimensions: fan-out, recursion depth, time, token/cost, tool calls, **retries**, **changed files**, data scope, external effects, stop conditions, override authority.
- Budget overrun stops or escalates; autonomy shrinks when evidence or context confidence degrades.

### Blocking check
- **Lean:** sign-offs name a `Principal` listed as a human; G2 fails without an `Autonomy budget`; G6 fails when changed files exceed the tier/budget limit.
- **Full:** sign-offs carry a `Run` id; G-checks fail for a revoked run or agent (`.sdlc/revocations.json`) and after the mandate's expiry; G3 fails when the retry budget is exhausted without a human escalation.

### Lean / Full
Lean: named agent + principal, stage permissions, simple budget. Full: run identities, revocation and expiry, retry budget enforcement, budget override workflow, cost metrics.

---

## CR-04 — Control-Plane Integrity

### Objective
**The agent must not control the controls that constrain it.**

### Required controls
- Gate definitions, policy, hooks, approval tooling, settings, templates, tool inventory and the framework's own tests are **control-plane assets** (listed in policy).
- A human seals their content (`npm run control:seal`, denied to agents); every gate run verifies the seal. This check is **path-independent**: it does not matter whether the file was changed through an editor, a shell, a script or an MCP tool.
- A product change that touches a control-plane path fails. Control changes use change class `control`: separate authority, independent review, explicit human approval, control regression tests, re-seal by a human.
- The system distinguishes a legitimate control update from an attempt to make a failing change pass.

### Required negative tests
Agent modifies a gate; weakens a test threshold; disables a hook; edits an approval record; raises its own authority in policy.

### Blocking check
- **Lean:** every gate fails while the control seal does not match; G3 fails when a product change lists a control-plane path; hooks block direct writes; negative tests for all five paths.
- **Full:** + control-change workflow (class `control` forces human design and release approval and a security review).

---

## CR-05 — Tool & MCP Trust Boundaries

### Objective
Control every path by which an agent can read data, change state or create an external effect.

### Required controls
For every material tool: `identity → trust level → read scope → write scope → data classes → side effects → approval policy → audit → revocation` (`.sdlc/tools.json`, a control-plane asset).
- Tools are allowlisted by stage; sensitive data access and side effects are declared; failure behaviour is defined.
- Tool output is evidence with provenance, not truth.
- Controls are **path-independent**: protecting one path is insufficient if another tool reaches the same asset.

### Blocking check
- **Lean:** `policy:lint` fails when a configured MCP server or allowed tool is missing from the inventory; a sign-off that lists a tool not allowed for its stage fails that stage's gate.
- **Full:** + alternate-path negative tests (the same control-plane asset is protected through Edit/Write and through the shell).

---

## CR-06 — Execution Provenance, Supply Chain & Dependency Resilience

### Objective
Make every consequential delivery reproducible and auditable, and treat models, prompts, skills, plugins, MCP servers, providers and data sources as a supply chain with common failure paths.

### Required controls
- An execution manifest per change: commit; intent version; policy version and digest; control seal digest (gate code version); agent definition digests; models; tools; runtime; test files; artefact digests; approvals.
- A version change in a model, prompt, policy or tool can trigger re-evaluation even when code is unchanged; release evidence supports exposure queries ("which changes passed under this policy/model/agent version?").
- Dependency graph: `Business workflow → Agent/Model → Tool/MCP → Identity → Data source → Provider → Fallback`; fallbacks are tested, not only documented; evidence capture survives degradation.

### Blocking check
- **Lean:** G6 fails without a manifest, or when an artefact changed after the manifest was generated.
- **Full:** + `npm run exposure` answers version queries; G6 fails when a dependency the change used has no fallback or an untested one (`.sdlc/dependencies.json`).

---

## CR-07 — Independent Verification & Security

### Objective
Acceptance is not another opinion from the system and assumptions that produced the change. **A different agent is not automatically an independent verifier.**

### Required controls
- Independence on four axes: objective (try to disprove), context (no generator reasoning), evidence (sources the generator does not control), control logic (consequential acceptance is not decided by the same probabilistic mechanism).
- Distinguish deterministic tests, static and security checks, behavioural/policy/adversarial evals, workflow/trace evals, production outcome validation.
- Expected values come from authoritative oracles, never from the implementation under test.
- Evals are versioned; unattended runs need an independent completion check.
- Security: secret scanning, dependency checks, dangerous-API checks, permission and policy-change review, sensitive-data path review, independent security review for high risk, evidence that security controls were not bypassed.

### Blocking check
- **Lean:** G4 fails if the reviewer is the builder; G3 fails without a passing automated security scan.
- **Full:** + G5 fails with fewer than two independent verification paths for standard/high tier; G4 fails without a PASS security review for high tier and for every control change.

---

## CR-08 — Human Decision Quality

### Objective
Prevent "human in the loop" from becoming ceremonial approval. **Human involvement is not automatically meaningful human oversight.**

### Required controls
- A meaningful decision has: decision right, objective, sufficient evidence, bounded scope, understandable consequence, authority to stop/override/escalate, expiry, manageable volume.
- An approval references the exact content approved (digest) and its scope.
- A material change after approval invalidates it; approvals expire where conditions can change.
- Approval workload is monitored.

### Blocking check
- **Lean:** the approval records a digest of the approved artefacts; G2/G6 fail when the content changed after approval.
- **Full:** + G2/G6 fail after the approval's expiry (policy TTL per stage); approval workload metric per human.

---

## CR-09 — Recovery, Replay & Containment

### Objective
Recover safely when an agent, tool, release or dependency behaves incorrectly.

### Required controls
Retry budget; idempotency and duplicate suppression; partial-completion state; approval expiry; safe resume; stop authority; rollback; hotfix path; evidence after recovery.
- **Rollback success is not "deployment succeeded"; it is "expected service and control state were restored and verified."**
- **A hotfix shortens time; it does not erase accountability.** Compensating controls and a follow-up change are explicit.
- After containment, confidence is re-established before autonomy resumes.

### Blocking check
- **Lean:** a hotfix needs a human release approval whatever its tier and a follow-up change that exists in the backlog (G6); a degraded release needs a rollback record with verification evidence and an incident (G7).
- **Full:** + idempotent external effects (a replayed request does not duplicate the effect) proven by a test; retry budget (CR-03).

---

## CR-10 — Understanding (new in v1.1)

### Objective
Prevent understanding debt: code that passes every gate and that no human or reviewer can explain.

### Required controls
- The independent reviewer explains, in their own words, the root cause (for a fix) or the behaviour (for a feature), what could break, and why the tests prove it.
- The explanation is checked against the builder's text: copying the builder's sentences is not understanding.
- For high risk, a human can ask the reviewer to explain before release; unanswered questions block release.

### Blocking check
- **Lean and Full:** G4 fails without an `Explanation` section of meaningful length, or when it repeats sentences from build.md verbatim.

---

# 6. Stage-by-Stage Enhancement Requirements

## Discover / G1 Testable

Add:

- versioned intent artifact;
- explicit non-goals and constraints;
- requirement/acceptance-criterion IDs;
- risk classification seed;
- data sensitivity classification;
- ambiguity register;
- source provenance for requirements.

**G1 should fail if:** acceptance criteria are testable but the source of truth or intent is ambiguous for a material decision.

## Design / G2 Approved

Add:

- authority/tool plan;
- affected control-plane assets;
- context/dependency assumptions;
- verification/eval strategy;
- rollback/recovery design;
- human decision points;
- security/data implications;
- autonomy budget proposal.

**G2 should fail if:** design approval exists but does not cover material authority, data, recovery, or verification consequences.

## Build / G3 Proven

Add:

- control-plane protected-path check;
- provenance manifest update;
- evidence that tests/evals were not weakened;
- changed-file/risk reclassification;
- budget enforcement;
- security/static checks.

**G3 should fail if:** implementation passes tests by changing the test/control rather than satisfying the intended behavior.

## Review / G4 Reviewed

Add:

- clean-context independence criteria;
- control-plane change detection;
- security review for high risk;
- verifier access to original intent, not generator reasoning;
- provenance review where material.

**G4 should fail if:** reviewer is technically different but inherits the same assumptions and evidence controlled by the authoring agent.

## Verify / G5 Verified

Add:

- deterministic test results;
- behavioral/policy/adversarial evals where applicable;
- trace/workflow validation;
- evidence completeness check;
- alternate-path/tool tests;
- unattended-run completion verification.

**G5 should fail if:** all tests pass but evidence cannot prove acceptance criteria, authority conditions, or critical workflow behavior.

## Release / G6 Ready

Add:

- execution provenance manifest;
- human approval quality check;
- approval expiry;
- rollback/hotfix procedure;
- dependency/fallback readiness;
- current authority confirmation;
- evidence of no material change since approval.

**G6 should fail if:** approval is stale, authority changed, or evidence package is incomplete even when build is green.

## Operate / G7 Healthy

Add:

- production observation window;
- expected and unexpected outcome signals;
- new-error detection;
- rollback trigger;
- provider/dependency signals;
- evidence-capture health;
- feedback into risk model, tests/evals, business rules, and future intent.

**G7 should fail if:** service is technically up but evidence capture, control enforcement, or key business outcomes are degraded beyond tolerance.

---

# 7. Required Worked Scenarios

The framework must include examples that exercise **different control paths**, not only a successful feature delivery.

## Scenario S1 — Standard Feature Delivery

### Purpose
Demonstrate the full happy path through G1–G7.

### Flow

`Intent → Design → Build → Independent Review → Verify → Release Approval → Production Observation`

### Must demonstrate

- requirement lineage;
- deterministic gates;
- independent review;
- evidence package;
- release decision;
- post-release confirmation.

### Lean
Required.

---

## Scenario S2 — Bugfix

### Purpose
Demonstrate defect reproduction, root-cause/fix evidence, regression verification, and production confirmation.

### Flow

`Defect → Reproduce → Intent/Expected Behavior → Fix → Regression → Independent Review → Release → Verify No Recurrence`

### Must demonstrate

- bug reproduced before fix;
- failing evidence before change;
- passing evidence after change;
- regression scope;
- no test weakening;
- production validation.

### Lean
Required.

---

## Scenario S3 — Hotfix

### Purpose
Demonstrate urgent delivery without abandoning governance.

### Conditions

- production-impacting defect;
- compressed decision time;
- elevated risk;
- limited verification window.

### Must demonstrate

- explicit hotfix classification;
- reduced latency but not removed controls;
- mandatory human decision for material risk;
- bounded scope;
- rollback readiness;
- post-release monitoring;
- mandatory follow-up full validation.

### Principle
**A hotfix shortens time. It does not erase accountability.**

### Lean
Required in simplified form.

### Full
Production-grade implementation.

---

## Scenario S4 — Rollback

### Purpose
Demonstrate that the system can recognize a bad release, contain harm, and restore confidence.

### Flow

`Release → Bad Production Signal → Detect → Stop/Contain → Rollback Decision → Rollback → Verify Recovery → Re-enter SDLC`

### Must demonstrate

- objective rollback trigger;
- stop authority;
- rollback execution;
- evidence that previous healthy state is restored;
- evidence capture remains available;
- incident record;
- future re-entry point.

### Principle
**Rollback success is not “deployment succeeded”; it is “expected service and control state were restored and verified.”**

### Lean
Required.

---

## Scenario S5 — Failed Change / Rejected Release

### Purpose
Prove that the framework can say “no” and force rework.

### Flow

`Build → Review/Verify Failure → Gate Blocks → Rework → Re-review → Re-verify → Release`

### Must demonstrate

- blocked promotion;
- preserved failure evidence;
- no policy/test weakening to force acceptance;
- re-run under the same or explicitly versioned acceptance criteria.

### Lean
Required.

---

## Scenario S6 — Authority / Control Violation

### Purpose
Demonstrate enforcement rather than documentation.

### Example paths

- agent attempts to write outside allowed scope;
- agent attempts to bypass design approval;
- agent tries to change a gate/hook;
- expired authority is used;
- delegated task continues after authority revocation.

### Must demonstrate

- action blocked before external effect where possible;
- evidence of attempted violation;
- escalation;
- no silent policy self-modification;
- explicit human decision if scope is expanded.

### Lean
Required with at least one example.

### Full
Multiple authority/control violations.

---

## Scenario S7 — Provider / Tool Failure

### Purpose
Demonstrate resilience to upstream agent/tool dependencies.

### Examples

- model provider unavailable;
- MCP tool returns stale/wrong result;
- API partially succeeds;
- evidence store unavailable.

### Must demonstrate

- degradation detection;
- retry budget;
- fallback or safe stop;
- no duplicate side effects;
- evidence of what happened.

### Full
Required.

---

## Scenario S8 — Stale or Poisoned Context

### Purpose
Demonstrate context integrity controls.

### Example

An obsolete requirement or malicious/untrusted context suggests behavior that conflicts with the current authoritative source.

### Must demonstrate

- source priority;
- stale/conflicting context detection;
- refusal/escalation instead of silent acceptance;
- evidence of which source won and why.

### Full
Required.

---

## Scenario S9 — Approval Expires Before Execution

### Purpose
Demonstrate that human approval is state-bound, not permanent.

### Flow

`Approval → Delay/State Change → Execution Attempt → Approval Invalidated → Re-approval or Block`

### Must demonstrate

- expiry rule;
- changed conditions invalidate approval;
- no execution using stale approval;
- evidence of re-approval or block.

### Full
Required.

---

## Scenario S10 — Partial Failure + Retry / Replay

### Purpose
Demonstrate idempotency and safe recovery.

### Example

Tool call creates an external record but response is lost; agent considers retrying.

### Must demonstrate

- external-effect detection;
- duplicate suppression/idempotency;
- retry budget;
- clean recovery state;
- evidence that action occurred once.

### Full
Required.

---

## Scenario S11 — Security Review Failure

### Purpose
Demonstrate that security can block an otherwise functionally correct change.

### Must demonstrate

- functional tests pass;
- security reviewer finds a material issue;
- G4/G6 blocks release;
- remediation;
- re-review and evidence update.

### Full
Required for high-risk path.

---

## Scenario S12 — Sensitive Data / Regulated Overlay

### Purpose
Demonstrate how Agentic SDLC applies to a consequential regulated workflow.

### Example

Agent operates on customer/financial/sensitive data and proposes or executes a material action.

### Must demonstrate

- data classification;
- least necessary access;
- masked/tokenized data where appropriate;
- principal/mandate/current authority;
- human boundary for material consequence;
- evidence that does not itself leak sensitive data;
- revocation/containment path.

### Full / FinTech overlay
Recommended. Example regulation for the UAE market: the Personal Data Protection Law (Federal Decree-Law No. 45 of 2021); for a financial workflow, the relevant central-bank requirements. The overlay maps them onto data classification (CR-01), least access (CR-03, CR-05) and evidence without leakage (CR-06).

---

# 8. Lean vs Full Scope Matrix

| Capability | Lean | Full / Enterprise |
|---|---|---|
| Seven stages / G1–G7 | Full concept | Full implementation |
| Maturity L0–L4 | Self-assessment | Enforced risk/maturity policy |
| Intent lineage | Basic/versioned | Automated traceability and change invalidation |
| Agent identity | Named/recorded | Service identity + principal/delegation evidence |
| Authority | Stage policy | Dynamic task/risk/current-state authority |
| Control-plane integrity | Protected paths + simple negative test | Separate workflow + comprehensive negative tests |
| Context integrity | Source hierarchy + clean review | Provenance, stale detection, poisoning tests, memory controls |
| MCP/tool boundary | Inventory + allow/deny | Enforced scopes, alternate-path tests, revocation/failure handling |
| Execution provenance | Basic manifest | Machine-readable complete manifest + exposure queries |
| Independent verification | Clean reviewer + deterministic gates | Multiple verification paths + adversarial/workflow evals |
| Human approval quality | Explicit scoped approval | Risk-based approval, expiry, invalidation, workload metrics |
| Recovery/replay | Rollback + retry limit | Idempotency, partial-failure recovery, stop/resume |
| Autonomy budget | Basic limits | Enforced dynamic budget + override workflow |
| Security verification | Minimal automated | Independent security reviewer for high risk |
| Provider resilience | Documented dependency/fallback | Dependency graph + common-failure tests |
| Standard feature scenario | Yes | Yes |
| Bugfix | Yes | Yes |
| Hotfix | Simplified | Production-grade |
| Rollback | Yes | Production-grade |
| Rejected release | Yes | Yes |
| Authority violation | At least one | Multiple scenarios |
| Provider/tool failure | Optional | Required |
| Stale context | Optional | Required |
| Approval expiry | Optional | Required |
| Partial failure/replay | Optional | Required |
| Security failure | Optional | Required for high risk |
| Sensitive-data overlay | No | Optional vertical / FinTech |

---

# 9. v1 Implementation Backlog

## P0 — Required before v1 freeze

### Architecture/specification

- [ ] Add Cross-Cutting Requirements section to framework documentation.
- [ ] Formalize **Control-Plane Integrity**.
- [ ] Formalize **Execution Provenance**.
- [ ] Formalize **Human Approval Quality**.
- [ ] Formalize **Autonomy Budget** (inside CR-03).
- [ ] Add Intent & Traceability requirement.
- [ ] Add Context & Memory Integrity requirement.
- [ ] Add Tool/MCP Trust Boundary requirement.
- [ ] Expand Authority to principal + delegation + mandate + current authority + expiry/revocation.
- [ ] Separate deterministic tests, behavioral evals, policy evals, adversarial evals, and production outcome validation.

### Gate updates

- [ ] Update G1–G7 definitions with cross-cutting checks.
- [ ] Add “control changed by delivery agent” blocking condition.
- [ ] Add approval expiry/material-change invalidation.
- [ ] Add execution manifest/evidence completeness requirement to G6.
- [ ] Add evidence-capture health to G7.

### Worked scenarios

- [ ] S1 Standard Feature Delivery.
- [ ] S2 Bugfix.
- [ ] S3 Hotfix.
- [ ] S4 Rollback.
- [ ] S5 Failed Change / Rejected Release.
- [ ] S6 Authority / Control Violation.

### Validation

- [ ] At least one live end-to-end agent run for each critical control path.
- [ ] Negative tests prove controls block violations, not only allow good paths.
- [ ] Independent reviewer verifies the framework implementation itself.

---

## P1 — Full / Enterprise after core v1

- [ ] S7 Provider/Tool Failure.
- [ ] S8 Stale/Poisoned Context.
- [ ] S9 Approval Expiry.
- [ ] S10 Partial Failure + Retry/Replay.
- [ ] S11 Security Review Failure.
- [ ] S12 Sensitive Data / FinTech Overlay.
- [ ] Machine-readable dependency graph.
- [ ] Retrospective exposure queries by model/policy/tool version.
- [ ] Dynamic autonomy budget.
- [ ] Approval workload / fatigue metrics.
- [ ] Context poisoning test library.
- [ ] Tool alternate-path access tests.
- [ ] Evidence restoration test after degraded mode.

---

# 10. v1 Acceptance Criteria

Agentic SDLC v1 should be considered complete only when:

1. The seven-stage architecture and four control planes are documented and implemented consistently.
2. Cross-cutting requirements are mapped to stages and gates.
3. A normal agent cannot modify its own governing controls to force a pass.
4. Every material action can be attributed to an agent/run/principal and current authority state.
5. Verification does not rely exclusively on the generator’s context or judgment.
6. Release evidence can reconstruct intent, change, verification, authority, approval, and environment/provenance.
7. At least six distinct control-path scenarios are demonstrated in Lean.
8. Rollback is verified as restoration of expected state, not merely successful deployment tooling.
9. Hotfix flow preserves accountability and includes compensating controls and follow-up validation.
10. The system can reject a change without allowing the delivery agent to weaken tests/gates to pass.
11. The framework’s own controls have negative tests.
11a. A reviewer’s explanation of each change exists and is not copied from the builder (CR-10).
12. Full/Enterprise keeps implementation depth, advanced scenarios, and commercial mechanics private.

---

# 11. What Not to Add

To prevent framework sprawl, do **not** add:

- more lifecycle stages unless live implementation proves a structural gap;
- vendor-specific Claude/OpenAI/GitHub mechanics to the core model;
- generic “AI ethics” sections disconnected from executable controls;
- a separate framework for every control domain;
- a “full autonomy” maturity level;
- decorative governance steps that cannot block or evidence behavior.

The framework should remain understandable at executive level while being executable by engineering teams.

---

# 12. Design Principles to Preserve

1. **Gates are code, not opinions.**
2. **A different agent is not automatically an independent verifier.**
3. **The agent must not control the controls that constrain it.**
4. **Identity is not authority. Authority is not enforcement. Enforcement is not evidence.**
5. **Context is an input dependency, not background information.**
6. **Human involvement is not automatically meaningful human oversight.**
7. **Autonomy is task-scoped, risk-sensitive, and bounded.**
8. **A hotfix shortens time; it does not erase accountability.**
9. **Rollback must restore and re-prove confidence.**
10. **Evidence should allow reconstruction without trusting the agent’s hidden reasoning.**
11. **Production feedback must close the loop back into intent, risks, controls, and evaluation.**
12. **Lean proves the architecture; Full contains the implementation depth.**
13. **Working code nobody can explain is a liability, not a delivery.** (CR-10)
14. **Every control names the check that fails.** (v1.1)

---

# 13. Research Basis and Claim Boundaries

The external research used for this gap analysis should be treated in three categories.

## A. Official / primary engineering and security sources

Used to validate design direction around guardrails, approvals, agent identity, scoped permissions, evals, tracing, context/memory security, and agentic supply-chain risk. Each link was read on 25 November 2026.

- **OpenAI — Guardrails and human review (Agents SDK):** guardrails validate input, output or tool behaviour; human approvals pause a run before side effects such as shell commands or sensitive MCP actions. https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
- **Anthropic — Claude Code documentation** (project context, settings, hooks, permissions): https://docs.claude.com/en/docs/claude-code/overview
- **GitLab — Composite identity for the Duo Agent Platform:** agent actions run under a service account combined with the initiating human's identity, so audit trails show the agent and the human it acted for, without privilege escalation. https://docs.gitlab.com/user/duo_agent_platform/security/
- **NIST NCCoE — Accelerating the Adoption of Software and AI Agent Identity and Authorization (concept paper, 5 February 2026):** https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd
- **OWASP GenAI Security Project — Top 10 for Agentic Applications (9 December 2025):** https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications/

**Claim boundary:** these sources support the direction and specific published controls. They do not establish a universal mandatory Agentic SDLC standard.

## B. Financial-services / regulated-system sources

Used to validate stronger authority, mandate, evidence, dependency, resilience, and human-boundary requirements.

- **Monetary Authority of Singapore — Safeguards for Agentic Finance at Runtime (SAFR) white paper, 3 July 2026:** governance checkpoints between every agent decision and its execution, so that no agentic action is executed without being declared, authorised and assessed; agent identity verified against a registry. https://www.mas.gov.sg/news/media-releases/2026/mas-partners-industry-to-develop-safeguards-for-ai-agents-in-finance
- **MAS — "Know your agent" protocol (Singapore FinTech Festival keynote, November 2026):** a common protocol so that financial institutions can verify whether an AI agent acts with the customer's authorisation and within its mandate. Reported e.g. by https://fintechnews.sg/?p=141929
- **BNY and Microsoft — first agentic negotiation of a U.S. Treasury trade (17 November 2026):** AI agents negotiated within preset limits under BNY's Agentic Negotiation Protocol; human traders reviewed and approved the terms; agents do not execute the trade. https://www.bny.com/corporate/global/en/about-us/newsroom/press-release/bny-and-microsoft-complete-first-agentic-negotiation-of-a-us-treasury-trade.html
- **European Central Bank — "The rise of artificial intelligence: benefits and risks for financial stability" (Financial Stability Review, May 2024):** concentrated AI suppliers can increase operational and cyber risk and market concentration. https://www.ecb.europa.eu/press/financial-stability-publications/fsr/special/html/ecb.fsrart202405_02~58c3ce5246.en.html
- **European Banking Authority — Rising application of AI in EU banking and payments (25 September 2025):** reliance on third parties, data governance and human oversight among the main challenges. https://www.eba.europa.eu/sites/default/files/2025-09/146b3558-d026-47bf-a872-f05e93ed30d2/Rising%20application%20of%20AI%20in%20EU%20banking%20and%20payments%20sector.pdf

**Claim boundary:** sandbox/pilot/regulatory analysis is evidence of emerging control requirements and architecture patterns, not proof of universal production effectiveness.

## C. Reddit practitioner evidence

Reddit was used only as **Voice of Practitioner / failure-mode discovery** for issues such as:

- verification bottlenecks;
- understanding debt;
- approval fatigue;
- hook/control bypass paths;
- agents modifying controls;
- runaway agents and cost/fan-out problems.

**Claim boundary:** Reddit is anecdotal practitioner evidence. It is useful to discover recurring pains and scenarios to test, but not to establish prevalence, regulatory requirements, or validated control effectiveness.

---

# 14. Final Recommendation

Freeze the Agentic SDLC core architecture for v1. Do not redesign the lifecycle.

The next work should be implementation-focused:

1. add the cross-cutting requirements;
2. update G1–G7;
3. implement the six Lean worked scenarios;
4. prove the negative control paths;
5. independently review the framework itself;
6. keep advanced resilience, sensitive-data, dynamic authority, and commercial implementation depth in Full/Enterprise.

After these items are complete, further research should update evidence and test scenarios rather than continually expanding the framework structure.

**Target positioning:**

> Agentic SDLC is a governed engineering operating model for delivering software with AI agents under explicit intent, identity, authority, deterministic enforcement, independent verification, evidence, recovery, and bounded autonomy.


---

# 15. Implementation Status (v1.1)

Tracked in the repositories (`docs/v1-status.md` in agentic-sdlc-lean and agentic-sdlc-full), branch `framework/v1`. Control-plane changes are delivered as a pull request for the framework owner to review and merge (CR-04 applied to the framework itself).

---
*Agentic SDLC Framework (lean edition) · © 2026 Olga Manuilova*
