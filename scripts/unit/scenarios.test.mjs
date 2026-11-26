// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Worked scenarios S1–S6, the lean edition's required set (docs/scenarios.md), as executable tests. Each scenario exercises a different control
// path, and most of them prove that a control STOPS something. They run in a sealed copy of the repository;
// human decisions are simulated there (in the real repository only a human records them).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addChange, approve, deliver, edit, gates, manifest, problemsOf, read, seal, sealedSandbox, statuses, write } from './helpers.mjs';
import { decideCommand, decideWrite } from '../../.claude/hooks/protect-control-plane.mjs';
import { decide as approvalGuard } from '../../.claude/hooks/protect-approvals.mjs';
import { decide as designGate } from '../../.claude/hooks/require-approved-design.mjs';
import { traceMatrix } from '../trace.mjs';
import { loadContext, loadPolicy } from '../lib/gates.mjs';

const ALL_PASS = Array(7).fill('PASS');
const has = (problems, re) => problems.some((p) => re.test(p));

// ---------------------------------------------------------------- Lean scenarios S1–S6

test('S1 standard feature: intent → design → build → review → verify → release → operate, all gates pass', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-001');
  deliver(d, 'FIX-001');
  assert.deepEqual(statuses(d, 'FIX-001'), ALL_PASS);
  const { artefacts } = loadContext(join(d, 'changes', 'FIX-001'), d);
  assert.ok(traceMatrix(artefacts).every((r) => r.design && r.verified), 'every AC traced from intent to evidence');
});

