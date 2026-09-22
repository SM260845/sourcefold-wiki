import path from 'node:path';
import type { FoldFile, FoldResult } from './types.js';

const LANGUAGE_OVERRIDES: Record<string, string> = {
  '.cjs': 'js',
  '.cts': 'ts',
  '.jsx': 'jsx',
  '.md': 'md',
  '.mts': 'ts',
  '.sh': 'bash',
  '.tsx': 'tsx',
  '.yml': 'yaml',
};

interface TreeNode {
  children: Map<string, TreeNode>;
}

export function detectLanguage(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (LANGUAGE_OVERRIDES[extension]) {
    return LANGUAGE_OVERRIDES[extension];
  }

  return extension.startsWith('.') ? extension.slice(1) || 'text' : 'text';
}

export function renderFoldedMarkdown(result: FoldResult): string {
  const parts: string[] = [
    '# Sourcefold Bundle',
    '',
    `- Root: \`${result.rootLabel}\``,
    `- Included files: ${result.totals.files}`,
    `- Included bytes: ${result.totals.bytes}`,
    `- Estimated tokens: ${result.totals.estimatedTokens}`,
    '',
    '## File Tree',
    '',
    '```text',
    result.tree,
    '```',
    '',
    '## Files',
    '',
  ];

  if (result.files.length === 0) {
    parts.push('_No files were included under the current limits._', '');
  } else {
    for (const file of result.files) {
      parts.push(renderFileSection(file), '');
    }
  }

  parts.push('## Skipped Entries', '');

  if (result.skipped.length === 0) {
    parts.push('_No entries were skipped._');
  } else {
    for (const entry of result.skipped) {
      parts.push(`- \`${entry.relativePath}\` — ${entry.reason}`);
    }
  }

  return `${parts.join('\n').trimEnd()}\n`;
}

function renderFileSection(file: FoldFile): string {
  const fence = createCodeFence(file.content);

  return [
    `### \`${file.relativePath}\``,
    '',
    `- Size: ${file.sizeBytes} bytes`,
    `- Language: ${file.language}`,
    '',
    `${fence}${file.language}`,
    file.content,
    fence,
  ].join('\n');
}

function createCodeFence(content: string): string {
  const backtickRuns = content.match(/`+/g) ?? [];
  const longestRun = backtickRuns.reduce(
    (max, run) => Math.max(max, run.length),
    0
  );

  return '`'.repeat(Math.max(3, longestRun + 1));
}

export function renderTree(paths: string[]): string {
  if (paths.length === 0) {
    return '(empty)';
  }

  const root: TreeNode = { children: new Map() };

  for (const filePath of [...paths].sort()) {
    const segments = filePath.split('/');
    let current = root;

    for (const segment of segments) {
      const next = current.children.get(segment) ?? {
        children: new Map<string, TreeNode>(),
      };
      current.children.set(segment, next);
      current = next;
    }
  }

  const lines: string[] = [];
  appendNodeLines(root, 0, lines);
  return lines.join('\n');
}

function appendNodeLines(node: TreeNode, depth: number, lines: string[]): void {
  const entries = [...node.children.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );

  for (const [name, child] of entries) {
    const isDirectory = child.children.size > 0;
    lines.push(`${'  '.repeat(depth)}${name}${isDirectory ? '/' : ''}`);

    if (isDirectory) {
      appendNodeLines(child, depth + 1, lines);
    }
  }
}
