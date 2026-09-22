export type SkipReason =
  | 'ignored'
  | 'sensitive'
  | 'binary'
  | 'symlink'
  | 'file-too-large'
  | 'budget-exceeded'
  | 'file-limit-reached'
  | 'unsupported';

export interface FoldOptions {
  rootPath: string;
  rootLabel?: string;
  outputPath?: string;
  maxBytes: number;
  maxFileBytes: number;
  maxFiles: number;
  maxTokens?: number;
  respectGitignore: boolean;
}

export interface FoldFile {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  estimatedTokens: number;
  language: string;
  content: string;
}

export interface SkippedEntry {
  relativePath: string;
  reason: SkipReason;
}

export interface FoldResult {
  rootDirectory: string;
  rootLabel: string;
  files: FoldFile[];
  skipped: SkippedEntry[];
  totals: {
    files: number;
    bytes: number;
    estimatedTokens: number;
  };
  tree: string;
}
