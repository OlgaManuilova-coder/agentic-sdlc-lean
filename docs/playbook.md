# Playbook: introducing the Agentic SDLC in a team

A practical rollout in five steps. Each step ends with a **done when** check. Earn autonomy stage by stage:
never switch everything on at once.

## Step 1: Try the full loop on the demo (1 hour)

```bash
npm install            # no runtime dependencies; this only checks Node 22+
npm run check          # policy lint + tests + every gate
npm run change:status  # FEAT-001 is complete: read changes/FEAT-001/ top to bottom
```

In Claude Code, run `/sdlc-deliver BUG-001`. The orchestrator stops at the design approval. Read
`changes/BUG-001/design.md`, then, **in your own terminal**:

```bash
npm run approve -- BUG-001 design --as olga.manuilova   # use a name from sdlc.policy.json "humans"
```

Continue with `/sdlc-deliver BUG-001`, and approve the release the same way at the end.

**Done when** BUG-001 passes G1–G7 and you have seen at least one hook block an action.

## Step 2: Baseline your team (½ day)

Run `/sdlc-assess <team>` with the tech lead and a QA lead. Expect L1 almost everywhere: that is the honest starting point for most teams.

**Done when** you have a heat map and three agreed next steps.

## Step 3: Put your product in (1–2 days)

1. Replace `app/` with your service, or point the agents at your repository.
2. Rewrite `.claude/knowledge/business-rules.md` with your invariants (`BL-<DOMAIN>-NNN`, with severities). This is the most valuable hour of the rollout.
3. Set `sdlc.policy.json`: your human approvers, the starting level per stage (L2 is a safe default), and write scopes per agent.
4. Adjust the agents' Layer 2 (domain) to your stack. Leave Layers 1, 3 and 4 alone at first.

**Done when** `npm run check` is green on your code.

## Step 4: Run real work at L2, then L3 (2–4 weeks)

1. Start with **bugs that have a clear oracle** (calculations, validation, API contracts). They give agents objective feedback.
2. Keep a human approval on design and release.
3. Track the trust metrics from `docs/framework.md` §4: gate first-pass rate, human override rate, unchanged-merge rate.
4. When a stage holds its metrics, promote it (L2 → L3) in the policy. The policy change is reviewed like code.

**Done when** ten changes have gone through with complete evidence and stable metrics.

## Step 5: Scale and govern

- Add stages your organisation needs (security review, threat modelling, Operate), each with an agent, a gate and an artefact.
- Introduce **L4** only for a defined low-risk change class, with an evidence pack your auditors accept.
- Review quarterly: promote, hold or demote each stage on the metrics.

## Anti-patterns to watch

| Symptom | Fix |
|---|---|
| People approve designs without reading them | Shorter designs (one screen), and approval comments required |
| Agents fight the hooks | Good: the hooks work. Fix the stage instructions, never the hook |
| The reviewer always says APPROVE | Check that it really runs in a fresh context; give it the rules and the edge-case list |
| Gates pass but production breaks | Your rules or your Verify stage are too weak. Add the missed behaviour as a rule, then as an AC |
| "Let's skip the gates for this urgent fix" | Use the same gates, with a smaller change. Urgency is when controls matter most |

---
*Part of the Agentic SDLC Framework © 2026 Olga Manuilova, licensed under [CC BY 4.0](../LICENSE-DOCS.md).*
