import { cp, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const FIXTURES_ROOT = path.resolve('test/fixtures');

export async function copyFixture(name: string): Promise<string> {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'sourcefold-'));
  const fixtureRoot = path.join(FIXTURES_ROOT, name);
  const destination = path.join(tempDirectory, name);
  await cp(fixtureRoot, destination, { recursive: true });
  return destination;
}

export async function removeTempDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}
