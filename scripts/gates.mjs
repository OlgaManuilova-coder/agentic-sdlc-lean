#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Check a change's gates and record the result as evidence.
//   npm run gates -- <CHANGE-ID> [--up-to G3] [--no-write]
// Every recorded run is also appended to changes/<ID>/gate-history.jsonl (input for npm run metrics).
//   npm run gates -- --all        (every change folder; CI uses this)
// Exit 1 if any checked gate FAILs. PENDING (artefact not written yet) and AWAITING_HUMAN (only a human
// decision is missing or stale) are not failures: they are waiting for someone.

import { appendFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, checkChange } from './lib/gates.mjs';

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const changesDir = join(ROOT, 'changes');
const ids = args.includes('--all')
  ? readdirSync(changesDir).filter((d) => existsSync(join(changesDir, d, 'requirements.md')))
  : args.filter((a) => !a.startsWith('--') && a !== opt('--up-to'));
const badId = ids.find((x) => !/^[A-Z]+-\d{3}$/.test(x));
if (badId) {
  console.error(`"${badId}" is not a change id (like BUG-001): changes live exactly in changes/<ID>/`);
  process.exit(2);
}
if (!ids.length) {
  console.error('usage: npm run gates -- <CHANGE-ID> | --all');
  process.exit(2);
}

const icon = { PASS: '✓', FAIL: '✗', PENDING: '…', BLOCKED: '·', AWAITING_HUMAN: '⏸' };
let failed = false;
for (const id of ids) {
  const dir = join(changesDir, id);
  if (!existsSync(dir)) {
    console.error(`${id}: changes/${id}/ not found`);
    failed = true;
    continue;
  }
  const results = checkChange(dir, { upTo: opt('--up-to') || 'G7' });
  console.log(`\n${id}`);
  for (const r of results) {
    console.log(`  ${icon[r.status]} ${r.gate} ${r.status}`);
    if (['FAIL', 'AWAITING_HUMAN'].includes(r.status)) r.problems.forEach((pr) => console.log(`      - ${pr}`));
  }
  if (results.some((r) => r.status === 'FAIL')) failed = true;
  if (!args.includes('--no-write') && !args.includes('--all')) {
    const record = { change: id, checkedAt: new Date().toISOString(), results };
    writeFileSync(join(dir, 'gates.json'), JSON.stringify(record, null, 2) + '\n');
    appendFileSync(join(dir, 'gate-history.jsonl'), JSON.stringify({ at: record.checkedAt, status: Object.fromEntries(results.map((r) => [r.gate, r.status])) }) + '\n');
  }
}
process.exit(failed ? 1 : 0);
