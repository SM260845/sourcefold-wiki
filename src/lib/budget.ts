export function estimateTokens(content: string): number {
  return Math.max(1, Math.ceil(Buffer.byteLength(content, 'utf8') / 4));
}

export function wouldExceedBudget(input: {
  currentBytes: number;
  currentTokens: number;
  nextBytes: number;
  nextTokens: number;
  maxBytes: number;
  maxTokens?: number;
}): boolean {
  if (input.currentBytes + input.nextBytes > input.maxBytes) {
    return true;
  }

  if (
    typeof input.maxTokens === 'number' &&
    input.currentTokens + input.nextTokens > input.maxTokens
  ) {
    return true;
  }

  return false;
}
