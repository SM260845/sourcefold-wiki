# Sourcefold Wiki

Sourcefold turns a local software tree into one structured Markdown document that preserves paths, language fences, ignore rules, and practical LLM ingestion limits.

Use this repository for two purposes:

- Learn the Sourcefold contract and operational limits.
- Run the reference `sourcefold` CLI against this repository or any local directory.

## Why fold a repository

Folding produces a single artifact that is easier to move between tools, archive with prompts, diff in review, or feed into systems that expect plain Markdown.

## What this wiki covers

- The output format and stability contract
- Ignore and inclusion behavior
- Security boundaries and skip rules
- CLI flags and local workflows
- Exploration techniques and established use cases
- Contribution requirements for docs and code
- Capgate research-preview architecture (MCP capability-token gate)

## Start here

1. Follow the [Quick start](/quick-start).
2. Review the [Format spec](/format-spec).
3. Validate assumptions with the [CLI reference](/cli-reference).
4. Apply the [Exploration techniques and use cases](/exploration-techniques-and-use-cases).
5. Review [Capgate](/capgate/) if you need a fail-closed MCP tool gate design.
