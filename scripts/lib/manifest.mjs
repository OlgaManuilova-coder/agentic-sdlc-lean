// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-06 Execution Provenance. One machine-readable manifest per change: what produced it, under which
// policy and gate code, with which agents, models and tools, over which exact artefacts.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sha, sealDigest } from './integrity.mjs';
import { withoutApprovals } from './approval.mjs';

const SIGN_OFF_FIELD = (md, name) => [...String(md).matchAll(new RegExp(`^-[ \\t]*${name}:[ \\t]*(.+)$`, 'gmi'))].map((m) => m[1].trim());

/** Artefacts the manifest pins (Operate happens after release, so operate.md is not pinned). */
export const PINNED = ['requirements.md', 'design.md', 'build.md', 'review.md', 'security.md', 'verification.md', 'release.md'];

export function artefactDigests(artefacts) {
  return Object.fromEntries(PINNED.filter((f) => artefacts[f] !== undefined).map((f) => [f, sha(withoutApprovals(artefacts[f]))]));
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir).sort()) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
}

/** Digest of every file of the product (app/): code, tests and page together (review finding B4). */
export function codeDigest(root) {
  const files = walk(join(root, 'app'));
  return sha(files.map((f) => `--- ${f.slice(root.length + 1).split('\\').join('/')}\n${readFileSync(f, 'utf8')}`).join('\n'));
}

function gitCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

export function buildManifest(root, id, artefacts) {
  const policyText = readFileSync(join(root, 'sdlc.policy.json'), 'utf8');
  const policy = JSON.parse(policyText);
  const rulesFile = join(root, '.claude', 'knowledge', 'business-rules.md');
  const signers = [...new Set(Object.values(artefacts).flatMap((md) => SIGN_OFF_FIELD(md, 'Agent')))].sort();
  const agents = Object.fromEntries(signers.map((a) => {
    const f = join(root, '.claude', 'agents', `${a}.md`);
    return [a, existsSync(f) ? sha(readFileSync(f, 'utf8')) : 'missing'];
  }));
  const testDir = join(root, 'app', 'test');
  const tests = existsSync(testDir)
    ? Object.fromEntries(readdirSync(testDir).sort().map((f) => [`app/test/${f}`, sha(readFileSync(join(testDir, f), 'utf8'))]))
    : {};
  return {
    change: id,
    intentVersion: (String(artefacts['requirements.md'] || '').match(/^-[ \t]*Intent-version:[ \t]*(\S+)/mi) || [])[1] || 'unversioned',
    commit: gitCommit(root),
    policy: { version: policy.version, digest: sha(policyText) },
    controlSeal: sealDigest(root),
    rules: existsSync(rulesFile) ? sha(readFileSync(rulesFile, 'utf8')) : 'none',
    agents,
    models: [...new Set(Object.values(artefacts).flatMap((md) => SIGN_OFF_FIELD(md, 'Model')))].sort(),
    tools: [...new Set(Object.values(artefacts).flatMap((md) => SIGN_OFF_FIELD(md, 'Tools').flatMap((t) => t.split(/[,\s]+/)).filter(Boolean)))].sort(),
    runs: [...new Set(Object.values(artefacts).flatMap((md) => SIGN_OFF_FIELD(md, 'Run')))].sort(),
    principals: [...new Set(Object.values(artefacts).flatMap((md) => SIGN_OFF_FIELD(md, 'Principal')))].sort(),
    runtime: process.version,
    code: codeDigest(root),
    tests,
    artefacts: artefactDigests(artefacts),
  };
}

/**
 * Problems: manifest missing, an artefact changed after it, or anything else it pins changed since: the product
 * code and tests, the policy, the control seal, the definitions of the agents that signed (review finding B4).
 * The release approval covers the manifest, so any of these makes the human decision stale.
 */
export function manifestProblems(manifestText, artefacts, root) {
  if (!manifestText) return ['no execution manifest: run `npm run manifest -- <ID>` after release.md is signed'];
  let m;
  try {
    m = JSON.parse(manifestText);
  } catch {
    return ['manifest.json is not valid JSON'];
  }
  const now = artefactDigests(artefacts);
  const out = [];
  for (const [f, d] of Object.entries(now)) {
    if (!m.artefacts?.[f]) out.push(`manifest does not pin ${f}: regenerate it`);
    else if (m.artefacts[f] !== d) out.push(`${f} changed after the manifest was generated: regenerate the manifest and re-approve`);
  }
  if (!root) return out;
  const fresh = buildManifest(root, m.change, artefacts);
  if (m.code !== fresh.code) out.push('the product code or tests (app/) changed after the manifest: regenerate it and re-approve the release');
  if (m.policy?.digest !== fresh.policy.digest) out.push('the policy changed after the manifest');
  if (m.controlSeal !== fresh.controlSeal) out.push('the control seal changed after the manifest');
  for (const [agent, digest] of Object.entries(m.agents || {})) if (fresh.agents[agent] !== digest) out.push(`the definition of agent "${agent}" changed after the manifest`);
  return out;
}
