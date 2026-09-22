# Ignore and inclusion rules

The scanner walks the requested root and evaluates entries in this order.

## Default exclusions

These paths are always ignored:

- `.git/`
- `node_modules/`
- `dist/`
- `coverage/`
- `docs/.vitepress/cache/`
- `docs/.vitepress/dist/`

## Project ignore files

When `--no-gitignore` is not set, the CLI loads:

- `.gitignore`
- `.sourcefoldignore`

Ignore rules are resolved relative to the selected root.

## Sensitive file protection

The CLI skips common secret-bearing paths even when they are not ignored elsewhere. Patterns include:

- `.env` and `.env.*`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`
- `.npmrc`

## Inclusion model

- Regular files are eligible for inclusion.
- Symbolic links are never followed.
- Binary files are skipped.
- Entries are included only while the file count, byte budget, and token budget permit it.

## Single-file mode

If `--root` points to a file, the CLI folds only that file and uses the parent directory as the ignore base.
