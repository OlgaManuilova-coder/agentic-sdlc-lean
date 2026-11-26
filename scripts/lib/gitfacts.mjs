// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Facts from git, which an agent cannot rewrite once a human-reviewed commit is on the base branch.
// Gates use these instead of what an agent wrote about itself (independent review finding B1).
// Outside a git repository every function returns null and the gates fall back to the artefacts; CI always
// runs inside git, against the protected base branch.

import { execFileSync } from 'node:child_process';

const git = (root, args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
};

export const normPath = (p) => String(p).trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '');

/** The base the current branch is compared with: $SDLC_BASE, then origin/<baseBranch>, then <baseBranch>. */
export function baseRef(root, policy) {
  const name = policy.baseBranch || 'main';
  for (const ref of [process.env.SDLC_BASE, `origin/${name}`, name].filter(Boolean)) {
    if (git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])) return ref;
  }
  return null;
}

/** Every path this branch changes against the base, including uncommitted and untracked files. null outside git. */
export function branchPaths(root, base) {
  if (!base || git(root, ['rev-parse', '--is-inside-work-tree']) === null) return null;
  const lines = [
    git(root, ['diff', '--name-only', `${base}...HEAD`]),
    git(root, ['diff', '--name-only', 'HEAD']),
    git(root, ['ls-files', '--others', '--exclude-standard']),
  ];
  if (lines.some((l) => l === null)) return null;
  return [...new Set(lines.join('\n').split('\n').map(normPath).filter(Boolean))].sort();
}

/** Does a path exist on the base branch? null when unknown. */
export function existsInBase(root, base, path) {
  if (!base) return null;
  return git(root, ['cat-file', '-e', `${base}:${normPath(path)}`]) !== null;
}

/** File content on the base branch, or null. */
export function baseContent(root, base, path) {
  return base ? git(root, ['show', `${base}:${normPath(path)}`]) : null;
}

/** Commits in base..HEAD: { sha, email, signature } (signature: G good, N none, …). */
export function commitsSince(root, base, paths = []) {
  if (!base) return null;
  const out = git(root, ['log', '--format=%H%x09%ae%x09%G?', `${base}..HEAD`, '--', ...paths]);
  if (out === null) return null;
  return out.split('\n').filter(Boolean).map((l) => {
    const [sha, email, signature] = l.split('\t');
    return { sha, email, signature };
  });
}

/** Lines added or removed by one commit in the given paths (unified diff, no context). */
export function commitDiffLines(root, sha, paths = []) {
  const out = git(root, ['show', '--format=', '--unified=0', sha, '--', ...paths]) || '';
  return out.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l));
}
