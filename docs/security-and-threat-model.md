# Security and threat model

`sourcefold` is designed for local repository summarization, not for privileged backup or forensic workloads.

## Threat model

The primary risks are:

- Accidental disclosure of secrets
- Escaping the requested root through symlinks
- Inflating output with large or binary files
- Producing artifacts too large for downstream LLM tooling

## Implemented safeguards

- The scanner uses `lstat` and skips all symbolic links.
- The scanner does not read paths outside the requested root.
- Sensitive file patterns are skipped before content is rendered.
- Binary detection rejects files containing NUL bytes in the first inspected chunk.
- File, byte, and token budgets are enforced before content is appended.

## Operational limits

Review the generated `## Skipped Entries` section before sharing a bundle. A path that matters may have been excluded by ignore rules or budgets.

The CLI does not redact secrets inside otherwise allowed files. If a tracked source file contains secrets, the generated bundle will contain them too.

## Recommended use

- Run the CLI against clean working trees.
- Keep `.sourcefoldignore` under version control when a repository needs project-specific exclusions.
- Lower `--max-file-bytes` and `--max-tokens` when preparing artifacts for external systems.
