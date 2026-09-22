# Quick start

## Clone, install, build, and view the wiki

```bash
git clone https://github.com/SM260845/sourcefold-wiki.git
cd sourcefold-wiki
npm ci
npm run build
npm run dev
```

Open the local address printed by VitePress.

## Fold this repository

```bash
npm run fold -- --root . --output /tmp/sourcefold-wiki.md
```

Inspect the generated Markdown:

```bash
sed -n '1,120p' /tmp/sourcefold-wiki.md
```

## Fold the bundled example repository

```bash
npm run fold -- --root examples/tiny-repo --output /tmp/tiny-repo.md
```

## Explore behavior intentionally

Exercise the main operating modes with short probes:

```bash
npm run fold -- --root examples/tiny-repo --max-files 1
npm run fold -- --root examples/tiny-repo/src/index.ts
```

For a fuller exploration workflow, use [Exploration techniques and use cases](/exploration-techniques-and-use-cases).

## Validation workflow

Run the full local validation set before opening a pull request:

```bash
npm run lint
npm test
npm run format:check
npm run build
```
