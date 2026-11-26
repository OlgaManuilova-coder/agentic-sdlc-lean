#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// The trust anchor (independent review findings B2, B3, M2). Local files can be rewritten by anyone with write
// access, agents included; what an agent cannot rewrite is the history of a protected base branch. Run in CI on
// every pull request, against the base branch:
//   1. control plane and seal: any change to them since the base must be committed by a human
//      (sdlc.policy.json → trust.humanEmails; signed, if trust.requireSignedHumanCommits);
//   2. human decisions: every commit that adds, changes or removes a filled approval line in changes/** must be
//      a human's commit;
//   3. gate history is append-only: no recorded gate run may be deleted or rewritten.
// It complements, and does not replace, branch protection with required CODEOWNERS review (.github/CODEOWNERS).
//   npm run trust:check [-- --base origin/main]

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { ROOT, loadPolicy } from './lib/gates.mjs';
import { SEAL_FILE, controlPaths } from './lib/integrity.mjs';
import { baseContent, baseRef, commitDiffLines, commitsSince } from './lib/gitfacts.mjs';

const APPROVAL_LINE = /^[+-][ \t]*-[ \t]*(Approved-by|Digest|Expires|Scope):[ \t]*\S/;

export function trustProblems(root, policy, base) {
  if (!base) return ['no base branch found: run in a git checkout with the base fetched (fetch-depth: 0)'];
  const humans = new Set(policy.trust?.humanEmails || policy.identities?.humanEmails || []);
  const signed = Boolean(policy.trust?.requireSignedHumanCommits);
  const isHuman = (c) => humans.has(c.email) && (!signed || c.signature === 'G');
  const who = (c) => `${c.sha.slice(0, 8)} by ${c.email}${signed ? ` (signature ${c.signature})` : ''}`;
  const out = [];
  const control = [SEAL_FILE, ...controlPaths(policy)];
  for (const c of commitsSince(root, base, control) || [])
    if (!isHuman(c)) out.push(`control plane changed in commit ${who(c)}: only a human may change or re-seal the controls`);
  for (const c of commitsSince(root, base, ['changes']) || []) {
    if (isHuman(c)) continue;
    const touched = commitDiffLines(root, c.sha, ['changes']).filter((l) => APPROVAL_LINE.test(l));
    if (touched.length) out.push(`commit ${who(c)} adds, changes or removes a human decision (${touched[0].slice(0, 60).trim()} …): only a human approves`);
  }
  const changes = join(root, 'changes');
  for (const id of existsSync(changes) ? readdirSync(changes) : []) {
    const rel = `changes/${id}/gate-history.jsonl`;
    const before = baseContent(root, base, rel);
    if (before === null) continue;
    const now = existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : '';
    if (!now.startsWith(before)) out.push(`${rel}: recorded gate runs were removed or rewritten; the history is append-only`);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const policy = loadPolicy();
  const i = process.argv.indexOf('--base');
  if (i > 0) process.env.SDLC_BASE = process.argv[i + 1];
  const base = baseRef(ROOT, policy);
  const problems = trustProblems(ROOT, policy, base);
  if (problems.length) {
    problems.forEach((p) => console.error(`✗ ${p}`));
    process.exit(1);
  }
  console.log(`trust:check OK — against ${base}: control plane and human decisions changed only by humans; gate history append-only`);
}
