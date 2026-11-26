#!/usr/bin/env node
// ENFORCEMENT: tests may be added or strengthened, never weakened (framework gate G3).
// Blocks edits under app/test/** that skip or focus tests, or that remove assertions.

import { block, newText, oldText, readInput, targetPath } from './hook-io.mjs';

const WEAKENERS = [/\.(skip|only|todo)\s*\(/, /\{\s*skip\s*:/, /\{\s*only\s*:/, /\bxit\s*\(/, /\bxdescribe\s*\(/];
const countAsserts = (s) => (s.match(/\bassert(\.\w+)?\s*\(|\bexpect\s*\(/g) || []).length;

export function decide(path, toolInput) {
  if (!path.startsWith('app/test/')) return null;
  const added = newText(toolInput);
  const hit = WEAKENERS.find((re) => re.test(added));
  if (hit) return `the edit skips or focuses tests (${hit}).`;
  const removed = oldText(toolInput);
  if (removed && countAsserts(added) < countAsserts(removed)) return 'the edit removes assertions.';
  return null;
}

if (process.argv[1]?.endsWith('protect-tests.mjs')) {
  const input = readInput();
  const reason = decide(targetPath(input.tool_input), input.tool_input || {});
  if (reason) block(`BLOCKED (test integrity): ${reason} Fix the code, not the test. If a test is genuinely wrong, say so in build.md for the reviewer and a human to decide.`);
  process.exit(0);
}
