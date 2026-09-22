# Quick start

## Fold with the sourcefold binary

Build the CLI, then fold this repository with the compiled binary:

```bash
git clone https://github.com/SM260845/sourcefold-wiki.git
cd sourcefold-wiki
npm ci
npm run build:cli
node dist/cli/index.js --root . --output /tmp/sourcefold-wiki.md
```

Inspect the generated Markdown:

```bash
sed -n '1,120p' /tmp/sourcefold-wiki.md
```

## Dogfood via `npm pack`

The package is **not** on the npm registry yet. To exercise the global `sourcefold` binary from a local tarball:

```bash
npm pack
npm install -g ./sourcefold-wiki-0.1.0.tgz
sourcefold --version
```

After a registry publish, `npm install -g sourcefold-wiki` will be the install path.

## Explore with the binary

Exercise the main operating modes with short probes:

```bash
node dist/cli/index.js --root examples/tiny-repo --output /tmp/tiny-repo.md
node dist/cli/index.js --root examples/tiny-repo --max-files 1
node dist/cli/index.js --root examples/tiny-repo/src/index.ts
```

For a fuller exploration workflow, use [Exploration techniques and use cases](/exploration-techniques-and-use-cases).

## View the wiki locally

```bash
npm run build
npm run dev
```

Open the local address printed by VitePress.

## Validation workflow

Run the full local validation set before opening a pull request:

```bash
npm run lint
npm test
npm run format:check
npm run build
```

`npm run build` compiles the CLI and docs, then smokes `node dist/cli/index.js --help` and `--version` via the `postbuild` script.
