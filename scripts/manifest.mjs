#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-06. Writes changes/<ID>/manifest.json: the execution provenance of a change. Run after release.md is
// signed and before the human release approval (the approval covers the manifest).
//   npm run manifest -- <CHANGE-ID>

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadContext } from './lib/gates.mjs';
import { buildManifest } from './lib/manifest.mjs';

const id = process.argv[2];
if (!/^[A-Z]+-\d{3}$/.test(id || '')) throw new Error('usage: npm run manifest -- <CHANGE-ID>');
const dir = join(ROOT, 'changes', id);
const { artefacts } = loadContext(dir);
const m = buildManifest(ROOT, id, artefacts);
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
console.log(`changes/${id}/manifest.json: ${Object.keys(m.artefacts).length} artefacts pinned, policy v${m.policy.version}, seal ${m.controlSeal.slice(0, 12)}`);