test('S2 bugfix: reproduction first, failing test before the fix, no weakening', () => {
  const d = sealedSandbox();
  addChange(d, 'BUG-101', { 'requirements.md': (t) => t.replace('## Change class\nfeature', '## Change class\nbugfix') });
  assert.ok(has(problemsOf(d, 'BUG-101', 'G1'), /bugfix needs "## Reproduction"/), 'no reproduction, no requirement');
  edit(d, 'BUG-101', 'requirements.md', (t) => t.replace('## Change class', '## Reproduction\nPOST 101 lines → 200 and a 4 s calculation (expected 400).\n\n## Change class'));
  edit(d, 'BUG-101', 'build.md', (t) => t.replace(/## Failing before[\s\S]*?## Passing after/, '## Failing before\n```\n# pass 9\n```\n\n## Passing after'));
  deliver(d, 'BUG-101');
  assert.ok(has(problemsOf(d, 'BUG-101', 'G3'), /no failing test/), 'a fix without a test that failed first is not proven');
});

test('S3 hotfix: shorter path, never fewer controls: human release decision and an existing follow-up', () => {
  const d = sealedSandbox();
  addChange(d, 'HOT-001', {
    'requirements.md': (t) => t.replace('## Change class\nfeature', '## Change class\nhotfix').replace('## Risk tier\nstandard', '## Risk tier\nlow'),
    'build.md': (t) => t.replace(/## Changes[\s\S]*?## Tests added/, '## Changes\n- `app/public/index.html`: hotfix\n\n## Tests added'),
  });
  approve(d, 'HOT-001', 'design');
  manifest(d, 'HOT-001');
  let g6 = problemsOf(d, 'HOT-001', 'G6');
  assert.ok(has(g6, /missing section "## Follow-up"/), 'a hotfix must name its follow-up');
  assert.ok(has(g6, /awaiting human/), 'even a LOW-tier hotfix needs a human release decision');
  edit(d, 'HOT-001', 'release.md', (t) => t.replace('**Decision:**', '## Follow-up\nFEAT-999 runs the full validation.\n\n**Decision:**'));
  manifest(d, 'HOT-001');
  approve(d, 'HOT-001', 'release');
  assert.ok(has(problemsOf(d, 'HOT-001', 'G6'), /follow-up FEAT-999 is not in the backlog/));
  writeFileSync(join(d, 'backlog', 'FEAT-999.md'), '# FEAT-999 follow-up\n');
  assert.equal(gates(d, 'HOT-001').find((r) => r.gate === 'G6').status, 'PASS');
});

test('S4 rollback: success means restoration verified, an incident and a re-entry, not "deployment succeeded"', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-004');
  deliver(d, 'FIX-004');
  edit(d, 'FIX-004', 'operate.md', (t) => t.replace('**Health:** HEALTHY', '**Health:** ROLLED_BACK'));
  let g7 = problemsOf(d, 'FIX-004', 'G7');
  assert.ok(has(g7, /not live/));
  for (const re of [/objective "Trigger"/, /Rollback-verified/, /Incident/, /Re-entry/]) assert.ok(has(g7, re), `missing ${re}`);
  edit(d, 'FIX-004', 'operate.md', (t) => t.replace('## Sign-off', '## Rollback\n- Trigger: 4xx rate 6 % > 1 % for 10 min\n- Rollback-verified: AC-2 request → 200 with totals; 4xx back to 0.2 %\n- Re-entry: FIX-005\n\n## Incident\nValid 100-line quotes rejected for 12 minutes.\n\n## Sign-off'));
  g7 = problemsOf(d, 'FIX-004', 'G7');
  assert.deepEqual(g7, ['CR-09: the release was rolled back: the change is not live'], 'a complete rollback record leaves only the honest status');
});

test('S5 rejected change: the gate blocks, failure evidence stays, weakening the gate is caught, rework passes', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-005', { 'review.md': (t) => t.replace('**Verdict:** APPROVE', '**Verdict:** CHANGES_REQUIRED').replace('## Blocking\nNone', '## Blocking\n- off-by-one: 100 lines are rejected') });
  deliver(d, 'FIX-005');
  assert.deepEqual(statuses(d, 'FIX-005'), ['PASS', 'PASS', 'PASS', 'FAIL', 'BLOCKED', 'BLOCKED', 'BLOCKED']);
  // Forcing acceptance by weakening the gate is caught on every path: the seal no longer matches.
  const lib = join(d, 'scripts', 'lib', 'gates.mjs');
  writeFileSync(lib, readFileSync(lib, 'utf8').replace("if (verdict !== 'APPROVE')", 'if (false)'));
  assert.ok(has(problemsOf(d, 'FIX-005', 'G1'), /control file modified since the seal: scripts\/lib\/gates\.mjs/));
  assert.deepEqual(statuses(d, 'FIX-005').slice(1), Array(6).fill('BLOCKED'), 'nothing passes while the control plane is modified');
});

test('S5 rework under the same criteria: fix, re-review, re-verify; the human re-approves the changed content', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-006', { 'review.md': (t) => t.replace('**Verdict:** APPROVE', '**Verdict:** CHANGES_REQUIRED').replace('## Blocking\nNone', '## Blocking\n- off-by-one') });
  deliver(d, 'FIX-006');
  edit(d, 'FIX-006', 'review.md', (t) => t.replace('**Verdict:** CHANGES_REQUIRED', '**Verdict:** APPROVE').replace('## Blocking\n- off-by-one', '## Blocking\nNone'));
  assert.ok(has(problemsOf(d, 'FIX-006', 'G6'), /changed after the manifest/), 'the evidence pack moved: manifest and approval are stale');
  manifest(d, 'FIX-006');
  assert.ok(has(problemsOf(d, 'FIX-006', 'G6'), /content changed after approval/));
  approve(d, 'FIX-006', 'release');
  assert.deepEqual(statuses(d, 'FIX-006'), ALL_PASS);
});

test('S6 control violation: a product change that touches the control plane fails G3', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-007', { 'build.md': (t) => t.replace('## Tests added', '- `sdlc.policy.json`: allow developer to write docs/\n\n## Tests added') });
  deliver(d, 'FIX-007');
  assert.ok(has(problemsOf(d, 'FIX-007', 'G3'), /CR-04: a feature change touched the control plane \(sdlc\.policy\.json\)/));
});

test('S6 control violation: raising your own authority in the policy is caught whatever tool did it', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-008');
  deliver(d, 'FIX-008');
  const pol = join(d, 'sdlc.policy.json');
  const p = JSON.parse(readFileSync(pol, 'utf8'));
  p.authority.developer.write.push('sdlc.policy.json');
  writeFileSync(pol, JSON.stringify(p, null, 2)); // as a shell, a script or an MCP tool would
  assert.ok(has(problemsOf(d, 'FIX-008', 'G1'), /control file modified since the seal: sdlc\.policy\.json/));
});

