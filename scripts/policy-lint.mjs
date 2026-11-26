#!/usr/bin/env node
// © 2026 Olga Manuilova — Agentic SDLC Framework (lean edition). Keep this notice in all copies. https://github.com/OlgaManuilova-coder/agentic-sdlc-lean
// Validates sdlc.policy.json against the repository: stage agents exist, levels are valid,
// human-approval stages have an Approval section in their template, every agent has an authority entry.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, legacyDigest, loadPolicy } from './lib/gates.mjs';

export function lintPolicy(policy, root = ROOT) {
  const errors = [];
  if (!Array.isArray(policy.humans) || !policy.humans.length) errors.push('"humans" must list at least one human approver');
  for (const [stage, s] of Object.entries(policy.stages || {})) {
    if (!/^L[0-4]$/.test(s.level)) errors.push(`${stage}: level must be L0-L4`);
    if (!existsSync(join(root, '.claude', 'agents', `${s.agent}.md`))) errors.push(`${stage}: agent "${s.agent}" has no .claude/agents/${s.agent}.md`);
    if (!policy.authority?.[s.agent]) errors.push(`${stage}: agent "${s.agent}" has no authority entry`);
    const tpl = join(root, '.sdlc', 'templates', s.artefact);
    if (!existsSync(tpl)) errors.push(`${stage}: template ${s.artefact} missing`);
    else if (s.humanApproval && !/^## Approval/m.test(readFileSync(tpl, 'utf8'))) errors.push(`${stage}: humanApproval but template has no "## Approval"`);
    if (['L3', 'L4'].includes(s.level) && s.humanApproval === undefined) errors.push(`${stage}: L3+ stages must state humanApproval explicitly`);
  }
  for (const h of policy.humans || []) if (policy.authority?.[h]) errors.push(`"${h}" is both a human approver and an agent`);
  if (policy.stages?.review && !policy.stages.review.independent) errors.push('review stage must be independent');
  const order = policy.riskTiers?._order || [];
  for (const t of order) {
    const tier = policy.riskTiers[t];
    if (!tier) errors.push(`riskTiers: "${t}" listed in _order but not defined`);
    else if (!Number.isInteger(tier.maxFiles) || tier.maxFiles < 1) errors.push(`riskTiers.${t}.maxFiles must be a positive integer`);
  }
  if (order.length && policy.riskTiers[order.at(-1)]?.humanApproval?.release === false) errors.push('the highest risk tier must keep a human release approval');
  for (const [stage, s] of Object.entries(policy.stages || {})) {
    if (s.humanApproval === 'by-tier' && !order.length) errors.push(`${stage}: humanApproval "by-tier" needs riskTiers`);
  }
  // v1: control plane, tool inventory, legacy changes (CR-04, CR-05, CR-06)
  for (const c of policy.controlPlane?.paths || []) if (!existsSync(join(root, c))) errors.push(`controlPlane: "${c}" does not exist`);
  for (const must of ['sdlc.policy.json', '.claude/hooks/', 'scripts/', '.claude/settings.json', 'package.json', '.claude/knowledge/'])
    if (policy.controlPlane && !policy.controlPlane.paths.includes(must)) errors.push(`controlPlane must include "${must}"`);
  for (const [id, digest] of Object.entries(policy.legacyChanges || {})) {
    if (!/^[A-Z]+-\d{3}$/.test(id)) errors.push(`legacyChanges: "${id}" is not a change id`);
    else if (!existsSync(join(root, 'changes', id))) errors.push(`legacyChanges: changes/${id} does not exist`);
    else if (legacyDigest(join(root, 'changes', id)) !== digest) errors.push(`legacyChanges: changes/${id} no longer matches its frozen digest`);
  }
  if (policy.edition && !['lean', 'full'].includes(policy.edition)) errors.push('edition must be "lean" or "full"');
  errors.push(...lintTools(root));
  const sec = policy.stages?.review?.securityAgent;
  if (sec && !existsSync(join(root, '.claude', 'agents', `${sec}.md`))) errors.push(`review.securityAgent "${sec}" has no agent file`);
  return errors;
}

/** CR-05: every MCP server and every allowed tool must be in the tool inventory, with every field declared. */
export function lintTools(root = ROOT) {
  const file = join(root, '.sdlc', 'tools.json');
  if (!existsSync(file)) return ['.sdlc/tools.json (tool inventory, CR-05) is missing'];
  const tools = JSON.parse(readFileSync(file, 'utf8')).tools || {};
  const errors = [];
  const FIELDS = ['trust', 'read', 'write', 'dataClasses', 'sideEffects', 'approval', 'audit', 'revocation', 'stages'];
  for (const [name, t] of Object.entries(tools)) for (const f of FIELDS) if (!(f in t)) errors.push(`tools.json: "${name}" has no "${f}"`);
  const mcp = join(root, '.mcp.json');
  if (existsSync(mcp)) for (const server of Object.keys(JSON.parse(readFileSync(mcp, 'utf8')).mcpServers || {}))
    if (!tools[`mcp__${server}`]) errors.push(`CR-05: MCP server "${server}" (.mcp.json) is not in .sdlc/tools.json as "mcp__${server}"`);
  const settings = join(root, '.claude', 'settings.json');
  if (existsSync(settings)) for (const rule of JSON.parse(readFileSync(settings, 'utf8')).permissions?.allow || []) {
    const tool = rule.split('(')[0];
    if (!tools[tool]) errors.push(`CR-05: allowed tool "${tool}" (.claude/settings.json) is not in .sdlc/tools.json`);
  }
  return errors;
}

if (process.argv[1]?.endsWith('policy-lint.mjs')) {
  const errors = lintPolicy(loadPolicy());
  if (errors.length) {
    console.error(errors.map((e) => `✗ ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('policy:lint OK');
}
