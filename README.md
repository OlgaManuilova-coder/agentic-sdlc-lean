# Agentic SDLC · by Olga Manuilova — lean edition (reference implementation)



**Deliver software with AI agents, and be able to prove what they did.**

The open **reference implementation** of the **Agentic SDLC Framework**: one AI agent per lifecycle stage, gates checked by
code, policy as code, hooks that enforce it, and an evidence trail for every change, built on
[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) and demonstrated end to end on a small
invoicing app.

> **Identity is not authority. Authority is not enforcement. Enforcement is not evidence.**
> Most teams adopting AI in delivery solve the first and assume the other three. This template makes all four explicit.

**Framework v1:** seven stages including Operate, ten cross-cutting requirements in their core form, a control
plane the agents cannot change (sealed by a human, verified on every gate run), approvals bound to the exact
content they approved, an execution manifest per change, and six worked scenarios (S1–S6) that prove the controls
block what they should. Spec: [docs/v1-spec.md](docs/v1-spec.md) · status: [docs/v1-status.md](docs/v1-status.md).

> **This repository is a reference implementation, not a product.**
> It is a minimal, working illustration of the framework, published for learning and evaluation. It is
> intentionally limited (6 of 7 stages, human approval on every design and release, no risk tiers, no
> security review, no Operate stage, no agent credentials, no audit packs) and is not intended for
> production use as is.
>
> **Agentic SDLC Enterprise**, the full implementation, is a **separate, proprietary offering**. It is
> **not open source**, **not contained in this repository**, and **not covered by this repository's
> Apache 2.0 / CC BY licenses**. It is available only through a commercial engagement (licensing, implementation and
> support). [Contact me on LinkedIn](https://www.linkedin.com/in/olga-manuylova/).

---

## Contents

1. [The framework in one page](#the-framework-in-one-page)
2. [What is in the box](#what-is-in-the-box)
3. [Quick start](#quick-start)
4. [Deliver a change end to end](#deliver-a-change-end-to-end)
5. [How the four control planes are enforced](#how-the-four-control-planes-are-enforced)
6. [Repository layout](#repository-layout)
7. [Assess your own team](#assess-your-own-team)
8. [Adapting it to your product](#adapting-it-to-your-product)
9. [Companion template: agentic QA](#companion-template-agentic-qa)
10. [Editions](#editions)

---

## The framework in one page

**Seven stages, each with an agent and a gate:**

| Stage | Agent | Gate | Passes when |
|---|---|---|---|
| Discover | product-analyst | G1 Testable | ACs are Given/When/Then with exact values, each mapped to a business rule; no open questions |
| Design | solution-architect | G2 Approved | Approach, impact, risks and test strategy, **approved by a human** |
| Build | developer | G3 Proven | New tests **failed before** and pass after; no test weakened |
| Review | independent-reviewer | G4 Reviewed | APPROVE from a **fresh-context** reviewer who is not the builder |
| Verify | verifier | G5 Verified | Every AC has PASS evidence (API + real browser); no rule violations |
| Release | release-manager | G6 Ready | Complete evidence pack, risk, rollback, **human release decision** |
| Operate | (Enterprise edition) | G7 Healthy | No new production error signatures from the change |

**Five maturity levels per stage:** L0 Manual, L1 Assisted, L2 Delegated, L3 Orchestrated,
L4 Governed autonomy. There is no "fully autonomous" level: if you cannot explain, stop and audit an
agent, you have risk, not autonomy.

**Four control planes**, each a separate question:

| Plane | Question |
|---|---|
| **Identity** | Which agent acted, and as whom? |
| **Authority** | What may it do? |
| **Enforcement** | What stops it from doing more? |
| **Evidence** | What proves it was right? |

A stage is only as mature as its **weakest** plane. Full text: [docs/framework.md](docs/framework.md) (CC BY 4.0, attribution required).

## What is in the box

| | |
|---|---|
| **Framework** | `docs/framework.md`, `docs/assessment.md`, `docs/playbook.md` |
| **Agents** | 7: an orchestrator plus one per stage (`.claude/agents/`), each written in four layers: rules, domain, technique, constraints |
| **Commands** | `/sdlc-deliver`, `/sdlc-stage`, `/sdlc-status`, `/sdlc-assess` |
| **Gates as code** | `scripts/lib/gates.mjs`: deterministic checks per stage, unit-tested |
| **Policy as code** | `sdlc.policy.json`: stage levels, human checkpoints, per-agent write scopes |
| **Enforcement** | 3 hooks + permissions: no code before an approved design, no weakened tests, no forged approvals, no push to main |
| **Evidence** | `changes/<ID>/`: six artefacts plus a gate log per change, re-checked in CI |
| **Demo app** | `app/`: an invoice quote service (AED, 5% UAE VAT) with an API, a web page and tests |
| **Worked example** | `changes/FEAT-001/`: a complete change that passes G1–G6 under framework v0 (Operate was added in v1) |
| **Open work** | `backlog/BUG-001.md`: a **real** floating-point rounding defect, ready for you to deliver |

## Quick start

Requirements: Node.js 22+, Claude Code. No npm dependencies.

```bash
git clone https://github.com/OlgaManuilova-coder/agentic-sdlc-lean.git
cd agentic-sdlc-lean
npm run control:seal -- --as <your name>   # HUMAN step: review the controls, then seal them
npm run check            # policy lint + control seal + tests incl. scenarios S1–S6 + every change's gates
npm run change:status    # FEAT-001 passes G1–G6 (v0); a human seals the control plane first: npm run control:seal
npm run assess           # maturity heat map of this repository
npm run app:start        # the demo app on http://localhost:3000
```

Then read `changes/FEAT-001/` in order (requirements → design → build → review → verification →
release). That is what one fully evidenced change looks like.

## Deliver a change end to end

`BUG-001` is real: a customer invoice of AED 20.70 shows VAT 1.03 instead of 1.04, because binary
floating point puts 20.70 × 0.05 just below the half. In Claude Code:

```
/sdlc-deliver BUG-001
```

1. **Discover:** the analyst reproduces the bug and writes ACs with exact fils, including rounding boundaries.
2. **Design:** the architect proposes a fix. **The orchestrator stops** and shows you the approval command.
3. **You approve, in your own terminal** (agents are blocked from this):
   ```bash
   npm run approve -- BUG-001 design --as olga.manuilova   # a name from sdlc.policy.json "humans"
   ```
4. **Build:** tests first. Before your approval, the hook refused every edit to `app/src/`; now it lets them through.
5. **Review:** a fresh-context reviewer sees only the artefacts, the diff and the test output.
6. **Verify:** API calls and a real browser (Playwright MCP) against every AC and the business rules.
7. **Release:** an evidence pack and a GO recommendation, then your release approval.

`npm run gates -- BUG-001` records the result in `changes/BUG-001/gates.json`.

## How the four control planes are enforced

| Plane | In a prompt it would be… | Here it is… |
|---|---|---|
| Identity | "sign your work" | G1–G7 reject an artefact signed by the wrong agent or without a human principal; G4 rejects a reviewer who is the builder |
| Authority | "only edit what you should" | `sdlc.policy.json` per-agent write scopes; settings deny edits to the policy, hooks and settings |
| Enforcement | "don't code before approval" | A **PreToolUse hook** refuses edits to `app/src/` until G2 passes; another refuses skipped tests or removed assertions; another refuses an agent writing `Approved-by` |
| Evidence | "document what you did" | Six required artefacts per change, checked by code, re-checked in CI on every push |

Each control has a unit test that proves it **blocks**: `scripts/unit/framework.test.mjs`.

## Repository layout

```
.
├── docs/                    framework · assessment · architecture · playbook
├── sdlc.policy.json         authority plane as code
├── .claude/
│   ├── agents/              orchestrator + 7 stage agents
│   ├── commands/            /sdlc-deliver /sdlc-stage /sdlc-status /sdlc-assess
│   ├── hooks/               design gate · test integrity · approval forgery
│   ├── knowledge/           shared instructions · business rules (the oracle)
│   ├── rules/               always-on rules (short)
│   └── settings.json        hooks + allow / ask / deny permissions
├── .sdlc/
│   ├── templates/           one artefact template per stage
│   └── assessment.json      maturity self-assessment of this repo
├── changes/FEAT-001/        worked example: all six artefacts + gate log
├── backlog/                 incoming requests (BUG-001 is open)
├── app/                     demo invoicing service: src · test · public
├── scripts/                 gates · change lifecycle · approve · assess · policy lint (+ unit tests)
└── .github/workflows/ci.yml policy lint · tests · gates --all · assessment
```

## Assess your own team

```
/sdlc-assess "Payments team"
```

The command interviews you stage by stage against the criteria in [docs/assessment.md](docs/assessment.md),
scores each control plane, and returns a heat map and the three highest-value next steps.

## Adapting it to your product

1. Replace `.claude/knowledge/business-rules.md` with your invariants. Everything else judges against it.
2. Point the agents at your code (`app/` → your service), and adjust each agent's Layer 2 (domain) to your stack.
3. Set `sdlc.policy.json`: your approvers, the starting levels (L2 is a safe default), write scopes.
4. Deliver real bugs with clear oracles first, measure the trust metrics, and promote stages one by one.

Step-by-step: [docs/playbook.md](docs/playbook.md).

## Companion template: agentic QA

The Verify stage uses the method of
[**agentic-qa-lean**](https://github.com/OlgaManuilova-coder/agentic-qa-lean): natural-language
test suites executed by agents in real browsers and judged against a business-rule oracle. For a product
with a large UI regression, plug it in as Verify. Its GO / NO-GO becomes the G5 evidence.

## Editions

| | **agentic-sdlc-lean** (this repository) | **Agentic SDLC Enterprise** |
|---|---|---|
| Purpose | Reference implementation: learn and evaluate the framework | Production implementation for teams and regulated organisations |
| Availability | Public, open source (Apache 2.0 code, CC BY 4.0 docs) | Proprietary, commercial licence, private |
| Stages with code-checked gates | 6 (Discover to Release) | 7, including Operate (production monitoring) |
| Human checkpoints | Fixed: every design and release | Risk-tiered: governed L4 autonomy for low risk, stricter controls for high risk |
| Risk tier recomputed from the actual change | — | ✓ |
| Security and threat-model review | — | ✓ |
| Separate agent identities, verified in CI | — | ✓ |
| Trust metrics and audit-ready evidence packs | — | ✓ |
| Control mapping for regulated industries | — | ✓ |
| Tracker and CI integrations | — | ✓ |
| Implementation support | None | Included in the engagement |

Everything in this repository is free to use under the Apache 2.0 (code) and CC BY 4.0 (documentation) licenses, with attribution (see [NOTICE](NOTICE)). Nothing in this repository grants
any right to the Enterprise edition. [Let's talk on LinkedIn](https://www.linkedin.com/in/olga-manuylova/) if you are bringing agentic
delivery to your organisation.

## Author

**Olga Manuilova**, Quality Engineering & AI Transformation Leader.
Connect on [LinkedIn](https://www.linkedin.com/in/olga-manuylova/).

## License

This repository uses two licenses:

| What | License | Requirement |
|---|---|---|
| **The framework and documentation** (`docs/`: framework, assessment, architecture, playbook) | [CC BY 4.0](LICENSE-DOCS.md) | Credit **Olga Manuilova** and link the source whenever you reuse or adapt it |
| **Code, scripts, configuration, agent and command definitions** (everything else) | [Apache 2.0](LICENSE) | Keep the copyright notice and the [NOTICE](NOTICE) file in every copy and derivative work |

Neither license extends to **Agentic SDLC Enterprise**, which is a separate, proprietary product under
its own commercial terms.

**Citing the framework:** *Agentic SDLC Framework by Olga Manuilova,
https://github.com/OlgaManuilova-coder/agentic-sdlc-lean, CC BY 4.0.*
