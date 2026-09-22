# Contributing

## Development workflow

1. Install dependencies with `npm ci`.
2. Start the local wiki with `npm run dev`.
3. Build the project with `npm run build`.
4. Run `npm run lint`, `npm test`, and `npm run format:check` before opening a pull request.

## Documentation scope

Keep the information architecture shallow. Add or update pages only when they clarify Sourcefold concepts, CLI behavior, ignore rules, security boundaries, or contribution practice.

## Code changes

- Keep the fold engine deterministic.
- Preserve the documented Markdown contract in `docs/format-spec.md`.
- Treat `.gitignore` and `.sourcefoldignore` as public behavior.
- Add or update tests for every behavior change.

## Pull requests

- Describe the problem and the resulting behavior.
- Include tests or a clear rationale when tests are not applicable.
- Keep changes focused and reviewable.

## Security

Do not commit secrets, private keys, or copied production data. Report vulnerabilities through GitHub Security Advisories as described in `SECURITY.md`.
