import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { estimateTokens, wouldExceedBudget } from './budget.js';
import { createIgnoreMatcher } from './ignore.js';
import { detectLanguage, renderTree } from './render.js';
import type {
  FoldFile,
  FoldOptions,
  FoldResult,
  SkippedEntry,
} from './types.js';

export async function foldPath(options: FoldOptions): Promise<FoldResult> {
  const rootPath = path.resolve(options.rootPath);
  const rootStats = await lstat(rootPath);

  if (rootStats.isSymbolicLink()) {
    throw new Error('The selected root must not be a symbolic link.');
  }

  const rootDirectory = rootStats.isDirectory()
    ? rootPath
    : path.dirname(rootPath);
  const rootLabel =
    options.rootLabel ??
    (path.relative(process.cwd(), rootPath) || path.basename(rootPath));
  const outputIgnore = resolveOutputIgnore(rootDirectory, options.outputPath);
  const matcher = await createIgnoreMatcher({
    rootDirectory,
    respectGitignore: options.respectGitignore,
    extraIgnoredPaths: outputIgnore ? [outputIgnore] : [],
  });

  const files: FoldFile[] = [];
  const skipped: SkippedEntry[] = [];
  let totalBytes = 0;
  let totalTokens = 0;

  if (rootStats.isDirectory()) {
    await walkDirectory('');
  } else if (rootStats.isFile()) {
    await inspectFile(path.basename(rootPath), rootPath);
  } else {
    throw new Error('The selected root must be a regular file or directory.');
  }

  return {
    rootDirectory,
    rootLabel,
    files,
    skipped: skipped.sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath)
    ),
    totals: {
      files: files.length,
      bytes: totalBytes,
      estimatedTokens: totalTokens,
    },
    tree: renderTree(files.map((file) => file.relativePath)),
  };

  async function walkDirectory(relativeDirectory: string): Promise<void> {
    const absoluteDirectory = path.join(rootDirectory, relativeDirectory);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = path.join(rootDirectory, relativePath);
      const stats = await safeLstat(absolutePath);

      if (!stats) {
        skipped.push({ relativePath, reason: 'unsupported' });
        continue;
      }

      if (stats.isSymbolicLink()) {
        skipped.push({ relativePath, reason: 'symlink' });
        continue;
      }

      if (stats.isDirectory()) {
        if (matcher.isIgnored(relativePath, true)) {
          skipped.push({ relativePath, reason: 'ignored' });
          continue;
        }

        await walkDirectory(relativePath);
        continue;
      }

      if (stats.isFile()) {
        await inspectFile(relativePath, absolutePath);
        continue;
      }

      skipped.push({ relativePath, reason: 'unsupported' });
    }
  }

  async function inspectFile(
    relativePath: string,
    absolutePath: string
  ): Promise<void> {
    if (matcher.isIgnored(relativePath, false)) {
      skipped.push({ relativePath, reason: 'ignored' });
      return;
    }

    if (matcher.isSensitive(relativePath)) {
      skipped.push({ relativePath, reason: 'sensitive' });
      return;
    }

    if (files.length >= options.maxFiles) {
      skipped.push({ relativePath, reason: 'file-limit-reached' });
      return;
    }

    const currentStats = await safeLstat(absolutePath);

    if (!currentStats || !currentStats.isFile()) {
      skipped.push({
        relativePath,
        reason: currentStats?.isSymbolicLink() ? 'symlink' : 'unsupported',
      });
      return;
    }

    const buffer = await safeReadFile(absolutePath);

    if (!buffer) {
      skipped.push({ relativePath, reason: 'unsupported' });
      return;
    }

    if (buffer.length > options.maxFileBytes) {
      skipped.push({ relativePath, reason: 'file-too-large' });
      return;
    }

    if (isBinaryBuffer(buffer)) {
      skipped.push({ relativePath, reason: 'binary' });
      return;
    }

    const content = buffer.toString('utf8');
    const estimatedTokens = estimateTokens(content) + 8;

    if (
      wouldExceedBudget({
        currentBytes: totalBytes,
        currentTokens: totalTokens,
        nextBytes: buffer.length,
        nextTokens: estimatedTokens,
        maxBytes: options.maxBytes,
        maxTokens: options.maxTokens,
      })
    ) {
      skipped.push({ relativePath, reason: 'budget-exceeded' });
      return;
    }

    files.push({
      absolutePath,
      relativePath,
      sizeBytes: buffer.length,
      estimatedTokens,
      language: detectLanguage(relativePath),
      content,
    });
    totalBytes += buffer.length;
    totalTokens += estimatedTokens;
  }
}

function isBinaryBuffer(buffer: Buffer): boolean {
  const sampleLength = Math.min(buffer.length, 8000);
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }

  return false;
}

function resolveOutputIgnore(
  rootDirectory: string,
  outputPath?: string
): string | undefined {
  if (!outputPath) {
    return undefined;
  }

  const absoluteOutput = path.resolve(outputPath);
  const relativeOutput = path.relative(rootDirectory, absoluteOutput);
  if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) {
    return undefined;
  }

  return relativeOutput;
}

async function safeLstat(absolutePath: string) {
  try {
    return await lstat(absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

async function safeReadFile(absolutePath: string) {
  try {
    return await readFile(absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
