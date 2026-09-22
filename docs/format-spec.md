# Format spec

The `sourcefold` CLI emits a deterministic Markdown document with four sections.

## 1. Document header

The document starts with `# Sourcefold Bundle` followed by bullet metadata:

- Root label
- Included file count
- Included byte count
- Estimated token count

## 2. File tree block

The file tree is rendered under `## File Tree` inside a fenced `text` block. Directories end with `/`. Entries are sorted lexicographically.

## 3. Per-file sections

Each included file is rendered under `## Files` using this contract:

- A level-three heading containing the relative path in backticks
- A bullet list for byte size and language tag
- A fenced code block whose fence language is derived from the file extension

Empty files still receive a fenced block.

## 4. Skipped entries

`## Skipped Entries` lists relative paths and a normalized reason when the scanner excludes an entry. Expected reasons include `ignored`, `sensitive`, `binary`, `symlink`, `file-too-large`, `budget-exceeded`, `file-limit-reached`, and `unsupported`.

## Limits

- `--max-file-bytes` applies to a single file before decoding.
- `--max-bytes` applies to the sum of included file bytes.
- `--max-tokens` applies to an approximate token estimate based on UTF-8 byte length.
- `--max-files` stops inclusion after the configured number of accepted files.

## Stability notes

The output is deterministic for a fixed tree and a fixed set of flags. Ordering depends on normalized relative paths, not filesystem traversal order.
