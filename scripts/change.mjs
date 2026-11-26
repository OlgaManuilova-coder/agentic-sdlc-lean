#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Change lifecycle helpers.
//   npm run change:new -- <ID>             create changes/<ID>/ with requirements.md, make it the current change
//   npm run change:artefact -- <ID> <file> add the next artefact from .sdlc/templates (design.md, build.md…)
//   npm run change:use -- <ID>             set the current change (the hooks read it)
//   npm run change:status                  every change with its gate status

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, checkChange } from './lib/gates.mjs';

const [cmd, id, file] = process.argv.slice(2);
const changes = join(ROOT, 'changes');
const current = join(ROOT, '.sdlc', 'current-change');
const fromTemplate = (name, changeId) =>
  readFileSync(join(ROOT, '.sdlc', 'templates', name), 'utf8').replaceAll('{{ID}}', changeId);
const valid = (x) => /^[A-Z]+-\d{3}$/.test(x || '');

switch (cmd) {
  case 'new': {
    if (!valid(id)) throw new Error('usage: change:new -- <ID like BUG-001>');
    const dir = join(changes, id);
    if (existsSync(dir)) throw new Error(`changes/${id} already exists`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'requirements.md'), fromTemplate('requirements.md', id));
    writeFileSync(current, id + '\n');
    console.log(`created changes/${id}/requirements.md; current change = ${id}`);
    if (existsSync(join(ROOT, 'backlog', `${id}.md`))) console.log(`source request: backlog/${id}.md`);
    break;
  }
  case 'artefact': {
    if (!valid(id) || !file) throw new Error('usage: change:artefact -- <ID> <design.md|build.md|review.md|security.md|verification.md|release.md|operate.md>');
    const target = join(changes, id, file);
    if (existsSync(target)) throw new Error(`${target} already exists`);
    writeFileSync(target, fromTemplate(file, id));
    console.log(`created changes/${id}/${file}`);
    break;
  }
  case 'use':
    if (!valid(id)) throw new Error('usage: change:use -- <ID>');
    writeFileSync(current, id + '\n');
    console.log(`current change = ${id}`);
    break;
  case 'status': {
    const cur = existsSync(current) ? readFileSync(current, 'utf8').trim() : '';
    for (const d of readdirSync(changes).filter((x) => valid(x)).sort()) {
      const r = checkChange(join(changes, d));
      const icon = { PASS: '✓', FAIL: '✗', PENDING: '…', BLOCKED: '·', AWAITING_HUMAN: '⏸' };
      const line = r.map((g) => `${g.gate}${icon[g.status]}`).join(' ');
      console.log(`${d === cur ? '*' : ' '} ${d.padEnd(9)} ${line}`);
    }
    console.log('\n✓ pass  ✗ fail  ⏸ awaiting a human  … pending  · blocked  * current change');
    break;
  }
  default:
    console.log('usage: change.mjs <new|artefact|use|status>');
}
