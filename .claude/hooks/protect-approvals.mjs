#!/usr/bin/env node
// ENFORCEMENT + IDENTITY: an agent can never record, alter or remove a human decision.
// Blocks any Write/Edit in changes/** that adds, changes or removes a filled approval line ("Approved-by",
// "Digest", "Expires", "Scope"), including rewriting a whole file whose approval block would change.
// Humans decide with `npm run approve` (denied to agents). Defence in depth: in CI, `npm run trust:check`
// verifies against the protected base branch that every approval change was committed by a human.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { block, newText, oldText, projectRoot, readInput, targetPath } from './hook-io.mjs';

const FILLED = /^[ \t]*-[ \t]*(Approved-by|Digest|Expires|Scope):[ \t]*\S.*$/gm;
const filled = (text) => (String(text).match(FILLED) || []).map((l) => l.trim()).sort().join('\n');

export function decide(path, toolInput, root = projectRoot()) {
  if (!path.startsWith('changes/')) return null;
  const added = newText(toolInput);
  const removed = oldText(toolInput);
  if (typeof toolInput.content === 'string') {
    const file = join(root, path);
    const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (filled(before) !== filled(added)) return 'this write would add, change or remove a recorded human decision. Only a human decides, with `npm run approve`.';
    return null;
  }
  if (filled(added) !== filled(removed)) return 'agents cannot fill in, edit or remove a human decision (Approved-by, Digest, Expires, Scope). A human decides with `npm run approve`.';
  return null;
}

if (process.argv[1]?.endsWith('protect-approvals.mjs')) {
  const input = readInput();
  const reason = decide(targetPath(input.tool_input), input.tool_input || {});
  if (reason) block(`BLOCKED (approval forgery): ${reason}`);
  process.exit(0);
}
