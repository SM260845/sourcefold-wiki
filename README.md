# sourcefold-wiki

Sourcefold Wiki is a public static knowledge base for Sourcefold and a reference implementation of the `sourcefold` CLI. Use it to learn the folding format, understand ignore and security rules, and generate a single Markdown artifact from any local repository.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Quick start

```bash
git clone https://github.com/SM260845/sourcefold-wiki.git
cd sourcefold-wiki
npm ci
npm run build
npm run dev
```

Open the local VitePress URL printed by `npm run dev`.

In a separate terminal, fold this repository into one Markdown file:

```bash
npm run fold -- --root . --output /tmp/sourcefold-wiki.md
```

## Available commands

- `npm run dev` — serve the wiki locally
- `npm run build` — build the CLI and static site
- `npm run build:cli` — compile the CLI to `dist/`
- `npm run build:docs` — build the VitePress site
- `npm run fold -- --root <path> --output <file>` — fold a directory or file into Markdown
- `npm test` — run unit tests
- `npm run lint` — run ESLint
- `npm run format:check` — verify Prettier formatting

## Repository layout

- `docs/` — VitePress wiki content
- `src/cli/` — CLI entry point
- `src/lib/` — fold engine, ignore rules, rendering, and budgets
- `src/capgate/` — Capgate research-preview MCP tool gate core
- `test/` — unit tests and fixture trees
- `examples/tiny-repo/` — small example used by docs and tests
- `examples/capgate/` — sample gate contract and deny proposal

## Capgate (research-preview)

Fail-closed capability-token MCP tool gate co-located for architecture review.

- Invariant: agent cannot reach tools except authorize → permit → execute
- Docs: `/capgate/`, `/capgate/architecture`, `/capgate/threat-model`
- Tests: `npm test -- test/capgate`
- Status: **not production**

## Documentation

Start with these pages after launching the site:

- `/quick-start`
- `/format-spec`
- `/ignore-and-inclusion-rules`
- `/security-and-threat-model`
- `/cli-reference`
- `/capgate/`
- `/contributing`

## License

This repository is licensed under the MIT License. See `/LICENSE`.
