// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// FROZEN: framework v0 gate checks. Changes delivered before v1 (listed in sdlc.policy.json
// "legacyChanges") are evaluated under the rules they were delivered under (CR-06 provenance).
// Never edit this file: it is the historical record of v0 acceptance logic.
// Gates as code. Each gate checks one stage's artefact in changes/<ID>/ against the framework's exit
// criteria (docs/framework.md §1) and the policy (sdlc.policy.json). Pure functions over text, so they are
// unit-testable and give the same answer whoever runs them, human or agent.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GATE_ORDER = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];

export function loadPolicy(root = ROOT) {
  return JSON.parse(readFileSync(join(root, 'sdlc.policy.json'), 'utf8'));
}

export function loadRuleIds(root = ROOT) {
  const text = readFileSync(join(root, '.claude', 'knowledge', 'business-rules.md'), 'utf8');
  return new Set([...text.matchAll(/^\|\s*(BL-[A-Z]+-\d{3})\s*\|/gm)].map((m) => m[1]));
}

/** Split markdown into { headingText: body } for "## " headings. */
export function sections(md) {
  const out = {};
  let current = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = h[1];
      out[current] = '';
    } else if (current) out[current] += line + '\n';
  }
  return out;
}

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '').trim();
// [ \t]* (not \s*) so an empty field never swallows the next line.
const field = (body, name) => (stripComments(body).match(new RegExp(`^-[ \\t]*${name}:[ \\t]*(.*)$`, 'mi')) || [])[1]?.trim() || '';

