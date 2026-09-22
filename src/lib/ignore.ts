import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';

const DEFAULT_PATTERNS = [
  '.git/',
  'node_modules/',
  'dist/',
  'coverage/',
  'docs/.vitepress/cache/',
  'docs/.vitepress/dist/'
];

const SENSITIVE_PATTERNS = [
  '.env',
  '.env.*',
  '.npmrc',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '*.crt',
  '*.cer',
  '*.der',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  '**/id_rsa',
  '**/id_dsa',
  '**/id_ecdsa',
  '**/id_ed25519'
];

export interface IgnoreMatcher {
  isIgnored(relativePath: string, isDirectory: boolean): boolean;
  isSensitive(relativePath: string): boolean;
}

export async function createIgnoreMatcher(options: {
  rootDirectory: string;
  respectGitignore: boolean;
  extraIgnoredPaths?: string[];
}): Promise<IgnoreMatcher> {
  const projectMatcher = ignore().add(DEFAULT_PATTERNS);
  const sensitiveMatcher = ignore().add(SENSITIVE_PATTERNS);

  for (const entry of options.extraIgnoredPaths ?? []) {
    projectMatcher.add(toIgnorePath(entry, false));
  }

  if (options.respectGitignore) {
    for (const fileName of ['.gitignore', '.sourcefoldignore']) {
      const filePath = path.join(options.rootDirectory, fileName);

      try {
        const content = await readFile(filePath, 'utf8');
        projectMatcher.add(content);
      } catch (error) {
        if (!isMissingFileError(error)) {
          throw error;
        }
      }
    }
  } else {
    const filePath = path.join(options.rootDirectory, '.sourcefoldignore');

    try {
      const content = await readFile(filePath, 'utf8');
      projectMatcher.add(content);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  return {
    isIgnored(relativePath: string, isDirectory: boolean): boolean {
      return projectMatcher.ignores(toIgnorePath(relativePath, isDirectory));
    },
    isSensitive(relativePath: string): boolean {
      return sensitiveMatcher.ignores(toIgnorePath(relativePath, false));
    }
  };
}

function toIgnorePath(relativePath: string, isDirectory: boolean): string {
  const normalized = relativePath.split(path.sep).join('/').replace(/^\.\//, '');
  return isDirectory && normalized.length > 0 && !normalized.endsWith('/')
    ? `${normalized}/`
    : normalized;
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