test('S6 control violation: hooks block the direct paths (edit, shell, seal) before any effect', () => {
  const policy = loadPolicy();
  for (const path of ['sdlc.policy.json', '.claude/hooks/protect-tests.mjs', '.claude/settings.json', 'scripts/lib/gates.mjs', '.sdlc/control-seal.json', 'scripts/unit/scenarios.test.mjs'])
    assert.match(decideWrite(path, policy) || '', /control-plane asset/, path);
  assert.equal(decideWrite('app/src/money.mjs', policy), null);
  for (const cmd of [`sed -i 's/true/false/' sdlc.policy.json`, 'echo {} > .claude/settings.json', 'node -e "require(\'fs\').writeFileSync(\'scripts/lib/gates.mjs\',\'\')"', 'rm .claude/hooks/protect-tests.mjs', 'git checkout -- scripts/lib/', 'npm run control:seal -- --as olga.manuilova'])
    assert.ok(decideCommand(cmd, policy), cmd);
  for (const cmd of ['npm test', 'cat sdlc.policy.json', 'git diff', 'npm run control:check']) assert.equal(decideCommand(cmd, policy), null, cmd);
});

test('S6 authority violation: an agent cannot approve, and code stays locked without a human design decision', () => {
  assert.match(approvalGuard('changes/FIX-009/design.md', { old_string: '- Approved-by:', new_string: '- Approved-by: olga.manuilova' }), /cannot fill in/);
  const d = sealedSandbox();
  addChange(d, 'FIX-009');
  writeFileSync(join(d, '.sdlc', 'current-change'), 'FIX-009\n');
  assert.match(designGate('app/src/server.mjs', d), /locked/);
  approve(d, 'FIX-009', 'design', { as: 'developer' });
  assert.ok(has(problemsOf(d, 'FIX-009', 'G2'), /is an agent/));
  approve(d, 'FIX-009', 'design');
  assert.equal(designGate('app/src/server.mjs', d), null);
});

// S7–S12 (provider failure, stale context, approval expiry, retry budget, security failure, sensitive data)
// are implemented and tested in the full edition.

test('CR-10 understanding: a copied or empty explanation fails review', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-022', { 'review.md': (t) => t.replace(/## Explanation\n[\s\S]*?\n\n## Sign-off/, '## Explanation\nReject more than 100 lines with 400 before the calculation. Looks good.\n\n## Sign-off') });
  deliver(d, 'FIX-022');
  const g4 = problemsOf(d, 'FIX-022', 'G4');
  assert.ok(has(g4, /explanation copies the builder/));
  assert.ok(has(g4, /has \d+ words; explain/));
});


test('S6 live finding: a security change always needs a human design and release decision', () => {
  const d = sealedSandbox();
  addChange(d, 'SEC-101', { 'requirements.md': (t) => t.replace('## Change class\nfeature', '## Change class\nsecurity') });
  assert.ok(has(problemsOf(d, 'SEC-101', 'G2'), /awaiting human/));
});

test('CR-02 live finding: an AC citing NEW needs the proposed rule text for a human to merge', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-030', { 'requirements.md': (t) => t.replace('(BL-API-001, S1)', '(NEW, S1)') });
  assert.ok(has(problemsOf(d, 'FIX-030', 'G1'), /cites NEW: write the proposed rule text/));
  edit(d, 'FIX-030', 'requirements.md', (t) => t.replace('## Out of scope', '## Proposed rules\n- NEW: a quote request has at most 100 lines.\n\n## Out of scope'));
  assert.equal(gates(d, 'FIX-030').find((r) => r.gate === 'G1').status, 'PASS');
});

test('CR-07 live finding: the security scan catches every HTML sink, not only "innerHTML = x"', async () => {
  const { scanText } = await import('../security-scan.mjs');
  const ids = (line) => scanText(line, 'x').map((f) => f.id);
  for (const bad of ['el.innerHTML=`<b>${x}</b>`', 'el.innerHTML = y', 'el.outerHTML += s', 'el.insertAdjacentHTML("beforeend", s)', 'document.write(s)']) assert.ok(ids(bad).length, bad);
  for (const ok of ['el.innerHTML = ""', 'el.innerHTML = "<b>hi</b>";', 'el.textContent = s']) assert.deepEqual(ids(ok), [], ok);
});

test('CR-05 live finding: the tool plan checks tool names, not the scopes written next to them', () => {
  const d = sealedSandbox();
  addChange(d, 'FIX-031', { 'design.md': (t) => t.replace(/## Tool plan\n.*\n/, '## Tool plan\nBuild: `Read`, `Edit`, `Bash` for `npm test` in `app/test/`. Verify: `Scraper9000`.\n') });
  const g2 = problemsOf(d, 'FIX-031', 'G2');
  assert.ok(has(g2, /tool plan names "Scraper9000"/));
  assert.ok(!has(g2, /npm test|app\/test/), 'scopes and commands are not tools');
});
