// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Gates as code, framework v1 (docs/v1-spec.md). Each gate checks one stage's artefact in changes/<ID>/
// against the exit criteria and the policy (sdlc.policy.json). Pure functions over text and a context, so
// they are unit-testable and give the same answer whoever runs them, human or agent.
// Every cross-cutting requirement (CR-01..CR-10) is enforced by at least one check below; each check names
// its requirement in the message. Changes listed in policy "legacyChanges" are judged by the frozen v0 rules.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isControlPath, sealProblems, sha } from './integrity.mjs';
import { APPROVAL_SECTION, addDays, approvalDigest } from './approval.mjs';
import { manifestProblems } from './manifest.mjs';
import { baseRef, branchPaths, existsInBase, normPath } from './gitfacts.mjs';
import { CHECKS_V0 } from './gates-v0.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GATE_ORDER = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
/** Gates that must pass before a change counts as released. G7 (Operate) follows the release. */
export const RELEASE_GATES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
export const ARTEFACT_FOR = { G1: 'requirements.md', G2: 'design.md', G3: 'build.md', G4: 'review.md', G5: 'verification.md', G6: 'release.md', G7: 'operate.md' };
const EXTRA_ARTEFACTS = ['security.md', 'manifest.json'];
/** Problems that only a human decision can clear start with this marker; the gate is AWAITING_HUMAN, not FAIL. */
export const AWAIT = 'awaiting human: ';

export const CHANGE_CLASSES = ['feature', 'bugfix', 'hotfix', 'security', 'control'];
export const DATA_CLASSES = ['public', 'internal', 'personal', 'financial'];
export const SOURCE_TRUST = ['authoritative', 'advisory', 'untrusted', 'generated'];
export const VERIFICATION_KINDS = ['deterministic', 'api', 'browser', 'static', 'security', 'eval', 'adversarial', 'production'];

// ---------- loading ----------

export function loadPolicy(root = ROOT) {
  return JSON.parse(readFileSync(join(root, 'sdlc.policy.json'), 'utf8'));
}

const rulesFile = (root) => join(root, '.claude', 'knowledge', 'business-rules.md');

export function loadRuleIds(root = ROOT) {
  const text = readFileSync(rulesFile(root), 'utf8');
  return new Set([...text.matchAll(/^\|\s*(BL-[A-Z]+-\d{3})\s*\|/gm)].map((m) => m[1]));
}

/** Short digest of the business rules: the "Rules-version" a change records at Discover (CR-02). */
export function rulesVersion(root = ROOT) {
  return sha(readFileSync(rulesFile(root), 'utf8')).slice(0, 12);
}

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);

// ---------- markdown helpers ----------

/** Split markdown into { headingText: body } for "## " headings. */
export function sections(md) {
  const out = {};
  let current = null;
  for (const line of String(md).split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = h[1];
      out[current] = '';
    } else if (current) out[current] += line + '\n';
  }
  return out;
}

export const stripComments = (s) => String(s || '').replace(/<!--[\s\S]*?-->/g, '').trim();
// [ \t]* (not \s*) so an empty field never swallows the next line.
export const field = (body, name) => (stripComments(body).match(new RegExp(`^-[ \\t]*${name}:[ \\t]*(.*)$`, 'mi')) || [])[1]?.trim() || '';
/**
 * A placeholder left in a requirement: "…", "...", TBD, TODO, xxx, or a template slot like <fill in later>.
 * Code spans are ignored, and real markup (<img src=x>, <script>) is not a placeholder: requirements about
 * HTML must be able to quote it.
 */
export function isPlaceholder(text) {
  const t = String(text).replace(/`[^`]*`/g, '');
  return /…|\.\.\.|\bTBD\b|\bTODO\b|\bxxx\b/i.test(t) || /<\s*(fill|tbd|todo|placeholder|insert|describe|your|value|enter|add)\b[^>]*>/i.test(t);
}

const firstWord = (body) => (stripComments(body).match(/^\s*([\w-]+)/) || [])[1]?.toLowerCase() || '';

function requireSections(md, names, problems) {
  const s = sections(md);
  for (const n of names) {
    if (!(n in s)) problems.push(`missing section "## ${n}"`);
    else if (!stripComments(s[n]).replace(/```/g, '').trim()) problems.push(`section "## ${n}" is empty`);
  }
  return s;
}

export function acIds(requirementsMd) {
  return [...String(requirementsMd).matchAll(/^-\s*\*\*(AC-\d+)\*\*/gm)].map((m) => m[1]);
}

export const changeClass = (requirementsMd) => firstWord(sections(requirementsMd)['Change class']) || 'feature';

