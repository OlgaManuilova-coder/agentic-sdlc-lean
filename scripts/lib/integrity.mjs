// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-04 Control-Plane Integrity. The control plane (gates, policy, hooks, settings, approval tooling,
// templates, tool inventory, the framework's own tests) is SEALED by a human: a digest of every file.
// Every gate run verifies the seal. The check is path-independent: it looks at the result, not at the
// tool that produced it, so a change made through an editor, a shell, a script or an MCP server is caught
// the same way.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const SEAL_FILE = '.sdlc/control-seal.json';

/** sha256 of text with line endings normalised (a checkout on Windows must not break the seal). */
export const sha = (text) => createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');

export function controlPaths(policy) {
  return policy.controlPlane?.paths || [];
}

/** Is a repo-relative path a control-plane asset (exact file or under a listed directory)? */
export function isControlPath(path, policy) {
  const p = path.replace(/^\.\//, '');
  return p === SEAL_FILE || controlPaths(policy).some((c) => (c.endsWith('/') ? p.startsWith(c) : p === c));
}

function walk(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every existing control-plane file, repo-relative, sorted. The seal file itself is excluded. */
export function controlFiles(root, policy) {
  const files = [];
  for (const c of controlPaths(policy)) {
    const full = join(root, c);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return [...new Set(files.map((f) => relative(root, f).split('\\').join('/')))].filter((f) => f !== SEAL_FILE).sort();
}

export function computeSeal(root, policy) {
  return Object.fromEntries(controlFiles(root, policy).map((f) => [f, sha(readFileSync(join(root, f), 'utf8'))]));
}

/** Problems with the seal: missing, or any control file added, removed or modified since a human sealed it. */
export function sealProblems(root, policy) {
  if (!controlPaths(policy).length) return [];
  const file = join(root, SEAL_FILE);
  if (!existsSync(file)) return ['control plane is not sealed: a human reviews the controls and runs `npm run control:seal -- --as <name>`'];
  const seal = JSON.parse(readFileSync(file, 'utf8'));
  const now = computeSeal(root, policy);
  const out = [];
  for (const [f, digest] of Object.entries(now)) {
    if (!(f in (seal.files || {}))) out.push(`control file added since the seal: ${f}`);
    else if (seal.files[f] !== digest) out.push(`control file modified since the seal: ${f}`);
  }
  for (const f of Object.keys(seal.files || {})) if (!(f in now)) out.push(`control file removed since the seal: ${f}`);
  return out.map((m) => `control plane integrity: ${m}. A product change may not touch controls; control changes need class "control", human approval and a human re-seal.`);
}

/** Digest of the current seal file (goes into the execution manifest as the "gate code version"). */
export function sealDigest(root) {
  const file = join(root, SEAL_FILE);
  return existsSync(file) ? sha(readFileSync(file, 'utf8')) : 'unsealed';
}
