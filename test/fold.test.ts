import { mkdtemp, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foldPath, renderFoldedMarkdown } from '../src/lib/index.js';
import { copyFixture, removeTempDirectory } from './helpers.js';

const cleanupTargets: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupTargets.splice(0).map((target) => removeTempDirectory(target))
  );
});

describe('foldPath', () => {
  it('renders a deterministic tree and per-file sections', async () => {
    const fixture = await copyFixture('basic-repo');
    cleanupTargets.push(path.dirname(fixture));

    const result = await foldPath({
      rootPath: fixture,
      rootLabel: 'basic-repo',
      maxBytes: 200_000,
      maxFileBytes: 50_000,
      maxFiles: 200,
      respectGitignore: true,
    });

    expect(result.files.map((file) => file.relativePath)).toEqual([
      '.gitignore',
      'README.md',
      'src/index.ts',
      'src/util.ts',
    ]);
    expect(result.tree).toContain('src/');

    const markdown = renderFoldedMarkdown(result);
    expect(markdown).toContain('# Sourcefold Bundle');
    expect(markdown).toContain('### `src/index.ts`');
    expect(markdown).toContain('```ts');
  });

  it('respects ignore files and sensitive path protection', async () => {
    const fixture = await copyFixture('basic-repo');
    cleanupTargets.push(path.dirname(fixture));

    const result = await foldPath({
      rootPath: fixture,
      rootLabel: 'basic-repo',
      maxBytes: 200_000,
      maxFileBytes: 50_000,
      maxFiles: 200,
      respectGitignore: true,
    });

    expect(
      result.files.find((file) => file.relativePath === 'ignored.txt')
    ).toBeUndefined();
    expect(
      result.files.find((file) => file.relativePath === '.env')
    ).toBeUndefined();
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { relativePath: '.env', reason: 'sensitive' },
        { relativePath: 'ignored.txt', reason: 'ignored' },
      ])
    );
  });

  it('enforces per-file and aggregate budgets', async () => {
    const fixture = await copyFixture('basic-repo');
    cleanupTargets.push(path.dirname(fixture));

    const fileLimited = await foldPath({
      rootPath: fixture,
      rootLabel: 'basic-repo',
      maxBytes: 200_000,
      maxFileBytes: 20,
      maxFiles: 200,
      respectGitignore: true,
    });

    expect(fileLimited.skipped).toEqual(
      expect.arrayContaining([
        { relativePath: 'src/index.ts', reason: 'file-too-large' },
      ])
    );

    const budgetLimited = await foldPath({
      rootPath: fixture,
      rootLabel: 'basic-repo',
      maxBytes: 30,
      maxFileBytes: 50_000,
      maxFiles: 200,
      maxTokens: 100,
      respectGitignore: true,
    });

    expect(
      budgetLimited.skipped.some((entry) => entry.reason === 'budget-exceeded')
    ).toBe(true);
  });

  it('skips symlinks and binary files', async () => {
    const fixture = await copyFixture('basic-repo');
    const tempRoot = path.dirname(fixture);
    cleanupTargets.push(tempRoot);

    const externalRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sourcefold-external-')
    );
    cleanupTargets.push(externalRoot);
    const secretPath = path.join(externalRoot, 'secret.txt');
    await writeFile(secretPath, 'outside root\n', 'utf8');

    await symlink(secretPath, path.join(fixture, 'linked-secret.txt'));
    await writeFile(
      path.join(fixture, 'binary.bin'),
      Buffer.from([0, 1, 2, 3])
    );

    const result = await foldPath({
      rootPath: fixture,
      rootLabel: 'basic-repo',
      maxBytes: 200_000,
      maxFileBytes: 50_000,
      maxFiles: 200,
      respectGitignore: true,
    });

    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { relativePath: 'binary.bin', reason: 'binary' },
        { relativePath: 'linked-secret.txt', reason: 'symlink' },
      ])
    );
  });

  it('tolerates files that disappear during a scan', async () => {
    const fixture = await copyFixture('basic-repo');
    cleanupTargets.push(path.dirname(fixture));

    const transientPath = path.join(fixture, 'transient.txt');
    await writeFile(transientPath, 'remove me\n', 'utf8');

    let transientCheckCount = 0;
    vi.resetModules();
    vi.doMock('node:fs/promises', async () => {
      const actual =
        await vi.importActual<typeof import('node:fs/promises')>(
          'node:fs/promises'
        );

      return {
        ...actual,
        lstat: async (targetPath: string, ...args: unknown[]) => {
          if (targetPath === transientPath) {
            transientCheckCount += 1;
            if (transientCheckCount === 2) {
              await actual.rm(transientPath);
            }
          }

          return Reflect.apply(actual.lstat, actual, [targetPath, ...args]);
        },
      };
    });

    try {
      const { foldPath: mockedFoldPath } = await import('../src/lib/index.js');

      const result = await mockedFoldPath({
        rootPath: fixture,
        rootLabel: 'basic-repo',
        maxBytes: 200_000,
        maxFileBytes: 50_000,
        maxFiles: 200,
        respectGitignore: true,
      });

      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { relativePath: 'transient.txt', reason: 'unsupported' },
        ])
      );
    } finally {
      vi.doUnmock('node:fs/promises');
      vi.resetModules();
    }
  });

  it('skips files that become symlinks before they are read', async () => {
    const fixture = await copyFixture('basic-repo');
    const tempRoot = path.dirname(fixture);
    cleanupTargets.push(tempRoot);

    const externalRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sourcefold-external-')
    );
    cleanupTargets.push(externalRoot);

    const swapTargetPath = path.join(fixture, 'swap.txt');
    const secretPath = path.join(externalRoot, 'secret.txt');

    await writeFile(swapTargetPath, 'inside root\n', 'utf8');
    await writeFile(secretPath, 'outside root\n', 'utf8');

    let swapCheckCount = 0;
    vi.resetModules();
    vi.doMock('node:fs/promises', async () => {
      const actual =
        await vi.importActual<typeof import('node:fs/promises')>(
          'node:fs/promises'
        );

      return {
        ...actual,
        lstat: async (targetPath: string, ...args: unknown[]) => {
          if (targetPath === swapTargetPath) {
            swapCheckCount += 1;
            if (swapCheckCount === 2) {
              await actual.rm(swapTargetPath);
              await actual.symlink(secretPath, swapTargetPath);
            }
          }

          return Reflect.apply(actual.lstat, actual, [targetPath, ...args]);
        },
      };
    });

    try {
      const { foldPath: mockedFoldPath } = await import('../src/lib/index.js');

      const result = await mockedFoldPath({
        rootPath: fixture,
        rootLabel: 'basic-repo',
        maxBytes: 200_000,
        maxFileBytes: 50_000,
        maxFiles: 200,
        respectGitignore: true,
      });

      expect(
        result.files.find((file) => file.relativePath === 'swap.txt')
      ).toBeUndefined();
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { relativePath: 'swap.txt', reason: 'symlink' },
        ])
      );
    } finally {
      vi.doUnmock('node:fs/promises');
      vi.resetModules();
    }
  });
});
