// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-08 Human Decision Quality. An approval is bound to the exact content it approved: a digest of the
// approved artefacts (without their approval blocks). Any later change invalidates it. Approvals can expire.

import { sha } from './integrity.mjs';

/** What each human decision covers. A release approval covers the whole evidence pack and its manifest. */
export const APPROVAL_SCOPE = {
  design: ['requirements.md', 'design.md'],
  release: ['requirements.md', 'design.md', 'build.md', 'review.md', 'security.md', 'verification.md', 'release.md', 'manifest.json'],
  escalation: ['requirements.md', 'design.md', 'build.md'],
};

/** Where each decision is recorded: artefact and section. */
export const APPROVAL_SECTION = {
  design: ['design.md', 'Approval'],
  release: ['release.md', 'Approval'],
  escalation: ['build.md', 'Escalation approval'],
};

/** Remove exactly the approval blocks ("## Approval", "## Escalation approval") so an approval never hashes
 *  itself. Any other section, even one with "approval" in its name, stays part of the approved content. */
export function withoutApprovals(md) {
  return String(md)
    .replace(/\r\n/g, '\n')
    .replace(/^## (Approval|Escalation approval)[ \t]*\n[\s\S]*?(?=^## |(?![\s\S]))/gm, '')
    .trimEnd();
}

export function approvalDigest(stage, artefacts) {
  const parts = (APPROVAL_SCOPE[stage] || []).filter((f) => artefacts[f] !== undefined).map((f) => `--- ${f}\n${withoutApprovals(artefacts[f])}`);
  return sha(parts.join('\n'));
}

export function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
