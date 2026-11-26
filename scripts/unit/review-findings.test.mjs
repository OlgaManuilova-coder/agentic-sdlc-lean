// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Regression tests for the independent review of framework v1 (docs/v1-status.md, "Independent review").
// Each test replays an attack the reviewer used to get a blocked change to PASS, and proves it now fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addChange, approve, deliver, edit, gates, manifest, problemsOf, read, seal, sealedSandbox, statuses, write } from './helpers.mjs';
import { checkChange, explanationProblems, loadPolicy } from '../lib/gates.mjs';
import { decide as approvalGuard } from '../../.claude/hooks/protect-approvals.mjs';
import { decideCommand } from '../../.claude/hooks/protect-control-plane.mjs';
import { trustProblems } from '../trust-check.mjs';

const has = (problems, re) => problems.some((p) => re.test(p));
const HUMAN = 'OlgaManuilova-coder@users.noreply.github.com';
const AGENT = 'developer@agents.invalid';

/** A sealed sandbox that is a git repository: base branch "main" committed by a human, work on "feature". */
function gitSandbox() {
  const d = sealedSandbox();
  const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  g('init', '-q', '-b', 'main');
  g('-c', 'user.name=Olga', '-c', `user.email=${HUMAN}`, 'add', '-A');
  g('-c', 'user.name=Olga', '-c', `user.email=${HUMAN}`, 'commit', '-qm', 'base');
  g('checkout', '-q', '-b', 'feature');
  const commit = (email, msg) => {
    g('add', '-A');
    g('-c', 'user.name=x', '-c', `user.email=${email}`, 'commit', '-qm', msg);
  };
  return { d, g, commit };
}