/**
 * The paths a change really touches. build.md lists them, but an agent writes build.md, so when the change is
 * in flight on a git branch the branch diff against the base is authoritative: anything changed but not listed
 * is a problem, and tier, budget and control-plane checks use the union (independent review finding B1).
 */
export function effectivePaths(ctx) {
  const listed = changedPaths(ctx.artefacts['build.md'] || '', ctx.root);
  if (!ctx.branch || !ctx.inFlight) return { listed, actual: null, unlisted: [], all: listed };
  const own = `changes/${ctx.id}/`;
  // Requests (backlog/) are not product changes; whether a follow-up request is legitimate is checked against
  // the base branch separately (G6).
  const actual = ctx.branch.filter((p) => !p.startsWith(own) && !p.startsWith('backlog/') && p !== '.sdlc/current-change');
  const unlisted = actual.filter((p) => !listed.includes(p));
  return { listed, actual, unlisted, all: [...new Set([...listed, ...actual])] };
}

// ---------- risk tiers (full edition) ----------

const TIER_ORDER = (policy) => policy.riskTiers?._order || ['low', 'standard', 'high'];

/** The tier declared in requirements.md "## Risk tier" (first word), or '' if absent. */
export function declaredTier(requirementsMd) {
  return firstWord(sections(requirementsMd)['Risk tier']);
}

/** Paths listed in build.md "## Changes" as `backticked` repo paths. */
export function changedPaths(buildMd, root = null) {
  // A repository path never starts with "/" (`/api/quote` is a route, not a file). A bare file name without a
  // folder (`security.md`) counts only when that file exists at the repository root: otherwise it is a mention
  // of another artefact, not a change (found live on IDEM-001, BUG-002 and HOT-001).
  return [...stripComments(sections(buildMd)['Changes'] || '').matchAll(/`([^`\s/][^`\s]*\/[^`\s]*|[^`\s/]+\.[a-z]{2,4})`/g)]
    .map((m) => normPath(m[1]))
    .filter((p) => p.includes('/') || !root || existsSync(join(root, p)));
}

/** Highest tier any path falls into (unmatched paths count as "standard"). */
export function computedTier(paths, policy) {
  const order = TIER_ORDER(policy);
  let best = paths.length ? 'low' : '';
  for (const path of paths.map(normPath)) {
    let tier = 'standard';
    for (const t of order) if ((policy.riskTiers[t].paths || []).some((pre) => path.startsWith(pre))) tier = t;
    if (order.indexOf(tier) > order.indexOf(best)) best = tier;
  }
  return best;
}

/**
 * Does this stage need a human decision for this change? Hotfix, security and control changes always do, for
 * design and release (CR-09, CR-07, CR-04), whatever their tier. Otherwise: humanApproval true | false | "by-tier".
 */
export function needsHuman(stage, policy, tier, cls = 'feature') {
  if (['hotfix', 'security', 'control'].includes(cls) && ['design', 'release'].includes(stage)) return true;
  const h = policy.stages[stage].humanApproval;
  if (h !== 'by-tier') return Boolean(h);
  return policy.riskTiers?.[tier || 'high']?.humanApproval?.[stage] ?? true; // unknown tier ⇒ safest
}

const isFull = (policy) => policy.edition === 'full';

// ---------- cross-cutting checks ----------

