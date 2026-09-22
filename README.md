# sourcefold-wiki

Sourcefold Wiki is a public static knowledge base for Sourcefold and a reference implementation of the `sourcefold` CLI. Use it to learn the folding format, understand ignore and security rules, and generate a single Markdown artifact from any local repository.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Use the CLI

Build the CLI, then fold a repository with the compiled binary:

```bash
git clone https://github.com/SM260845/sourcefold-wiki.git
cd sourcefold-wiki
npm ci
npm run build:cli
node dist/cli/index.js --root . --output /tmp/sourcefold-wiki.md
```

### Dogfood via `npm pack`

Install a local tarball to exercise the published `sourcefold` binary path before a registry release:

```bash
npm pack
npm install -g ./sourcefold-wiki-0.1.0.tgz
sourcefold --version
```

### Install from the npm registry (after publish)

This package is **not** published to npm yet (`npm install -g sourcefold-wiki` returns 404). After a registry publish:

```bash
npm install -g sourcefold-wiki
sourcefold --version
```

## Contributor workflow

Clone the repository and run the local toolchain:

```bash
git clone https://github.com/SM260845/sourcefold-wiki.git
cd sourcefold-wiki
npm ci
npm run lint
npm test
npm run format:check
npm run build
npm run dev
```

Open the local VitePress URL printed by `npm run dev`.

## Available commands

- `npm run dev` — serve the wiki locally
- `npm run build` — build the CLI and static site (also runs CLI `--help` / `--version` smoke)
- `npm run build:cli` — compile the CLI to `dist/`
- `npm run build:docs` — build the VitePress site
- `npm run smoke:cli` — run `node dist/cli/index.js --help` and `--version`
- `npm run fold -- --root <path> --output <file>` — fold a directory or file into Markdown
- `npm test` — run unit tests
- `npm run lint` — run ESLint
- `npm run format:check` — verify Prettier formatting

## Repository layout

- `docs/` — VitePress wiki content
- `src/cli/` — CLI entry point
- `src/lib/` — fold engine, ignore rules, rendering, and budgets
- `test/` — unit tests and fixture trees
- `examples/tiny-repo/` — small example used by docs and tests

## Documentation

Start with these pages after launching the site:

- `/quick-start`
- `/format-spec`
- `/ignore-and-inclusion-rules`
- `/security-and-threat-model`
- `/cli-reference`
- `/contributing`

## License

This repository is licensed under the MIT License. See `/LICENSE`.
