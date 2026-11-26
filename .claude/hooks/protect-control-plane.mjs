#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-04 ENFORCEMENT: the agent must not control the controls that constrain it.
// Blocks (1) Write/Edit/MultiEdit to any control-plane path (sdlc.policy.json "controlPlane.paths" and the
// seal), and (2) shell commands that would write, move, delete or rewrite one. This hook is defence in depth:
// the authoritative check is the human seal verified by every gate run, which catches ANY path, including
// ones this hook cannot see (another tool, an MCP server, a script).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { block, projectRoot, readInput, targetPath } from './hook-io.mjs';
import { SEAL_FILE, controlPaths, isControlPath } from '../../scripts/lib/integrity.mjs';

const WRITE_OPS = /(^|[\s;&|(])(>>?|tee\b|sed\s+-i|perl\s+-[a-z]*i|cp\b|mv\b|rm\b|truncate\b|chmod\b|ln\b|dd\b|install\b|rsync\b|git\s+(checkout|restore|reset|stash|apply|am|rm|mv)\b|node\s+(-e|--eval|-p)\b|python3?\s+-c\b|npx\b|npm\s+run\s+control:seal|node\s+\S*control-seal)/;

export function decideWrite(path, policy) {
  return path && isControlPath(path, policy)
    ? `"${path}" is a control-plane asset (sdlc.policy.json controlPlane). Agents never change the controls that constrain them. Propose the change in a change of class "control"; a human reviews, approves and re-seals.`
    : null;
}

export function decideCommand(command, policy) {
  if (!command) return null;
  if (/npm\s+run\s+control:seal|control-seal\.mjs(?!.*--check)/.test(command)) return 'sealing the control plane is a human decision (`npm run control:seal` is human-only).';
  if (/\b(Approved-by|Digest|Expires):/.test(command) && /changes\//.test(command)) return 'this command touches recorded human decisions in changes/. Only a human decides, with `npm run approve`.';
  if (/npm\s+run\s+gates\b.*--no-write/.test(command)) return 'agents record every gate run (the retry budget counts them); run gates without --no-write.';
  const touched = [SEAL_FILE, ...controlPaths(policy)].filter((p) => command.includes(p.replace(/\/$/, '')));
  if (touched.length && WRITE_OPS.test(command)) return `this command could change control-plane assets (${touched.join(', ')}). Agents never change the controls that constrain them.`;
  return null;
}

if (process.argv[1]?.endsWith('protect-control-plane.mjs')) {
  const input = readInput();
  const root = projectRoot();
  const policy = JSON.parse(readFileSync(join(root, 'sdlc.policy.json'), 'utf8'));
  const reason = input.tool_name === 'Bash'
    ? decideCommand(input.tool_input?.command || '', policy)
    : decideWrite(targetPath(input.tool_input, root), policy);
  if (reason) block(`BLOCKED (control plane): ${reason}`);
  process.exit(0);
}
