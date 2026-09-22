# Security Policy

## Supported versions

Security fixes are applied on the default branch.

## Reporting a vulnerability

Use GitHub Security Advisories to report a vulnerability privately.

Do not open a public issue for a suspected vulnerability until a fix is available. Include a clear description of the impact, the affected paths, and reproduction steps when possible.

## Repository safeguards

The `sourcefold` CLI is designed to avoid common disclosure and traversal risks by skipping symlinks, sensitive file patterns, and binary content by default. Review `docs/security-and-threat-model.md` before widening those limits.
