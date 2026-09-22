import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli/index.js';
import { copyFixture, removeTempDirectory } from './helpers.js';

const cleanupTargets: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupTargets.splice(0).map((target) => removeTempDirectory(target)));
});

describe('runCli', () => {
  it('writes a folded bundle to the requested output path', async () => {
    const fixture = await copyFixture('basic-repo');
    cleanupTargets.push(path.dirname(fixture));

    const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'sourcefold-output-'));
    cleanupTargets.push(outputRoot);
    const outputPath = path.join(outputRoot, 'bundle.md');
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(['--root', fixture, '--output', outputPath], {
      cwd: process.cwd(),
      stdout(message: string): void {
        stdout.push(message);
      },
      stderr(message: string): void {
        stderr.push(message);
      },
      async writeFile(filePath: string, content: string): Promise<void> {
        await import('node:fs/promises').then(({ mkdir, writeFile }) =>
          mkdir(path.dirname(filePath), { recursive: true }).then(() => writeFile(filePath, content, 'utf8'))
        );
      },
      async readPackageVersion(): Promise<string> {
        return '0.1.0';
      }
    });

    expect(exitCode).toBe(0);
    expect(stdout).toEqual([]);
    expect(stderr.join('')).toContain('Wrote');
    const output = await readFile(outputPath, 'utf8');
    expect(output).toContain('# Sourcefold Bundle');
  });

  it('prints help text', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(['--help'], {
      cwd: process.cwd(),
      stdout(message: string): void {
        stdout.push(message);
      },
      stderr(message: string): void {
        stderr.push(message);
      },
      async writeFile(): Promise<void> {
        throw new Error('not used');
      },
      async readPackageVersion(): Promise<string> {
        return '0.1.0';
      }
    });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout.join('')).toContain('Usage:');
  });
});