function requireSections(md, names, problems) {
  const s = sections(md);
  for (const n of names) {
    if (!(n in s)) problems.push(`missing section "## ${n}"`);
    else if (!stripComments(s[n]).replace(/```/g, '').trim()) problems.push(`section "## ${n}" is empty`);
  }
  return s;
}

function checkSignOff(s, expectedAgent, problems) {
  const agent = field(s['Sign-off'] || '', 'Agent');
  if (agent !== expectedAgent) problems.push(`Sign-off agent must be "${expectedAgent}" (found "${agent || 'none'}")`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(field(s['Sign-off'] || '', 'Date'))) problems.push('Sign-off date must be YYYY-MM-DD');
  return agent;
}

function checkHumanApproval(s, policy, problems) {
  const body = s['Approval'];
  if (body === undefined) return problems.push('missing section "## Approval"');
  const who = field(body, 'Approved-by');
  const agents = new Set(Object.keys(policy.authority || {}));
  if (!who) problems.push('not approved: "Approved-by" is empty (a human must approve this gate)');
  else if (agents.has(who)) problems.push(`"${who}" is an agent; this gate needs a human approver`);
  else if (!(policy.humans || []).includes(who)) problems.push(`"${who}" is not listed in sdlc.policy.json "humans"`);
  if (who && !/^\d{4}-\d{2}-\d{2}$/.test(field(body, 'Date'))) problems.push('Approval date must be YYYY-MM-DD');
}

export function acIds(requirementsMd) {
  return [...requirementsMd.matchAll(/^-\s*\*\*(AC-\d+)\*\*/gm)].map((m) => m[1]);
}

/** Each checker: (text, ctx) => problems[] where ctx = { policy, rules, artefacts } */
export const CHECKS_V0 = {
  G1(md, { rules }) {
    const p = [];
    const s = requireSections(md, ['Request', 'Acceptance criteria', 'Open questions', 'Sign-off'], p);
    const lines = stripComments(s['Acceptance criteria'] || '').split('\n').filter((l) => /^-\s*\*\*AC-\d+\*\*/.test(l));
    if (!lines.length) p.push('no acceptance criteria (lines like "- **AC-1** Given … When … Then … (BL-…)")');
    for (const l of lines) {
      const id = l.match(/AC-\d+/)[0];
      if (!/\bGiven\b[\s\S]*\bWhen\b[\s\S]*\bThen\b/i.test(l)) p.push(`${id}: needs Given / When / Then`);
      const refs = [...l.matchAll(/\b(BL-[A-Z]+-\d{3}|NEW)\b/g)].map((m) => m[1]);
      if (!refs.length) p.push(`${id}: must cite a rule id or NEW`);
      for (const r of refs) if (r !== 'NEW' && !rules.has(r)) p.push(`${id}: rule ${r} does not exist in business-rules.md`);
      if (/…|\.\.\.|TBD|TODO/.test(l)) p.push(`${id}: contains a placeholder`);
    }
    const dup = acIds(md).filter((x, i, a) => a.indexOf(x) !== i);
    if (dup.length) p.push(`duplicate AC ids: ${[...new Set(dup)].join(', ')}`);
    if (stripComments(s['Open questions'] || '').toLowerCase() !== 'none') p.push('open questions remain: requirements are not testable yet');
    checkSignOff(s, 'product-analyst', p);
    return p;
  },
  G2(md, { policy }) {
    const p = [];
    const s = requireSections(md, ['Approach', 'Impact', 'Risks', 'Test strategy', 'Sign-off'], p);
    checkSignOff(s, policy.stages.design.agent, p);
    if (policy.stages.design.humanApproval) checkHumanApproval(s, policy, p);
    return p;
  },
  G3(md, { policy }) {
    const p = [];
    const s = requireSections(md, ['Changes', 'Tests added', 'Failing before', 'Passing after', 'Sign-off'], p);
    if (s['Failing before'] !== undefined && !/(fail|not ok|AssertionError|✖)/i.test(s['Failing before']))
      p.push('"Failing before" shows no failing test: the new tests must fail before the fix');
    if (s['Passing after'] !== undefined && /(# fail [1-9]|not ok|✖)/i.test(s['Passing after']))
      p.push('"Passing after" still shows failures');
    checkSignOff(s, policy.stages.build.agent, p);
    return p;
  },
  G4(md, { policy, artefacts }) {
    const p = [];
    const s = requireSections(md, ['Blocking', 'Rule check', 'Sign-off'], p);
    const verdict = (md.match(/\*\*Verdict:\*\*\s*([A-Z_]+)/) || [])[1];
    if (verdict !== 'APPROVE') p.push(`Verdict must be APPROVE (found ${verdict || 'none'})`);
    if (stripComments(s['Blocking'] || '').toLowerCase() !== 'none') p.push('blocking findings are open');
    const reviewer = checkSignOff(s, policy.stages.review.agent, p);
    const builder = field(sections(artefacts['build.md'] || '')['Sign-off'] || '', 'Agent');
    if (policy.stages.review.independent && reviewer && reviewer === builder) p.push('reviewer is the same agent as the builder: review is not independent');
    return p;
  },
  G5(md, { policy, artefacts }) {
    const p = [];
    const s = requireSections(md, ['Evidence', 'Rule check', 'Sign-off'], p);
    const rows = [...stripComments(s['Evidence'] || '').matchAll(/^\|\s*(AC-\d+)\s*\|([^|]*)\|([^|]*)\|\s*([A-Z]+)\s*\|/gm)];
    const verified = new Map(rows.map((r) => [r[1], { evidence: r[3].trim(), result: r[4] }]));
    for (const id of acIds(artefacts['requirements.md'] || '')) {
      const v = verified.get(id);
      if (!v) p.push(`${id}: no verification row`);
      else {
        if (v.result !== 'PASS') p.push(`${id}: result is ${v.result}`);
        if (!v.evidence) p.push(`${id}: evidence column is empty`);
      }
    }
    if (/\bFAIL\b|\bviolation(s)? found\b/i.test(stripComments(s['Rule check'] || '')) ) p.push('rule check reports a violation');
    checkSignOff(s, policy.stages.verify.agent, p);
    return p;
  },
  G6(md, { policy }) {
    const p = [];
    const s = requireSections(md, ['Evidence pack', 'Risk', 'Rollback', 'Sign-off'], p);
    const decision = (md.match(/\*\*Decision:\*\*\s*([A-Z-]+)/) || [])[1];
    if (decision !== 'GO') p.push(`Decision must be GO (found ${decision || 'none'})`);
    checkSignOff(s, policy.stages.release.agent, p);
    if (policy.stages.release.humanApproval) checkHumanApproval(s, policy, p);
    return p;
  },
};

export const ARTEFACT_FOR = { G1: 'requirements.md', G2: 'design.md', G3: 'build.md', G4: 'review.md', G5: 'verification.md', G6: 'release.md' };

/** Check gates in order up to `upTo` (default: all). Stops reporting at the first failed gate's successors. */
function checkChangeV0(dir, { root = ROOT, upTo = 'G6' } = {}) {
  const policy = loadPolicy(root);
  const rules = loadRuleIds(root);
  const artefacts = {};
  for (const f of Object.values(ARTEFACT_FOR)) {
    const path = join(dir, f);
    if (existsSync(path)) artefacts[f] = readFileSync(path, 'utf8');
  }
  const results = [];
  let blocked = false;
  for (const gate of GATE_ORDER.slice(0, GATE_ORDER.indexOf(upTo) + 1)) {
    const file = ARTEFACT_FOR[gate];
    if (blocked) {
      results.push({ gate, status: 'BLOCKED', problems: ['an earlier gate has not passed'] });
      continue;
    }
    if (!artefacts[file]) {
      results.push({ gate, status: 'PENDING', problems: [`${file} not written yet`] });
      blocked = true;
      continue;
    }
    const problems = CHECKS[gate](artefacts[file], { policy, rules, artefacts });
    results.push({ gate, status: problems.length ? 'FAIL' : 'PASS', problems });
    if (problems.length) blocked = true;
  }
  return results;
}
