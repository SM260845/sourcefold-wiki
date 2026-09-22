# CLI reference

## Synopsis

```bash
sourcefold [--root <path>] [--output <file>] [--max-bytes <n>] [--max-file-bytes <n>] [--max-files <n>] [--max-tokens <n>] [--no-gitignore]
```

## Flags

- `--root <path>` — directory or file to fold. Defaults to the current working directory.
- `--output <file>` — write the Markdown bundle to a file. Defaults to standard output.
- `--max-bytes <n>` — maximum sum of included file bytes. Default: `200000`.
- `--max-file-bytes <n>` — maximum size of one included file in bytes. Default: `50000`.
- `--max-files <n>` — maximum number of included files. Default: `200`.
- `--max-tokens <n>` — optional approximate token budget across included files.
- `--no-gitignore` — disable `.gitignore` loading. `.sourcefoldignore` still applies.
- `--help` — print usage.
- `--version` — print the package version.

## Exit codes

- `0` — success
- `1` — invalid arguments or runtime failure

## Examples

Fold the current repository:

```bash
npm run fold -- --root . --output /tmp/repo.md
```

Fold a single file with a small budget:

```bash
npm run fold -- --root README.md --max-file-bytes 4096
```
