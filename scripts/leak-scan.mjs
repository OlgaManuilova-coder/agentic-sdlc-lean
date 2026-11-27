#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Leak scan for a public repository. It fails when tracked files, or lines added on this branch, carry a marker
// that only private material has: the private editions' notice, links to the private repositories, the
// proprietary-licence line, or an Assured Autonomy control id. Naming the Enterprise edition or the Assured Autonomy
// Framework is fine; copying their files is not. The markers are assembled from parts so this file does not match itself.
// Limits: binary files (UTF-16 included) and symlinks are not scanned. CI runs after a push, so the first protection
// stays a habit: push to a public repository only from a fresh clone of its current history.
// Usage: node scripts/leak-scan.mjs                 → scan every tracked file
//        node scripts/leak-scan.mjs --added <base>  → also scan every line added by the commits in <base>..HEAD
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const OWNER = 'OlgaManuilova' + '-coder/';
export const MARKERS = [
  [new RegExp('Framework \\(Enterprise ' + 'edition\\)\\.', 'gi'), 'notice of a private Enterprise-edition file'],
  [new RegExp(OWNER + 'agentic-sdlc-' + 'full', 'gi'), 'link to a private repository'],
  [new RegExp(OWNER + 'agentic-qa-' + 'full', 'gi'), 'link to a private repository'],
  [new RegExp(OWNER + 'assured-' + 'autonomy', 'gi'), 'link to a private repository'],
  [new RegExp('proprietary and ' + 'confidential', 'gi'), 'proprietary licence line'],
  [new RegExp('\\bAA-' + 'M\\d-\\d{2}\\b', 'g'), 'an Assured Autonomy control id'],
];

const LEADER = /^\s*(\/\/+|#+|>+|\*+|--)?\s*/; // comment or quote leaders removed before joining lines

/**
 * Markers found in one text: [{line, why}]. Lines are joined with single spaces (comment leaders removed), so a
 * marker wrapped over two lines or with doubled spaces still matches; line numbers refer to the original text.
 */
export function findMarkers(text) {
  const starts = [];
  let flat = '';
  text.split('\n').forEach((l, i) => {
    starts.push([flat.length, i + 1]);
    flat += `${l.replace(LEADER, '').replace(/\s+/g, ' ').trim()} `;
  });
  const out = [];
  for (const [re, why] of MARKERS) {
    for (const m of flat.matchAll(re)) {
      let line = 1;
      for (const [start, n] of starts) if (start <= m.index) line = n;
      if (!out.some((o) => o.line === line && o.why === why)) out.push({ line, why });
    }
  }
  return out.sort((a, b) => a.line - b.line);
}

const repoRoot = (dir) => execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' }).trim();

/** Scan the tracked files of the repository that contains dir. Returns [{file, line, why}]. */
export function scan(dir) {
  const root = repoRoot(dir);
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const hits = [];
  for (const file of files) {
    const p = join(root, file);
    let buf;
    try {
      if (lstatSync(p).isSymbolicLink()) continue;
      buf = readFileSync(p);
    } catch {
      continue; // a deleted-but-tracked path or a submodule
    }
    if (buf.includes(0)) continue;
    for (const h of findMarkers(buf.toString('utf8'))) hits.push({ file, ...h });
  }
  return hits;
}

/** Scan every line added by the commits in base..HEAD, so material added and later removed is still caught. */
export function scanAdded(dir, base) {
  const root = repoRoot(dir);
  const log = execFileSync('git', ['log', '-p', '--no-color', '--format=commit %h', `${base}..HEAD`], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const hits = [];
  let commit = '';
  let file = '';
  let added = [];
  const flush = () => {
    for (const h of findMarkers(added.join('\n'))) hits.push({ file: `${commit}:${file}`, line: h.line, why: h.why });
    added = [];
  };
  for (const line of log.split('\n')) {
    if (line.startsWith('commit ')) {
      flush();
      commit = line.slice(7);
    } else if (line.startsWith('+++ ')) {
      flush();
      file = line.replace(/^\+\+\+ (b\/)?/, '');
    } else if (line.startsWith('+')) added.push(line.slice(1));
  }
  flush();
  return hits;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--added');
  const base = i > 0 ? process.argv[i + 1] : '';
  const hits = [...scan(process.cwd()), ...(base ? scanAdded(process.cwd(), base) : [])];
  if (!hits.length) {
    console.log(`leak:scan OK — no private markers in tracked files${base ? ` or in lines added since ${base}` : ''}`);
    process.exit(0);
  }
  for (const h of hits) console.error(`✗ ${h.file}:${h.line} ${h.why}`);
  console.error('Remove the private material (or its notice) before this can be public.');
  process.exit(1);
}
