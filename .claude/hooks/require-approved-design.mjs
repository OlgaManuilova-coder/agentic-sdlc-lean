#!/usr/bin/env node
// ENFORCEMENT: no production code before an approved design (framework gate G2).
// Blocks Write/Edit to app/src/** unless the current change (.sdlc/current-change) has passed G1 and G2,
// which includes a human "Approved-by" on design.md.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { block, projectRoot, readInput, targetPath } from './hook-io.mjs';
import { checkChange } from '../../scripts/lib/gates.mjs';

export function decide(path, root) {
  if (!path.startsWith('app/src/')) return null;
  const curFile = join(root, '.sdlc', 'current-change');
  const id = existsSync(curFile) ? readFileSync(curFile, 'utf8').trim() : '';
  if (!id) return 'No current change. Start one with `npm run change:new -- <ID>`: production code changes belong to a change.';
  const dir = join(root, 'changes', id);
  if (!existsSync(dir)) return `Current change ${id} has no folder changes/${id}/.`;
  const results = checkChange(dir, { root, upTo: 'G2' });
  const notPassed = results.filter((r) => r.status !== 'PASS');
  if (notPassed.length) {
    return `Change ${id}: code is locked until G1 (requirements) and G2 (approved design) pass.\n` +
      notPassed.map((r) => `  ${r.gate} ${r.status}: ${r.problems.join('; ')}`).join('\n') +
      '\nA HUMAN approves the design (npm run approve). Agents cannot approve.';
  }
  return null;
}

if (process.argv[1]?.endsWith('require-approved-design.mjs')) {
  const input = readInput();
  const root = projectRoot();
  const reason = decide(targetPath(input.tool_input, root), root);
  if (reason) block(`BLOCKED (design gate): ${reason}`);
  process.exit(0);
}