test('B1: the branch diff, not build.md, decides which files changed (unlisted file, "./" path)', () => {
  const { d } = gitSandbox();
  addChange(d, 'ATK-002', {
    'build.md': (t) => t.replace(/## Changes[\s\S]*?## Tests added/, '## Changes\n- `app/public/index.html`: copy\n\n## Tests added'),
  });
  appendFileSync(join(d, 'app', 'src', 'money.mjs'), '\n// sneaky\n');
  appendFileSync(join(d, 'app', 'public', 'index.html'), '\n');
  deliver(d, 'ATK-002');
  assert.ok(has(problemsOf(d, 'ATK-002', 'G3'), /files that build\.md does not list: app\/src\/money\.mjs/));
});

test('B2: an agent cannot edit, rewrite or remove a recorded human decision (hook)', () => {
  const d = sealedSandbox();
  addChange(d, 'ATK-005');
  deliver(d, 'ATK-005');
  const path = 'changes/ATK-005/design.md';
  const text = read(d, 'ATK-005', 'design.md');
  const digest = text.match(/- Digest: .*/)[0];
  assert.match(approvalGuard(path, { old_string: digest, new_string: '- Digest: 00ff' }, d) || '', /cannot fill in, edit or remove/);
  assert.match(approvalGuard(path, { old_string: '- Expires: 2026-12-09', new_string: '- Expires: 2099-12-31' }, d) || '', /cannot/);
  assert.match(approvalGuard(path, { content: text.replace(digest, '- Digest: 00ff') }, d) || '', /recorded human decision/);
  assert.equal(approvalGuard(path, { old_string: 'Count the lines', new_string: 'Count all lines' }, d), null, 'ordinary edits pass (and void the approval)');
  assert.ok(decideCommand(`sed -i 's/Digest: .*/Digest: x/' changes/ATK-005/design.md`, loadPolicy()), 'and through the shell');
});

test('B2/B3: in CI, approvals and seal changes committed by an agent fail the trust anchor', () => {
  const { d, commit } = gitSandbox();
  addChange(d, 'ATK-006');
  commit(AGENT, 'agent work');
  approve(d, 'ATK-006', 'design');
  commit(AGENT, 'agent writes the approval itself');
  writeFileSync(join(d, 'scripts', 'lib', 'gates.mjs'), readFileSync(join(d, 'scripts', 'lib', 'gates.mjs'), 'utf8') + '\n// weakened\n');
  seal(d);
  commit(AGENT, 'agent weakens a gate and re-seals');
  const p = trustProblems(d, loadPolicy(d), 'main');
  assert.ok(has(p, /adds, changes or removes a human decision/));
  assert.ok(has(p, /control plane changed in commit .* by developer@agents\.invalid/));
});

test('B2: the same decisions committed by the human pass the trust anchor', () => {
  const { d, commit } = gitSandbox();
  addChange(d, 'ATK-007');
  commit(AGENT, 'agent work');
  approve(d, 'ATK-007', 'design');
  commit(HUMAN, 'Olga approves the design');
  assert.deepEqual(trustProblems(d, loadPolicy(d), 'main'), []);
});

test('B3: package.json, CI, agent prompts and the oracle are sealed; broad allow rules are gone', () => {
  const d = sealedSandbox();
  addChange(d, 'ATK-010');
  deliver(d, 'ATK-010');
  const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
  pkg.scripts.ship = 'node scripts/approve.mjs';
  writeFileSync(join(d, 'package.json'), JSON.stringify(pkg));
  assert.ok(has(problemsOf(d, 'ATK-010', 'G1'), /control file modified since the seal: package\.json/));
  const settings = JSON.parse(readFileSync(join(d, '.claude', 'settings.json'), 'utf8'));
  for (const broad of ['Bash(npm run *)', 'Bash(node --test *)']) assert.ok(!settings.permissions.allow.includes(broad), broad);
  assert.ok(settings.permissions.deny.includes('Bash(node --test *)'));
  for (const f of ['.github/workflows/ci.yml', '.claude/agents/developer.md', '.claude/knowledge/business-rules.md'])
    assert.ok(loadPolicy().controlPlane.paths.some((c) => f.startsWith(c) || f === c), f);
});

test('B4: changing code or tests after the manifest voids the release decision', () => {
  const d = sealedSandbox();
  addChange(d, 'ATK-001');
  deliver(d, 'ATK-001');
  assert.deepEqual(statuses(d, 'ATK-001'), Array(7).fill('PASS'));
  writeFileSync(join(d, 'app', 'test', 'server.test.mjs'), '// tests removed\n');
  assert.ok(has(problemsOf(d, 'ATK-001', 'G6'), /product code or tests \(app\/\) changed after the manifest/));
});


test('M2: in CI, truncating the gate history (to reset the retry budget) fails the trust anchor', () => {
  const { d, commit } = gitSandbox();
  addChange(d, 'ATK-009');
  for (let i = 0; i < 3; i++) appendFileSync(join(d, 'changes', 'ATK-009', 'gate-history.jsonl'), JSON.stringify({ at: `t${i}`, status: { G3: 'FAIL' } }) + '\n');
  commit(AGENT, 'three failed builds');
  execFileSync('git', ['-c', `user.email=${HUMAN}`, '-c', 'user.name=Olga', 'checkout', '-q', '-B', 'main'], { cwd: d });
  execFileSync('git', ['checkout', '-q', '-b', 'feature2'], { cwd: d });
  writeFileSync(join(d, 'changes', 'ATK-009', 'gate-history.jsonl'), '');
  commit(AGENT, 'reset the budget');
  assert.ok(has(trustProblems(d, loadPolicy(d), 'main'), /gate-history\.jsonl: recorded gate runs were removed/));
  assert.ok(decideCommand('npm run gates -- ATK-009 --no-write', loadPolicy()), 'agents cannot skip recording');
});

test('M3: a v0 change is frozen, and only the exact top-level folder is legacy', () => {
  const d = sealedSandbox();
  const nested = join(d, 'changes', 'NEW-900', 'FEAT-001');
  execFileSync('mkdir', ['-p', join(d, 'changes', 'NEW-900')]);
  execFileSync('cp', ['-r', join(d, 'changes', 'FEAT-001'), nested]);
  const r = checkChange(nested, { root: d, today: '2026-11-26' });
  assert.equal(r[0].status, 'FAIL', 'a nested copy is judged by the v1 rules, not v0');
  edit(d, 'FEAT-001', 'design.md', (t) => t + '\nPOST-APPROVAL change\n');
  assert.ok(has(problemsOf(d, 'FEAT-001', 'G1'), /legacy change FEAT-001 was modified after it was frozen/));
});

test('M4: a hotfix follow-up must already exist on the base branch, not be created by the hotfix', () => {
  const { d } = gitSandbox();
  addChange(d, 'HOT-002', {
    'requirements.md': (t) => t.replace('## Change class\nfeature', '## Change class\nhotfix'),
    'release.md': (t) => t.replace('**Decision:**', '## Follow-up\nFEAT-777 runs the full validation.\n\n**Decision:**'),
  });
  writeFileSync(join(d, 'backlog', 'FEAT-777.md'), '# made up by the agent\n');
  deliver(d, 'HOT-002');
  assert.ok(has(problemsOf(d, 'HOT-002', 'G6'), /follow-up FEAT-777 must already exist on the base branch/));
});

test('m1: a copied explanation is caught even with the punctuation changed', () => {
  const build = 'The handler now rejects requests with more than one hundred lines before any arithmetic happens, and the error message follows the API error shape.';
  const copied = build.replace(/, /g, '; ').replace(/\. /g, '; ') + ' I checked the tests and they cover both edges of the limit, which is what matters most for this change today.';
  assert.ok(has(explanationProblems(copied, build), /copies the builder/));
});

test('m2: placeholders in ACs and empty proposed rules fail Discover', () => {
  const d = sealedSandbox();
  addChange(d, 'ATK-011', {
    'requirements.md': (t) => t.replace(/- \*\*AC-2\*\*.*\n/, '- **AC-2** Given tbd, When xxx, Then <fill in later> (NEW)\n').replace('## Out of scope', '## Proposed rules\ntbd\n\n## Out of scope'),
  });
  const g1 = problemsOf(d, 'ATK-011', 'G1');
  assert.ok(has(g1, /AC-2: contains a placeholder/));
  assert.ok(has(g1, /cites NEW: write the proposed rule text/));
});

test('m3: only the approval blocks are outside the digest; "## Approval notes" is approved content', () => {
  const d = sealedSandbox();
  addChange(d, 'ATK-012', { 'design.md': (t) => t.replace('## Sign-off', '## Approval notes\nLimit agreed with finance.\n\n## Sign-off') });
  deliver(d, 'ATK-012');
  edit(d, 'ATK-012', 'design.md', (t) => t.replace('Limit agreed with finance.', 'Limit can be raised by the agent.'));
  assert.ok(has(problemsOf(d, 'ATK-012', 'G2'), /content changed after approval/));
});

test('m2 follow-up (live SEC-001): real HTML in a requirement is not a placeholder', async () => {
  const { isPlaceholder } = await import('../lib/gates.mjs');
  assert.equal(isPlaceholder('Given addLine(\'"><img src=x onerror=alert(1)>\') When the row renders Then no img element exists'), false);
  assert.equal(isPlaceholder('Then `<script>` is shown as text'), false);
  assert.equal(isPlaceholder('Then <fill in later>'), true);
  assert.equal(isPlaceholder('Given tbd'), true);
});
