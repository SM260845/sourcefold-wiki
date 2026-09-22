# Exploration techniques and use cases

This page records practical `sourcefold` workflows, the techniques used to exercise them, and the current observed results in this repository.

## Test and validation results

The current validation set is:

```bash
npm run lint
npm test
npm run format:check
npm run build
```

The repository also supports a direct exploratory run after build:

```bash
npm run fold -- --root examples/tiny-repo --output /tmp/tiny-repo.md
```

Observed results on the current tree:

- Lint passes.
- Unit tests pass.
- Prettier format checks pass.
- The CLI build and VitePress site build pass.
- Folding `examples/tiny-repo` produces a deterministic Markdown bundle.

## Exploration techniques

### Start with a small known tree

Use `examples/tiny-repo` to verify output shape before folding a larger repository:

```bash
npm run fold -- --root examples/tiny-repo --output /tmp/tiny-repo.md
sed -n '1,120p' /tmp/tiny-repo.md
```

This technique makes it easy to inspect:

- header metadata
- file tree rendering
- language fence selection
- skipped-entry reporting

### Probe limit behavior deliberately

Use small budgets to confirm how the scanner stops or skips content:

```bash
npm run fold -- --root examples/tiny-repo --max-files 1
npm run fold -- --root . --max-file-bytes 4096 --max-bytes 20000
```

Use this technique when preparing bundles for systems with strict context ceilings.

### Exercise single-file mode

Fold one file when only a narrow slice of a repository matters:

```bash
npm run fold -- --root examples/tiny-repo/src/index.ts
```

Single-file mode is useful for:

- focused prompt inputs
- minimal bug reproduction artifacts
- sharing one configuration or entrypoint without the full tree

### Keep project-specific exclusions in `.sourcefoldignore`

Use `.sourcefoldignore` for Sourcefold-specific omissions that should not affect normal Git tracking rules. Use `--no-gitignore` when the scan should ignore `.gitignore` but still respect `.sourcefoldignore`.

This technique helps when:

- build outputs should stay in Git but out of LLM bundles
- review artifacts need different exclusions than developer workflows
- one-time analysis should include paths normally excluded by `.gitignore`

## Established use cases

### Repository handoff bundles

Fold a repository into one Markdown file before passing it to another tool or reviewer:

```bash
npm run fold -- --root . --output /tmp/sourcefold-wiki.md
```

Use this for:

- LLM ingestion
- design review packets
- lightweight archival snapshots

### Security-aware local summarization

The default scanner skips symlinks, common secret-bearing files, binaries, and files that exceed configured limits. Use the skipped-entry section to confirm what stayed out of the bundle.

### Deterministic documentation fixtures

Use Sourcefold to create stable Markdown snapshots from small fixture repositories. This is useful for:

- reproducible tests
- documentation examples
- regression comparisons after scanner changes

## Techniques that proved important during exploration

- Build before running `npm run fold`, because the script executes the compiled CLI from `dist/`.
- Keep exploratory roots stable while scanning; the fold engine now tolerates disappearing files by marking them as `unsupported`, but stable trees produce the clearest results.
- Reject malformed numeric flags early so budget controls remain predictable.
