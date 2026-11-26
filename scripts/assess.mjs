#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Agentic SDLC maturity self-assessment (docs/assessment.md).
//   npm run assess [-- path/to/assessment.json]
// A stage is at the level its WEAKEST control plane supports. The next step for a stage is to raise
// that weakest plane. Autonomy without control is risk, so the minimum, not the average, decides.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/gates.mjs';

export const STAGES = ['discover', 'design', 'build', 'review', 'verify', 'release', 'operate'];
export const PLANES = ['identity', 'authority', 'enforcement', 'evidence'];
export const LEVELS = ['L0 Manual', 'L1 Assisted', 'L2 Delegated', 'L3 Orchestrated', 'L4 Governed autonomy'];

export function scoreStage(planes) {
  const values = PLANES.map((p) => {
    const v = planes?.[p];
    if (!Number.isInteger(v) || v < 0 || v > 4) throw new Error(`plane "${p}" must be an integer 0-4`);
    return v;
  });
  const level = Math.min(...values);
  const weakest = PLANES.filter((p, i) => values[i] === level);
  return { level, weakest };
}

export function assess(data) {
  return STAGES.map((stage) => ({ stage, ...scoreStage(data.stages?.[stage] ?? Object.fromEntries(PLANES.map((p) => [p, 0]))), planes: data.stages?.[stage] }));
}

if (process.argv[1]?.endsWith('assess.mjs')) {
  const file = process.argv[2] || join(ROOT, '.sdlc', 'assessment.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const rows = assess(data);
  console.log(`Agentic SDLC maturity — ${data.organisation || ''} (${data.date || ''})\n`);
  console.log('Stage      Ident Auth  Enf   Evid  → Level');
  for (const r of rows) {
    const cells = PLANES.map((p) => String(r.planes?.[p] ?? 0).padEnd(5)).join(' ');
    console.log(`${r.stage.padEnd(10)} ${cells} → ${LEVELS[r.level]}`);
  }
  console.log('\nNext steps (raise the weakest plane of each stage):');
  for (const r of rows) {
    if (r.level < 4) console.log(`  ${r.stage}: raise ${r.weakest.join(' + ')} to L${r.level + 1} (criteria: docs/assessment.md)`);
  }
}
