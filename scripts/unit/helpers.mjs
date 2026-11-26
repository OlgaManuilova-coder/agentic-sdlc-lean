// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Test helpers: a sealed copy of the repository and a valid framework-v1 change built from the fixture.
// Human decisions here are SIMULATED for tests in a temporary directory; in the real repository only a
// human records them, with `npm run approve` (denied to agents).

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, checkChange, loadContext, loadPolicy, rulesVersion } from '../lib/gates.mjs';
import { SEAL_FILE, computeSeal } from '../lib/integrity.mjs';
import { APPROVAL_SCOPE, APPROVAL_SECTION, addDays, approvalDigest } from '../lib/approval.mjs';
import { buildManifest } from '../lib/manifest.mjs';

const SKIP = new Set(['node_modules', '.git', 'results']);
const FIXTURE = join(ROOT, 'scripts', 'unit', 'fixtures', 'v1-change');

export function seal(dir) {
  const files = computeSeal(dir, loadPolicy(dir));
  writeFileSync(join(dir, SEAL_FILE), JSON.stringify({ sealedBy: 'olga.manuilova', sealedAt: '2026-11-25', files }, null, 2));
}

/** A full copy of the repository in a temp dir, with the control plane sealed. */
export function sealedSandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'sdlc-v1-'));
  for (const name of readdirSync(ROOT)) if (!SKIP.has(name)) cpSync(join(ROOT, name), join(dir, name), { recursive: true });
  seal(dir);
  return dir;
}

/** Create changes/<id> from the valid v1 fixture; `edit` maps file -> (text) => text. */
export function addChange(dir, id, edit = {}) {
  const target = join(dir, 'changes', id);
  mkdirSync(target, { recursive: true });
  for (const f of readdirSync(FIXTURE)) {
    let text = readFileSync(join(FIXTURE, f), 'utf8').replaceAll('FIX-001', id).replaceAll('{{RULES_VERSION}}', rulesVersion(dir));
    if (edit[f]) text = edit[f](text);
    writeFileSync(join(target, f), text);
  }
  mkdirSync(join(dir, 'backlog'), { recursive: true });
  if (!existsSync(join(dir, 'backlog', `${id}.md`))) writeFileSync(join(dir, 'backlog', `${id}.md`), `# ${id}\n`);
  return target;
}

export const read = (dir, id, f) => readFileSync(join(dir, 'changes', id, f), 'utf8');
export const write = (dir, id, f, text) => writeFileSync(join(dir, 'changes', id, f), text);
export const edit = (dir, id, f, fn) => write(dir, id, f, fn(read(dir, id, f)));

/** SIMULATED human decision (what `npm run approve` writes), bound to the current content. */
export function approve(dir, id, stage, { as = 'olga.manuilova', date = '2026-11-25' } = {}) {
  const policy = loadPolicy(dir);
  const { artefacts } = loadContext(join(dir, 'changes', id), dir);
  const [file, section] = APPROVAL_SECTION[stage];
  const ttl = policy.approvalTtlDays?.[stage];
  const block = [`## ${section}`, `- Approved-by: ${as}`, `- Date: ${date}`, `- Scope: ${APPROVAL_SCOPE[stage].filter((f) => artefacts[f] !== undefined).join(', ')}`, `- Digest: ${approvalDigest(stage, artefacts)}`]
    .concat(ttl ? [`- Expires: ${addDays(date, ttl)}`] : [])
    .join('\n') + '\n';
  const re = new RegExp(`^## ${section}\\n[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm');
  edit(dir, id, file, (t) => (re.test(t) ? t.replace(re, block + '\n') : t.trimEnd() + '\n\n' + block));
}

export function manifest(dir, id) {
  const { artefacts } = loadContext(join(dir, 'changes', id), dir);
  write(dir, id, 'manifest.json', JSON.stringify(buildManifest(dir, id, artefacts), null, 2));
}

/** The happy path: design approved, manifest written, release approved. */
export function deliver(dir, id) {
  approve(dir, id, 'design');
  manifest(dir, id);
  approve(dir, id, 'release');
}

export const gates = (dir, id, opts = {}) => checkChange(join(dir, 'changes', id), { root: dir, today: '2026-11-26', ...opts });
export const statuses = (dir, id, opts) => gates(dir, id, opts).map((r) => r.status);
export const problemsOf = (dir, id, gate, opts) => gates(dir, id, opts).find((r) => r.gate === gate)?.problems || [];
