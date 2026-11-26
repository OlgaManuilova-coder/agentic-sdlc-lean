// Shared helpers for PreToolUse hooks. Contract: JSON on stdin; exit 0 = allow; exit 2 = block (stderr to the agent).
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

export function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

/** Repo-relative path of the file a Write/Edit/MultiEdit targets ('' if none). */
export function targetPath(toolInput = {}, root = projectRoot()) {
  const p = toolInput.file_path || toolInput.path || toolInput.notebook_path || '';
  return p ? relative(root, resolve(root, p)).split('\\').join('/') : '';
}

/** All text a Write/Edit/MultiEdit would put into the file. */
export function newText(toolInput = {}) {
  if (typeof toolInput.content === 'string') return toolInput.content;
  if (typeof toolInput.new_string === 'string') return toolInput.new_string;
  if (Array.isArray(toolInput.edits)) return toolInput.edits.map((e) => e.new_string || '').join('\n');
  return '';
}

export function oldText(toolInput = {}) {
  if (typeof toolInput.old_string === 'string') return toolInput.old_string;
  if (Array.isArray(toolInput.edits)) return toolInput.edits.map((e) => e.old_string || '').join('\n');
  return '';
}

export function block(message) {
  process.stderr.write(message.trim() + '\n');
  process.exit(2);
}
