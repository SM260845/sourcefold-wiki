#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { foldPath, renderFoldedMarkdown } from '../lib/index.js';
import type { FoldOptions } from '../lib/types.js';

const HELP_TEXT = `sourcefold

Usage:
  sourcefold [--root <path>] [--output <file>] [--max-bytes <n>] [--max-file-bytes <n>] [--max-files <n>] [--max-tokens <n>] [--no-gitignore]

Options:
  --root <path>            Directory or file to fold. Defaults to the current working directory.
  --output <file>          Write Markdown to a file instead of stdout.
  --max-bytes <n>          Maximum total included bytes. Default: 200000.
  --max-file-bytes <n>     Maximum bytes for one included file. Default: 50000.
  --max-files <n>          Maximum included files. Default: 200.
  --max-tokens <n>         Approximate token budget for included content.
  --no-gitignore           Disable .gitignore loading. .sourcefoldignore still applies.
  --help                   Print this message.
  --version                Print the package version.
`;

interface CliIo {
  cwd: string;
  stdout(message: string): void;
  stderr(message: string): void;
  writeFile(filePath: string, content: string): Promise<void>;
  readPackageVersion(): Promise<string>;
}

export async function runCli(
  argv: string[],
  io: CliIo = createDefaultIo()
): Promise<number> {
  try {
    const parsed = await parseArguments(argv, io);
    if (parsed.kind === 'help') {
      io.stdout(HELP_TEXT);
      return 0;
    }

    if (parsed.kind === 'version') {
      io.stdout(`${await io.readPackageVersion()}\n`);
      return 0;
    }

    const result = await foldPath(parsed.options);
    const markdown = renderFoldedMarkdown(result);

    if (parsed.options.outputPath) {
      await io.writeFile(parsed.options.outputPath, markdown);
      io.stderr(
        `Wrote ${result.files.length} files to ${parsed.options.outputPath}\n`
      );
    } else {
      io.stdout(markdown);
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`sourcefold: ${message}\n`);
    return 1;
  }
}

async function parseArguments(
  argv: string[],
  io: CliIo
): Promise<
  { kind: 'help' } | { kind: 'version' } | { kind: 'run'; options: FoldOptions }
> {
  const options: FoldOptions = {
    rootPath: io.cwd,
    rootLabel: '.',
    maxBytes: 200_000,
    maxFileBytes: 50_000,
    maxFiles: 200,
    respectGitignore: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case '--help':
        return { kind: 'help' };
      case '--version':
        return { kind: 'version' };
      case '--no-gitignore':
        options.respectGitignore = false;
        break;
      case '--root': {
        const value = requireValue(argv, ++index, '--root');
        options.rootPath = path.resolve(io.cwd, value);
        options.rootLabel = value;
        break;
      }
      case '--output': {
        const value = requireValue(argv, ++index, '--output');
        options.outputPath = path.resolve(io.cwd, value);
        break;
      }
      case '--max-bytes':
        options.maxBytes = parsePositiveInteger(
          requireValue(argv, ++index, '--max-bytes'),
          '--max-bytes'
        );
        break;
      case '--max-file-bytes':
        options.maxFileBytes = parsePositiveInteger(
          requireValue(argv, ++index, '--max-file-bytes'),
          '--max-file-bytes'
        );
        break;
      case '--max-files':
        options.maxFiles = parsePositiveInteger(
          requireValue(argv, ++index, '--max-files'),
          '--max-files'
        );
        break;
      case '--max-tokens':
        options.maxTokens = parsePositiveInteger(
          requireValue(argv, ++index, '--max-tokens'),
          '--max-tokens'
        );
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return { kind: 'run', options };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return Number(value);
}

function createDefaultIo(): CliIo {
  return {
    cwd: process.cwd(),
    stdout(message: string): void {
      process.stdout.write(message);
    },
    stderr(message: string): void {
      process.stderr.write(message);
    },
    async writeFile(filePath: string, content: string): Promise<void> {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, 'utf8');
    },
    async readPackageVersion(): Promise<string> {
      const packageJson = await readFile(
        new URL('../../package.json', import.meta.url),
        'utf8'
      );
      const parsed = JSON.parse(packageJson) as { version?: string };
      return parsed.version ?? '0.0.0';
    },
  };
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const thisFilePath = fileURLToPath(import.meta.url);

if (entryPath && entryPath === thisFilePath) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
