# Changelog

## 1.0.0 — framework v1 (spec v1.1)
- License: code moves from MIT to the **Apache License 2.0** (NOTICE attribution required by section 4(d)); documentation stays CC BY 4.0. Earlier versions remain available under MIT.
- Operate stage (G7) with the sre-operator agent and `/sdlc-operate`.
- The ten cross-cutting requirements in their lean form: intent with sources and trust, change classes (bugfix reproduction, hotfix follow-up, security), human principal on every sign-off, autonomy budget, **control plane sealed by a human and verified on every gate run**, tool inventory, execution manifest, approvals bound to content (`AWAITING_HUMAN`), `security:scan`, rollback record, reviewer explanation.
- Scenarios S1–S6 as executable tests; FEAT-001 judged by the frozen v0 rules.
- The new security scan found a real XSS pattern in the demo app (backlog SEC-001).


## 0.1.0 — initial template
- The Agentic SDLC Framework: 7 stages, 5 maturity levels, 4 control planes, gates, metrics.
- 7 agents, 4 commands, 3 enforcement hooks, gates as code, policy as code.
- Demo invoicing app with a worked example (FEAT-001) and an open bug to deliver (BUG-001).

---
*Agentic SDLC Framework (lean edition) · © 2026 Olga Manuilova*
