import { createHash } from 'node:crypto';

/**
 * Deterministic JSON canonicalization (JCS-ish): sorted object keys, no whitespace.
 * Arrays keep order. Used for argument binding, permits, and audit hashes.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  const input = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    sorted[key] = sortValue(input[key]);
  }
  return sorted;
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashArguments(args: Record<string, unknown>): string {
  return sha256Hex(canonicalJson(args));
}

export const GENESIS_HASH = '0'.repeat(64);