/** CR-03 identity, mandate and authority on a sign-off; CR-05 tools allowed for the stage. */
function checkSignOff(s, stage, ctx, problems) {
  const { policy } = ctx;
  const body = s['Sign-off'] || '';
  const expected = policy.stages[stage].agent;
  const agent = field(body, 'Agent');
  const date = field(body, 'Date');
  if (agent !== expected) problems.push(`Sign-off agent must be "${expected}" (found "${agent || 'none'}")`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push('Sign-off date must be YYYY-MM-DD');
  const principal = field(body, 'Principal');
  if (!principal) problems.push('CR-03: Sign-off must name the "Principal" (the human this agent acts for)');
  else if (!(policy.humans || []).includes(principal)) problems.push(`CR-03: principal "${principal}" is not a human listed in sdlc.policy.json "humans"`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && ctx.today && date > ctx.today) problems.push(`CR-03: sign-off date ${date} is in the future`);
  const designApproval = field(sections(ctx.artefacts['design.md'] || '').Approval || '', 'Date');
  if (designApproval && date && !['discover', 'design'].includes(stage) && date < designApproval)
    problems.push(`CR-03: the ${stage} sign-off (${date}) predates the design approval (${designApproval}): work cannot be authorised retroactively`);
  if (isFull(policy)) {
    const run = field(body, 'Run');
    if (!/^run-[\w-]+$/.test(run)) problems.push('CR-03: Sign-off must carry a "Run" id (run-…) so every action traces to one agent run');
    // Revocation is judged by when the work was ACCEPTED (the human release decision), or by today while it is
    // not accepted yet, never by the date the agent wrote on its own sign-off (review finding M1).
    const accepted = field(sections(ctx.artefacts['release.md'] || '').Approval || '', 'Date');
    const judgedAt = accepted || ctx.today;
    for (const r of ctx.revocations?.revoked || []) {
      const hit = (r.run && r.run === run) || (r.agent && r.agent === agent && !r.run);
      if (hit && judgedAt >= r.at) problems.push(`CR-03: authority revoked for ${r.run || r.agent} on ${r.at} (${r.reason}); work not accepted before then is not valid`);
    }
    const ttl = policy.mandate?.ttlDays;
    if (ttl && designApproval && !['discover', 'design'].includes(stage) && judgedAt > addDays(designApproval, ttl))
      problems.push(`CR-03: mandate expired: the design was approved on ${designApproval} and the mandate lasts ${ttl} days; a human re-approves the design`);
  }
  const tools = field(body, 'Tools');
  const required = isFull(policy) && ['build', 'verify'].includes(stage);
  if (!tools && required) problems.push('CR-05: Sign-off must list the "Tools" used');
  for (const t of tools.split(/[,\s]+/).filter(Boolean)) {
    const def = ctx.tools?.tools?.[t];
    if (!def) problems.push(`CR-05: tool "${t}" is not in the tool inventory (.sdlc/tools.json)`);
    else if (!(def.stages || []).includes(stage)) problems.push(`CR-05: tool "${t}" is not allowed in the ${stage} stage`);
  }
  return agent;
}

/** CR-08: a human decision bound to the exact content, unexpired, by a listed human. */
function checkHumanDecision(stage, ctx, problems) {
  const { policy, artefacts } = ctx;
  const [file, section] = APPROVAL_SECTION[stage];
  const body = sections(artefacts[file] || '')[section];
  if (body === undefined) return problems.push(`${AWAIT}missing section "## ${section}" in ${file}`);
  const who = field(body, 'Approved-by');
  const agents = new Set(Object.keys(policy.authority || {}));
  if (!who) return problems.push(`${AWAIT}"${section}" is empty: a human approves with \`npm run approve -- <ID> ${stage} --as <name>\``);
  if (agents.has(who)) return problems.push(`"${who}" is an agent; this decision needs a human`);
  if (!(policy.humans || []).includes(who)) return problems.push(`"${who}" is not listed in sdlc.policy.json "humans"`);
  const date = field(body, 'Date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push('approval date must be YYYY-MM-DD');
  const digest = field(body, 'Digest');
  if (!digest) problems.push(`${AWAIT}CR-08: the approval is not bound to content (no Digest): approve again with \`npm run approve\``);
  else if (digest !== approvalDigest(stage, artefacts))
    problems.push(`${AWAIT}CR-08: the approved content changed after approval (digest mismatch): a human must re-approve what is there now`);
  const expires = field(body, 'Expires');
  if (isFull(policy) && policy.approvalTtlDays?.[stage]) {
    // An approval must be valid when it is USED: the design when the build starts, the release when the change
    // goes live (Operate starts). Until then it is judged by today. A used approval does not expire afterwards.
    const usedBy = { design: 'build.md', release: 'operate.md', escalation: 'review.md' }[stage];
    const usedAt = field(sections(artefacts[usedBy] || '')['Sign-off'] || '', 'Date');
    const judged = usedAt && usedAt >= date ? usedAt : ctx.today;
    if (!expires) problems.push(`${AWAIT}CR-08: the approval has no expiry: approve again`);
    else if (judged > expires) problems.push(`${AWAIT}CR-08: the approval expired on ${expires} before it was used: a human re-approves under current conditions`);
  }
}

/** CR-01/CR-02: intent, non-goals, constraints, data class, sources with trust levels. */
function checkIntent(s, ctx, p) {
  const intent = s['Intent'] || '';
  if (!/^\d+$/.test(field(intent, 'Intent-version'))) p.push('CR-01: "## Intent" must carry "- Intent-version: <number>"');
  const cls = firstWord(s['Change class']);
  if (!CHANGE_CLASSES.includes(cls)) p.push(`"## Change class" must be one of ${CHANGE_CLASSES.join(' | ')} (found "${cls || 'none'}")`);
  const data = firstWord(s['Data classification']);
  if (!DATA_CLASSES.includes(data)) p.push(`CR-01: "## Data classification" must be one of ${DATA_CLASSES.join(' | ')} (found "${data || 'none'}")`);
  const sources = new Map();
  for (const l of stripComments(s['Sources']).split('\n')) {
    const m = l.match(/^-\s*(S\d+):\s*(.+)$/);
    if (!m) continue;
    const trust = SOURCE_TRUST.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(m[2]));
    if (!trust) p.push(`CR-02: source ${m[1]} must state its trust: ${SOURCE_TRUST.join(' | ')}`);
    sources.set(m[1], trust);
  }
  if (!sources.size) p.push('CR-02: "## Sources" must list sources as "- S1: <where> — <trust> — <version or date>"');
  if (isFull(ctx.policy) && !/^[0-9a-f]{12}$/.test(field(s['Sources'], 'Rules-version')))
    p.push('CR-02: "## Sources" must record "- Rules-version: <12 hex>" (`npm run rules:version`)');
  return sources;
}

/** CR-10: the reviewer explains the change in their own words. */
export function explanationProblems(explanation, buildMd) {
  const text = stripComments(explanation);
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  if (words.length < 40) out.push(`CR-10: "## Explanation" has ${words.length} words; explain the root cause or behaviour, what could break and why the tests prove it (40+ words)`);
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Word 6-grams: punctuation changes cannot hide a copy (review finding m1).
  const grams = (t) => {
    const w = norm(t).split(' ').filter(Boolean);
    return new Set(w.slice(0, Math.max(0, w.length - 5)).map((_, i) => w.slice(i, i + 6).join(' ')));
  };
  const mine = grams(text);
  const theirs = grams(stripComments(buildMd));
  const shared = [...mine].filter((g) => theirs.has(g)).length;
  if (mine.size && shared / mine.size >= 0.25)
    out.push(`CR-10: the explanation copies the builder (${Math.round((100 * shared) / mine.size)} % of its phrases appear in build.md); explain in your own words`);
  return out;
}

/** CR-09: a rolled-back release must prove recovery, not just a successful deployment. */
export function rollbackProblems(operateMd) {
  const s = sections(operateMd);
  const out = [];
  if (!field(s['Rollback'] || '', 'Trigger')) out.push('CR-09: "## Rollback" must state the objective "Trigger"');
  if (!field(s['Rollback'] || '', 'Rollback-verified')) out.push('CR-09: "## Rollback" must give "Rollback-verified" evidence that the previous behaviour is restored');
  if (!stripComments(s['Incident'] || '')) out.push('CR-09: a rolled-back release needs an "## Incident" record');
  if (!field(s['Rollback'] || '', 'Re-entry')) out.push('CR-09: "## Rollback" must name the "Re-entry" change that brings the fix back through the SDLC');
  return out;
}

// ---------- gates ----------

/** Each checker: (text, ctx) => problems[]; ctx = { policy, rules, artefacts, root, today, history, tools, revocations, dependencies, backlogIds, rulesVersion } */
export const CHECKS = {
  G1(md, ctx) {
    const { rules, policy } = ctx;
    const p = [];
    const names = ['Request', 'Intent', 'Non-goals', 'Constraints', 'Data classification', 'Sources', 'Change class', 'Acceptance criteria', 'Open questions', 'Sign-off'];
    const s = requireSections(md, names, p);
    const sources = checkIntent(s, ctx, p);
    if (firstWord(s['Change class']) === 'bugfix' && !stripComments(s['Reproduction']))
      p.push('a bugfix needs "## Reproduction": the steps and the observed wrong result, reproduced before any fix (S2)');
    const lines = stripComments(s['Acceptance criteria'] || '').split('\n').filter((l) => /^-\s*\*\*AC-\d+\*\*/.test(l));
    if (!lines.length) p.push('no acceptance criteria (lines like "- **AC-1** Given … When … Then … (BL-…)")');
    for (const l of lines) {
      const id = l.match(/AC-\d+/)[0];
      if (!/\bGiven\b[\s\S]*\bWhen\b[\s\S]*\bThen\b/i.test(l)) p.push(`${id}: needs Given / When / Then`);
      const refs = [...l.matchAll(/\b(BL-[A-Z]+-\d{3}|NEW)\b/g)].map((m) => m[1]);
      if (!refs.length) p.push(`${id}: must cite a rule id or NEW`);
      for (const r of refs) if (r !== 'NEW' && !rules.has(r)) p.push(`${id}: rule ${r} does not exist in business-rules.md`);
      if (isPlaceholder(l)) p.push(`${id}: contains a placeholder`);
      const cited = [...l.matchAll(/\b(S\d+)\b/g)].map((m) => m[1]);
      const ruled = refs.some((r) => r !== 'NEW');
      if (!ruled && cited.length && cited.every((c) => sources.get(c) === 'untrusted'))
        p.push(`CR-02: ${id} rests only on untrusted sources (${cited.join(', ')}): confirm it with a rule or a human before it becomes a requirement`);
    }
    const proposed = stripComments(s['Proposed rules']);
    if (lines.some((l) => /\bNEW\b/.test(l)) && (proposed.length < 20 || isPlaceholder(proposed)))
      p.push('CR-02: an AC cites NEW: write the proposed rule text in "## Proposed rules" for a human to merge (memory writes are governed)');
    const dup = acIds(md).filter((x, i, a) => a.indexOf(x) !== i);
    if (dup.length) p.push(`duplicate AC ids: ${[...new Set(dup)].join(', ')}`);
    if (stripComments(s['Open questions'] || '').toLowerCase() !== 'none') p.push('open questions remain: requirements are not testable yet');
    if (policy.riskTiers) {
      const t = declaredTier(md);
      if (!TIER_ORDER(policy).includes(t)) p.push(`"## Risk tier" must be one of ${TIER_ORDER(policy).join(' | ')} (found "${t || 'none'}")`);
    }
    checkSignOff(s, 'discover', ctx, p);
    return p;
  },

  G2(md, ctx) {
    const { policy, artefacts } = ctx;
    const p = [];
    const names = ['Approach', 'Impact', 'Risks', 'Security & threat model', 'Tool plan', 'Autonomy budget', 'Rollback & recovery', 'Human decision points', 'Test strategy', 'Sign-off'];
    if (isFull(policy)) names.splice(5, 0, 'Context & dependencies');
    const sensitive = ['personal', 'financial'].includes(firstWord(sections(artefacts['requirements.md'] || '')['Data classification']));
    if (sensitive) names.splice(4, 0, 'Data protection');
    const s = requireSections(md, names, p);
    const strategy = stripComments(s['Test strategy']);
    for (const id of acIds(artefacts['requirements.md'] || '')) if (!new RegExp(`\\b${id}\\b`).test(strategy)) p.push(`CR-01: ${id} is not covered by the test strategy`);
    const budget = s['Autonomy budget'] || '';
    for (const f of ['Max files', 'Max retries']) if (!/^\d+$/.test(field(budget, f))) p.push(`CR-03: "## Autonomy budget" must set "- ${f}: <number>"`);
    // Tool names are backticked; scopes and commands are plain text. Only tool-shaped tokens are checked.
    for (const t of stripComments(s['Tool plan']).match(/`(mcp__[\w-]+|[A-Z][A-Za-z0-9]+|git)`/g) || []) {
      const name = t.slice(1, -1);
      if (ctx.tools?.tools && !ctx.tools.tools[name]) p.push(`CR-05: tool plan names "${name}", which is not in .sdlc/tools.json`);
    }
    if (isFull(policy)) {
      const maxFiles = Number(field(budget, 'Max files'));
      const tierMax = policy.riskTiers?.[declaredTier(artefacts['requirements.md'] || '')]?.maxFiles;
      if (tierMax && maxFiles > tierMax) p.push(`CR-03: the autonomy budget allows ${maxFiles} files; the tier allows at most ${tierMax}`);
    }
    checkSignOff(s, 'design', ctx, p);
    const req = artefacts['requirements.md'] || '';
    if (needsHuman('design', policy, declaredTier(req), changeClass(req))) checkHumanDecision('design', ctx, p);
    return p;
  },

  G3(md, ctx) {
    const { policy, artefacts } = ctx;
    const p = [];
    const s = requireSections(md, ['Changes', 'Tests added', 'Failing before', 'Passing after', 'Security checks', 'Sign-off'], p);
    const cls = changeClass(artefacts['requirements.md'] || '');
    if (s['Failing before'] !== undefined && cls !== 'control' && !/(fail|not ok|AssertionError|✖)/i.test(s['Failing before']))
      p.push('"Failing before" shows no failing test: the new tests must fail before the fix');
    if (s['Passing after'] !== undefined && /(# fail [1-9]|not ok|✖)/i.test(s['Passing after'])) p.push('"Passing after" still shows failures');
    if (s['Security checks'] !== undefined && !/security:scan OK/.test(s['Security checks'])) p.push('CR-07: "## Security checks" must show a passing `npm run security:scan`');
    const paths = effectivePaths(ctx);
    if (paths.unlisted.length) p.push(`CR-01: the branch changes files that build.md does not list: ${paths.unlisted.join(', ')}. List every changed file`);
    const control = paths.all.filter((x) => isControlPath(x, policy));
    if (control.length && cls !== 'control')
      p.push(`CR-04: a ${cls} change touched the control plane (${control.join(', ')}). The agent may not change the controls that constrain it; use change class "control"`);
    if (isFull(policy)) {
      const max = Number(field(sections(artefacts['design.md'] || '')['Autonomy budget'] || '', 'Max retries')) || policy.autonomy?.defaultMaxRetries || 3;
      const failed = (ctx.history || []).filter((h) => h.status?.G3 === 'FAIL').length;
      if (failed >= max) {
        const esc = [];
        checkHumanDecision('escalation', ctx, esc);
        if (esc.length) p.push(`${AWAIT}CR-03: retry budget exhausted (${failed} failed build attempts, budget ${max}): a human reviews and approves an escalation (\`npm run approve -- <ID> escalation\`)`);
      }
    }
    checkSignOff(s, 'build', ctx, p);
    return p;
  },

  G4(md, ctx) {
    const { policy, artefacts } = ctx;
    const p = [];
    const s = requireSections(md, ['Blocking', 'Rule check', 'Explanation', 'Sign-off'], p);
    const verdict = (md.match(/\*\*Verdict:\*\*\s*([A-Z_]+)/) || [])[1];
    if (verdict !== 'APPROVE') p.push(`Verdict must be APPROVE (found ${verdict || 'none'})`);
    if (stripComments(s['Blocking'] || '').toLowerCase() !== 'none') p.push('blocking findings are open');
    if (s['Explanation'] !== undefined) p.push(...explanationProblems(s['Explanation'], artefacts['build.md'] || ''));
    const reviewer = checkSignOff(s, 'review', ctx, p);
    const builder = field(sections(artefacts['build.md'] || '')['Sign-off'] || '', 'Agent');
    if (policy.stages.review.independent && reviewer && reviewer === builder) p.push('CR-07: reviewer is the same agent as the builder: review is not independent');
    const req = artefacts['requirements.md'] || '';
    const tier = declaredTier(req);
    const sensitive = ['personal', 'financial'].includes(firstWord(sections(req)['Data classification']));
    if (policy.riskTiers?.[tier]?.securityReview || (isFull(policy) && (['control', 'security'].includes(changeClass(req)) || sensitive))) {
      const sec = artefacts['security.md'];
      const why = ['control', 'security'].includes(changeClass(req)) ? `a ${changeClass(req)} change` : sensitive && !policy.riskTiers?.[tier]?.securityReview ? 'personal or financial data' : `risk tier "${tier}"`;
      if (!sec) p.push(`CR-07: ${why} requires security.md (security-reviewer)`);
      else {
        const ss = sections(sec);
        const v = (sec.match(/\*\*Verdict:\*\*\s*([A-Z]+)/) || [])[1];
        if (v !== 'PASS') p.push(`CR-07: security verdict must be PASS (found ${v || 'none'})`);
        if (stripComments(ss['Findings'] || '').toLowerCase() !== 'none') p.push('CR-07: security findings are open');
        if (!stripComments(ss['Threats considered'] || '')) p.push('security.md: "## Threats considered" is empty');
        const secAgent = field(ss['Sign-off'] || '', 'Agent');
        if (secAgent !== policy.stages.review.securityAgent) p.push(`security.md must be signed by "${policy.stages.review.securityAgent}"`);
      }
    }
    return p;
  },

  G5(md, ctx) {
    const { policy, artefacts } = ctx;
    const p = [];
    const names = ['Evidence', 'Rule check', 'Sign-off'];
    if (isFull(policy)) names.splice(1, 0, 'Verification paths');
    const s = requireSections(md, names, p);
    const rows = [...stripComments(s['Evidence'] || '').matchAll(/^\|\s*(AC-\d+)\s*\|([^|]*)\|([^|]*)\|\s*([A-Z]+)\s*\|/gm)];
    const verified = new Map(rows.map((r) => [r[1], { evidence: r[3].trim(), result: r[4] }]));
    for (const id of acIds(artefacts['requirements.md'] || '')) {
      const v = verified.get(id);
      if (!v) p.push(`CR-01: ${id}: no verification row`);
      else {
        if (v.result !== 'PASS') p.push(`${id}: result is ${v.result}`);
        if (!v.evidence) p.push(`${id}: evidence column is empty`);
      }
    }
    if (/\bFAIL\b|\bviolation(s)? found\b/i.test(stripComments(s['Rule check'] || ''))) p.push('rule check reports a violation');
    if (isFull(policy)) {
      const kinds = new Set(VERIFICATION_KINDS.filter((k) => new RegExp(`^-\\s*${k}\\b`, 'mi').test(stripComments(s['Verification paths']))));
      const need = policy.verification?.minPaths?.[declaredTier(artefacts['requirements.md'] || '')] ?? 1;
      if (kinds.size < need) p.push(`CR-07: ${kinds.size} independent verification path(s); this tier needs ${need} (${VERIFICATION_KINDS.join(', ')})`);
    }
    checkSignOff(s, 'verify', ctx, p);
    return p;
  },

  G6(md, ctx) {
    const { policy, artefacts } = ctx;
    const p = [];
    const req = artefacts['requirements.md'] || '';
    const cls = changeClass(req);
    const names = ['Evidence pack', 'Risk', 'Rollback', 'Sign-off'];
    if (cls === 'hotfix') names.splice(3, 0, 'Follow-up');
    const s = requireSections(md, names, p);
    const decision = (md.match(/\*\*Decision:\*\*\s*([A-Z-]+)/) || [])[1];
    if (decision !== 'GO') p.push(`Decision must be GO (found ${decision || 'none'})`);
    checkSignOff(s, 'release', ctx, p);
    const declared = declaredTier(req);
    const { all: paths, unlisted } = effectivePaths(ctx);
    if (unlisted.length) p.push(`CR-01: files changed on the branch but not listed in build.md: ${unlisted.join(', ')}`);
    if (policy.riskTiers) {
      const actual = computedTier(paths, policy);
      const order = TIER_ORDER(policy);
      if (policy.enforcement?.riskTierCannotBeUnderDeclared && order.indexOf(actual) > order.indexOf(declared))
        p.push(`risk tier under-declared: changed paths make it "${actual}", requirements say "${declared}"`);
    }
    const budget = Number(field(sections(artefacts['design.md'] || '')['Autonomy budget'] || '', 'Max files')) || Infinity;
    const tierMax = policy.riskTiers?.[declared]?.maxFiles || Infinity;
    const max = Math.min(budget, tierMax);
    if (paths.length > max) p.push(`CR-03: ${paths.length} files changed exceeds the autonomy budget of ${max}`);
    if (cls === 'hotfix') {
      const ids = (stripComments(s['Follow-up']).match(/\b[A-Z]+-\d{3}\b/g) || []);
      if (!ids.length) p.push('CR-09: a hotfix must name its follow-up change (full validation) in "## Follow-up"');
      for (const id of ids) {
        if (!ctx.backlogIds.has(id)) p.push(`CR-09: follow-up ${id} is not in the backlog (backlog/${id}.md)`);
        else if (ctx.base && existsInBase(ctx.root, ctx.base, `backlog/${id}.md`) === false)
          p.push(`CR-09: follow-up ${id} must already exist on the base branch (requested by a human), not be created by this change`);
      }
    }
    p.push(...manifestProblems(artefacts['manifest.json'], artefacts, ctx.root).map((x) => `CR-06: ${x}`));
    if (isFull(policy)) {
      const recorded = field(sections(req)['Sources'] || '', 'Rules-version');
      if (recorded && ctx.rulesVersion && recorded !== ctx.rulesVersion)
        p.push(`CR-02: stale context: business rules changed since Discover (recorded ${recorded}, now ${ctx.rulesVersion}); re-validate the requirements against the current rules`);
      let manifest = {};
      try {
        manifest = JSON.parse(artefacts['manifest.json'] || '{}');
      } catch {}
      for (const dep of [...(manifest.models || []).map((m) => `model:${m}`), ...(manifest.tools || []).map((t) => `tool:${t}`)]) {
        const d = ctx.dependencies?.dependencies?.[dep] || ctx.dependencies?.dependencies?.[dep.replace(/^tool:/, '')];
        if (!d) p.push(`CR-06: dependency "${dep}" is not in .sdlc/dependencies.json`);
        else if (!d.fallback) p.push(`CR-06: dependency "${dep}" has no fallback`);
        else if (!d.fallbackTestedAt || (field(s['Approval'] || '', 'Date') || ctx.today) > addDays(d.fallbackTestedAt, policy.dependencies?.fallbackMaxAgeDays || 90))
          p.push(`CR-06: the fallback for "${dep}" has not been tested in the last ${policy.dependencies?.fallbackMaxAgeDays || 90} days`);
      }
    }
    if (needsHuman('release', policy, declared, cls)) checkHumanDecision('release', ctx, p);
    return p;
  },

  G7(md, ctx) {
    const { policy } = ctx;
    const p = [];
    const s = requireSections(md, ['Watch window', 'Signals checked', 'New error signatures', 'Sign-off'], p);
    const health = (md.match(/\*\*Health:\*\*\s*([A-Z_]+)/) || [])[1];
    if (health === 'ROLLED_BACK') {
      p.push('CR-09: the release was rolled back: the change is not live');
      p.push(...rollbackProblems(md));
    } else if (health !== 'HEALTHY') p.push(`Health must be HEALTHY (found ${health || 'none'})`);
    else {
      const firstLine = stripComments(s['New error signatures'] || '').split('\n')[0].trim().toLowerCase();
      if (firstLine !== 'none') p.push('new error signatures are open: triage them');
    }
    if (isFull(policy) && field(s['Signals checked'] || '', 'Evidence-capture') !== 'OK')
      p.push('CR-06: "## Signals checked" must confirm "- Evidence-capture: OK" (a healthy service with broken evidence is not healthy)');
    checkSignOff(s, 'operate', ctx, p);
    return p;
  },
};

// ---------- running the gates ----------

export function loadContext(dir, root = ROOT, { today } = {}) {
  const policy = loadPolicy(root);
  const artefacts = {};
  for (const f of [...Object.values(ARTEFACT_FOR), ...EXTRA_ARTEFACTS]) {
    const path = join(dir, f);
    if (existsSync(path)) artefacts[f] = readFileSync(path, 'utf8');
  }
  const historyFile = join(dir, 'gate-history.jsonl');
  const history = existsSync(historyFile)
    ? readFileSync(historyFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const base = baseRef(root, policy);
  const branch = branchPaths(root, base);
  const id = basename(dir);
  const backlogDir = join(root, 'backlog');
  const backlogIds = new Set(existsSync(backlogDir) ? readdirSync(backlogDir).map((f) => f.replace(/\.md$/, '')) : []);
  return {
    policy,
    id,
    base,
    branch,
    inFlight: Boolean(branch && branch.some((p) => p.startsWith(`changes/${id}/`))),
    rules: loadRuleIds(root),
    rulesVersion: rulesVersion(root),
    artefacts,
    root,
    history,
    backlogIds,
    today: today || new Date().toISOString().slice(0, 10),
    tools: readJson(join(root, '.sdlc', 'tools.json'), null),
    revocations: readJson(join(root, '.sdlc', 'revocations.json'), { revoked: [] }),
    dependencies: readJson(join(root, '.sdlc', 'dependencies.json'), null),
  };
}

/** Digest of every file of a change folder except the gate run records (used to freeze v0 changes). */
export function legacyDigest(dir) {
  const files = readdirSync(dir).filter((f) => !['gates.json', 'gate-history.jsonl'].includes(f)).sort();
  return sha(files.map((f) => `--- ${f}\n${readFileSync(join(dir, f), 'utf8')}`).join('\n'));
}

const statusOf = (problems) => (!problems.length ? 'PASS' : problems.every((x) => x.startsWith(AWAIT)) ? 'AWAITING_HUMAN' : 'FAIL');

/**
 * Check gates in order up to `upTo` (default: all). The control seal is verified first: if the control plane
 * was changed, nothing passes. After the first gate that does not pass, later gates are BLOCKED.
 */
export function checkChange(dir, { root = ROOT, upTo = 'G7', today } = {}) {
  const ctx = loadContext(dir, root, { today });
  // Legacy (v0) changes: exact top-level folder, and frozen by digest in the sealed policy (review finding M3).
  const frozen = (ctx.policy.legacyChanges || {})[ctx.id];
  const isTopLevel = resolve(dirname(dir)) === resolve(root, 'changes');
  const legacy = Boolean(frozen) && isTopLevel;
  const checks = legacy ? CHECKS_V0 : CHECKS;
  const seal = sealProblems(root, ctx.policy);
  if (legacy && frozen !== legacyDigest(dir)) seal.push(`CR-06: legacy change ${ctx.id} was modified after it was frozen: v0 records are immutable`);
  const results = [];
  let blocked = false;
  for (const gate of GATE_ORDER.slice(0, GATE_ORDER.indexOf(upTo) + 1)) {
    const file = ARTEFACT_FOR[gate];
    if (blocked) {
      results.push({ gate, status: 'BLOCKED', problems: ['an earlier gate has not passed'] });
      continue;
    }
    if (gate === 'G1' && seal.length) {
      results.push({ gate, status: 'FAIL', problems: seal });
      blocked = true;
      continue;
    }
    if (!(gate in ctx.policy.stages ? true : Object.values(ctx.policy.stages).some((st) => st.gate === gate))) {
      continue; // edition without this stage
    }
    if (!ctx.artefacts[file]) {
      results.push({ gate, status: 'PENDING', problems: [`${file} not written yet`] });
      blocked = true;
      continue;
    }
    const problems = checks[gate](ctx.artefacts[file], ctx);
    const status = statusOf(problems);
    results.push({ gate, status, problems, ...(legacy ? { rules: 'v0' } : {}) });
    if (status !== 'PASS') blocked = true;
  }
  return results;
}
