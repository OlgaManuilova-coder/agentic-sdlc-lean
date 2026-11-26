#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-01 traceability: for one change, every acceptance criterion through design, tests and verification evidence.
//   npm run trace -- <CHANGE-ID>        prints the matrix and the coverage; exit 1 below 100 %

import { join } from 'node:path';
import { ROOT, acIds, loadContext, sections, stripComments } from './lib/gates.mjs';

export function traceMatrix(artefacts) {
  const strategy = stripComments(sections(artefacts['design.md'] || '')['Test strategy']);
  const tests = stripComments(sections(artefacts['build.md'] || '')['Tests added']);
  const evidence = stripComments(sections(artefacts['verification.md'] || '')['Evidence']);
  return acIds(artefacts['requirements.md'] || '').map((id) => {
    const re = new RegExp(`\\b${id}\\b`);
    const row = evidence.split('\n').find((l) => re.test(l)) || '';
    return { ac: id, design: re.test(strategy), tests: re.test(tests), verified: /\|\s*PASS\s*\|\s*$/.test(row) };
  });
}

if (process.argv[1]?.endsWith('trace.mjs')) {
  const id = process.argv[2];
  const { artefacts } = loadContext(join(ROOT, 'changes', id || ''));
  const m = traceMatrix(artefacts);
  console.log('AC     design  tests  verified');
  m.forEach((r) => console.log(`${r.ac.padEnd(6)} ${r.design ? '✓' : '✗'}       ${r.tests ? '✓' : '·'}      ${r.verified ? '✓' : '✗'}`));
  const covered = m.filter((r) => r.design && r.verified).length;
  console.log(`\ncoverage ${covered}/${m.length} (design + verification; "·" tests = verified outside unit tests)`);
  process.exit(covered === m.length && m.length ? 0 : 1);
}
