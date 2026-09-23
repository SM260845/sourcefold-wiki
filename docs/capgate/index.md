# Capgate

**Fail-closed capability-token MCP tool gate.**  
Research-preview. Not production.

> The agent proposes. The harness authorizes. The executor acts.  
> Unauthorized actions must be structurally unable to reach a tool.

## Read next

1. [Architecture](./architecture) — decision, split, contracts, code map
2. [Threat model](./threat-model) — adversaries, deny codes, residual risk

## Invariant

`agent cannot reach tools except authorize → permit → execute`

## Prove it locally

```bash
npm ci
npm test -- test/capgate
```

Adversarial suite covers: no token, wrong audience, missing action, nonce replay, permit tamper, argument mutation, MCP proxy forward suppression, audit hash chain.

## Relation to Sourcefold

This repository remains Sourcefold Wiki + fold CLI. Capgate is co-located as architecture and executable core so the boundary is reviewable in one PR. Publish path is a dedicated MIT `capgate` package; atHome stays the capability-token protocol (AGPL) behind a verifier adapter.
