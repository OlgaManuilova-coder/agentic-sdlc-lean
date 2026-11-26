#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Human decision on a gate. Run by a HUMAN in their own terminal (agents are denied this command).
//   npm run approve -- <CHANGE-ID> <design|release|escalation> --as <name>
// <name> must be listed in sdlc.policy.json "humans". CR-08: the approval records a digest of exactly what
// was approved and, where the policy sets one, an expiry. Any later change to that content invalidates it.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadContext, loadPolicy } from './lib/gates.mjs';
import { APPROVAL_SCOPE, APPROVAL_SECTION, addDays, approvalDigest } from './lib/approval.mjs';

const [id, stage] = process.argv.slice(2);
const asIdx = process.argv.indexOf('--as');
const who = asIdx > 0 ? process.argv[asIdx + 1] : '';
const policy = loadPolicy();
if (!id || !APPROVAL_SECTION[stage]) throw new Error('usage: approve -- <ID> <design|release|escalation> --as <name>');
if (!policy.humans.includes(who)) throw new Error(`"${who}" is not in sdlc.policy.json "humans"`);
const dir = join(ROOT, 'changes', id);
const [file, section] = APPROVAL_SECTION[stage];
const target = join(dir, file);
if (!existsSync(target)) throw new Error(`${target} not found`);
if (stage === 'release' && !existsSync(join(dir, 'manifest.json'))) throw new Error('generate the execution manifest first: npm run manifest -- ' + id);
const { artefacts } = loadContext(dir);
const today = new Date().toISOString().slice(0, 10);
const ttl = policy.approvalTtlDays?.[stage];
const scope = APPROVAL_SCOPE[stage].filter((f) => artefacts[f] !== undefined);
const block = [`## ${section}`, `- Approved-by: ${who}`, `- Date: ${today}`, `- Scope: ${scope.join(', ')}`, `- Digest: ${approvalDigest(stage, artefacts)}`]
  .concat(ttl ? [`- Expires: ${addDays(today, ttl)}`] : [])
  .join('\n') + '\n';
const text = readFileSync(target, 'utf8');
const re = new RegExp(`^## ${section}\\n[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm');
writeFileSync(target, re.test(text) ? text.replace(re, block + '\n') : text.trimEnd() + '\n\n' + block);
console.log(`${id} ${stage} approved by ${who} on ${today}${ttl ? ` (expires ${addDays(today, ttl)})` : ''}; scope: ${scope.join(', ')}. Next: npm run gates -- ${id}`);
