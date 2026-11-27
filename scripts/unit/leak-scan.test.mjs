// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MARKERS, findMarkers, scan, scanAdded } from '../leak-scan.mjs';

// One real-looking sample per marker, assembled from parts so this file does not match itself.
const O = 'OlgaManuilova' + '-coder';
const SAMPLES = [
  '// © 2026 Olga Manuilova — Agentic SDLC Framework (Enterprise ' + 'edition). Written by npm run approve',
  `see https://github.com/${O}/agentic-sdlc-` + 'full.git',
  `git@github.com:${O}/agentic-qa-` + 'full',
  `https://github.com/${O}/assured-` + 'autonomy/',
  'Proprietary and ' + 'confidential; see LICENSE.',
  '"AA-' + 'M2-01": "Attributable identity"',
];

const git = (dir, ...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
const repo = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'leak-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'test@example.invalid');
  git(dir, 'config', 'user.name', 'test');
  for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text);
  git(dir, 'add', '-A');
  return dir;
};
const withRepo = (files, fn) => {
  const dir = repo(files);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('this public repository carries no private markers', () => {
  assert.deepEqual(scan(process.cwd()), []);
});

test('every marker is caught with file and line; naming the editions is allowed', () => {
  assert.equal(SAMPLES.length, MARKERS.length);
  for (const sample of SAMPLES) {
    const hits = withRepo({ 'a.md': `ok line\nthe Enterprise edition adds more | (Enterprise edition) |\n${sample}\n` }, scan);
    assert.deepEqual(hits.map((h) => [h.file, h.line]), [['a.md', 3]], sample);
  }
});

test('a marker wrapped over two comment lines or with doubled spaces is still caught', () => {
  assert.deepEqual(findMarkers('// Proprietary and\n// ' + 'confidential').map((h) => h.line), [1]);
  assert.deepEqual(findMarkers('x\nProprietary   and  ' + 'confidential').map((h) => h.line), [2]);
});

test('untracked, binary and symlinked files are not scanned', () => {
  withRepo({ 'b.bin': Buffer.concat([Buffer.from([0]), Buffer.from(SAMPLES[4])]) }, (dir) => {
    writeFileSync(join(dir, 'untracked.md'), SAMPLES[4]);
    symlinkSync('/etc/hostname', join(dir, 'link.md'));
    git(dir, 'add', 'link.md');
    assert.deepEqual(scan(dir), []);
  });
});

test('--added catches material added and later removed on the branch', () => {
  withRepo({ 'a.md': 'clean\n' }, (dir) => {
    git(dir, 'commit', '-qm', 'base');
    const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
    writeFileSync(join(dir, 'a.md'), `clean\n${SAMPLES[5]}\n`);
    git(dir, 'commit', '-qam', 'add');
    writeFileSync(join(dir, 'a.md'), 'clean\n');
    git(dir, 'commit', '-qam', 'remove');
    assert.deepEqual(scan(dir), []);
    const hits = scanAdded(dir, base);
    assert.equal(hits.length, 1);
    assert.match(hits[0].file, /:a\.md$/);
  });
});
