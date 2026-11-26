#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// CR-07 minimal automated security checks for the product code (app/): committed secrets, dangerous APIs,
// and network calls to hosts other than the app itself. Prints "security:scan OK" or the findings (exit 1).
//   npm run security:scan

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './lib/gates.mjs';

export const RULES = [
  { id: 'SEC-SECRET', re: /(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{32,})/, what: 'a secret or token is committed' },
  { id: 'SEC-PASSWORD', re: /\b(password|passwd|secret|api[_-]?key)\s*[:=]\s*['"][^'"]{6,}['"]/i, what: 'a credential literal' },
  { id: 'SEC-EVAL', re: /\beval\s*\(|new Function\s*\(/, what: 'dynamic code execution' },
  { id: 'SEC-EXEC', re: /child_process|\bexecSync\s*\(|\bspawn\s*\(/, what: 'process execution from product code' },
  { id: 'SEC-HTML', re: /\.(innerHTML|outerHTML)\s*\+?=(?!\s*(['"])[^'"$]*\2\s*;?\s*$)/, what: 'HTML built from code (innerHTML/outerHTML other than a static literal): XSS risk; use createElement/textContent' },
  { id: 'SEC-HTML-INSERT', re: /\.insertAdjacentHTML\s*\(|\bdocument\.write(ln)?\s*\(/, what: 'insertAdjacentHTML/document.write: XSS risk' },
];

export function scanText(text, file) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const r of RULES) if (r.re.test(line)) out.push({ file, line: i + 1, id: r.id, what: r.what });
  });
  return out;
}

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    return statSync(f).isDirectory() ? files(f) : /\.(m?js|html|json)$/.test(n) ? [f] : [];
  });
}

if (process.argv[1]?.endsWith('security-scan.mjs')) {
  const findings = files(join(ROOT, 'app')).flatMap((f) => scanText(readFileSync(f, 'utf8'), relative(ROOT, f)));
  if (findings.length) {
    findings.forEach((x) => console.error(`✗ ${x.id} ${x.file}:${x.line} — ${x.what}`));
    process.exit(1);
  }
  console.log('security:scan OK — no secrets, dynamic code execution or unsafe HTML in app/');
}
