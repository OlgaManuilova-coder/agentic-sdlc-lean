#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-04. HUMAN ONLY (denied to agents in .claude/settings.json). Seals the control plane after a human has
// reviewed it: records a digest of every control-plane file in .sdlc/control-seal.json.
//   npm run control:seal -- --as <name>      seal (name must be in sdlc.policy.json "humans")
//   npm run control:check                     verify; exit 1 on any difference (CI and every gate run do this)

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadPolicy } from './lib/gates.mjs';
import { SEAL_FILE, computeSeal, sealProblems } from './lib/integrity.mjs';

const policy = loadPolicy();
if (process.argv.includes('--check')) {
  const problems = sealProblems(ROOT, policy);
  if (problems.length) {
    problems.forEach((p) => console.error(`✗ ${p}`));
    process.exit(1);
  }
  console.log(`control:check OK — ${Object.keys(computeSeal(ROOT, policy)).length} control-plane files match the seal`);
} else {
  const asIdx = process.argv.indexOf('--as');
  const who = asIdx > 0 ? process.argv[asIdx + 1] : '';
  if (!policy.humans.includes(who)) throw new Error(`usage: control:seal -- --as <human>; "${who}" is not in sdlc.policy.json "humans"`);
  const files = computeSeal(ROOT, policy);
  const seal = { sealedBy: who, sealedAt: new Date().toISOString().slice(0, 10), files };
  writeFileSync(join(ROOT, SEAL_FILE), JSON.stringify(seal, null, 2) + '\n');
  console.log(`sealed ${Object.keys(files).length} control-plane files as ${who}. Commit ${SEAL_FILE} with the control change.`);
}
