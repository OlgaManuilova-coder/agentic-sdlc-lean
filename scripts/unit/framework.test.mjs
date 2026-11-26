// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Unit tests for the framework's executable controls: gates, hooks, assessment, policy lint.
// Each test proves a control STOPS something, not just that the happy path passes.
// The worked example FEAT-001 was delivered under framework v0, so the gate tests here use the frozen v0
// checks; framework-v1 controls are tested in scenarios.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, checkChange, loadPolicy, loadRuleIds } from '../lib/gates.mjs';
import { CHECKS_V0 as CHECKS } from '../lib/gates-v0.mjs';
import { sealedSandbox } from './helpers.mjs';
import { decide as designGate } from '../../.claude/hooks/require-approved-design.mjs';
import { decide as testGuard } from '../../.claude/hooks/protect-tests.mjs';
import { decide as approvalGuard } from '../../.claude/hooks/protect-approvals.mjs';
import { assess, scoreStage } from '../assess.mjs';
import { lintPolicy } from '../policy-lint.mjs';

const example = (f) => readFileSync(join(ROOT, 'changes', 'FEAT-001', f), 'utf8');
const ctx = () => ({ policy: loadPolicy(), rules: loadRuleIds(), artefacts: { 'requirements.md': example('requirements.md'), 'build.md': example('build.md') } });

const sandbox = sealedSandbox;

test('the worked example FEAT-001 passes every gate', () => {
  const dir = sandbox();
  // v0 had no Operate stage: G7 is PENDING for the legacy example (operate.md was never written)
  assert.deepEqual(checkChange(join(dir, 'changes', 'FEAT-001'), { root: dir }).map((r) => r.status), ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PENDING']);
});

test('G1 rejects vague ACs, unknown rules and open questions', () => {
  const md = example('requirements.md')
    .replace('(BL-INV-004, BL-INV-006)', '(BL-INV-999)')
    .replace('- **AC-2** Given', '- **AC-2** When it works, Given')
    .replace('## Open questions\nNone', '## Open questions\nWhat about discounts?');
  const p = CHECKS.G1(md, ctx());
  assert.ok(p.some((x) => /BL-INV-999 does not exist/.test(x)));
  assert.ok(p.some((x) => /open questions remain/.test(x)));
});

test('G2 requires a HUMAN approver, not an agent and not nobody', () => {
  const unapproved = example('design.md').replace('- Approved-by: olga.manuilova', '- Approved-by:');
  assert.ok(CHECKS.G2(unapproved, ctx()).some((x) => /not approved/.test(x)));
  const byAgent = example('design.md').replace('olga.manuilova', 'developer');
  assert.ok(CHECKS.G2(byAgent, ctx()).some((x) => /is an agent/.test(x)));
});

test('G3 requires tests that failed before the fix', () => {
  const md = example('build.md').replace(/## Failing before[\s\S]*?## Passing after/, '## Failing before\n```\n# pass 6\n```\n\n## Passing after');
  assert.ok(CHECKS.G3(md, ctx()).some((x) => /no failing test/.test(x)));
});

test('G4 rejects a non-independent review and open blocking items', () => {
  const md = example('review.md').replace('- Agent: independent-reviewer', '- Agent: developer').replace('## Blocking\nNone', '## Blocking\n- money.mjs: wrong rounding');
  const p = CHECKS.G4(md, ctx());
  assert.ok(p.some((x) => /blocking findings/.test(x)));
  assert.ok(p.some((x) => /Sign-off agent must be "independent-reviewer"/.test(x)));
});

test('G5 needs a PASS row with evidence for every AC', () => {
  const md = example('verification.md').replace(/^\| AC-4 .*$/m, '');
  assert.ok(CHECKS.G5(md, ctx()).some((x) => /AC-4: no verification row/.test(x)));
});

test('G6 needs GO and a human approval', () => {
  const md = example('release.md').replace('**Decision:** GO', '**Decision:** NO-GO');
  assert.ok(CHECKS.G6(md, ctx()).some((x) => /Decision must be GO/.test(x)));
});

test('a frozen v0 change cannot be edited: it fails and blocks everything after it', () => {
  const dir = sandbox();
  const f = join(dir, 'changes/FEAT-001/design.md');
  writeFileSync(f, readFileSync(f, 'utf8').replace('- Approved-by: olga.manuilova', '- Approved-by:'));
  const r = checkChange(join(dir, 'changes/FEAT-001'), { root: dir });
  assert.deepEqual(r.map((x) => x.status), ['FAIL', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED']);
  assert.match(r[0].problems.join(' '), /legacy change FEAT-001 was modified after it was frozen/);
});

test('hook: production code is locked until the design is approved', () => {
  const dir = sandbox();
  writeFileSync(join(dir, '.sdlc/current-change'), 'FEAT-001\n');
  assert.equal(designGate('app/src/money.mjs', dir), null, 'approved design unlocks code');
  const f = join(dir, 'changes/FEAT-001/design.md');
  writeFileSync(f, readFileSync(f, 'utf8').replace('- Approved-by: olga.manuilova', '- Approved-by:'));
  assert.match(designGate('app/src/money.mjs', dir), /locked/);
  assert.equal(designGate('docs/x.md', dir), null, 'non-code paths are not gated');
});

test('hook: tests cannot be skipped, focused or stripped of assertions', () => {
  assert.match(testGuard('app/test/a.test.mjs', { new_string: "test.skip('x', () => {})" }), /skips or focuses/);
  assert.match(testGuard('app/test/a.test.mjs', { old_string: 'assert.equal(a, 1); assert.equal(b, 2);', new_string: 'assert.equal(a, 1);' }), /removes assertions/);
  assert.equal(testGuard('app/test/a.test.mjs', { old_string: '', new_string: "test('AC-1', () => { assert.equal(1, 1); })" }), null);
});

test('hook: agents cannot forge a human approval', () => {
  assert.match(approvalGuard('changes/BUG-001/design.md', { old_string: '- Approved-by:', new_string: '- Approved-by: olga.manuilova' }), /cannot fill in/);
  assert.equal(approvalGuard('changes/BUG-001/design.md', { old_string: 'x', new_string: 'y' }), null);
});

test('assessment: a stage is only as mature as its weakest control plane', () => {
  assert.deepEqual(scoreStage({ identity: 3, authority: 3, enforcement: 1, evidence: 4 }), { level: 1, weakest: ['enforcement'] });
  assert.throws(() => scoreStage({ identity: 5, authority: 0, enforcement: 0, evidence: 0 }));
  assert.equal(assess({ stages: {} }).length, 7);
});

test('policy lint catches a review stage that is not independent', () => {
  const policy = loadPolicy();
  assert.deepEqual(lintPolicy(policy), []);
  const bad = structuredClone(policy);
  bad.stages.review.independent = false;
  bad.humans = [];
  const errors = lintPolicy(bad);
  assert.ok(errors.some((e) => /independent/.test(e)));
  assert.ok(errors.some((e) => /human approver/.test(e)));
});
