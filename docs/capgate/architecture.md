# Capgate architecture (research-preview)

**Status:** research-preview — not production.  
**Invariant:** the agent cannot reach tools except `authorize → permit → execute`.  
**Host repo note:** this tree is `SM260845/sourcefold-wiki`. Capgate is scaffolded here as design + executable core; extract to a dedicated MIT package (`capgate`) when publishing.

## Decision

**Ship a fail-closed capability-token MCP tool gate**, not an agent framework, not an OAuth login proxy, not a Rampart fork.

| Option                                                              | Verdict        | Why                                                                         |
| ------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| A. Thin MCP proxy + capability tokens + signed permits + hash audit | **PICK**       | Moves the enforcement boundary; compounds with atHome tokens; capital-light |
| B. Full agent control plane first (ACS-class)                       | Reject v0      | Too wide; dry-run theatre risk                                              |
| C. Fork Rampart / OAuth MCP auth-proxy                              | Reject primary | Identity ≠ capability; competitor owns distribution                         |

**Justification:** Operators already run MCP hosts (Cursor, Claude Code, OpenClaw). The missing wedge is _delegable, revocable, audience-scoped tool authority_ with a structural gate. OAuth proves who connected; Capgate proves what may be called.

## System split

```text
┌─────────────┐     proposal      ┌──────────────────┐
│ Agent       │ ────────────────► │ Harness          │
│ (no tool    │                   │ - contract       │
│  creds, no  │                   │ - token verify   │
│  permit key)│                   │ - policy engine  │
└─────────────┘                   │ - permit issue   │
                                  │ - audit chain    │
                                  └────────┬─────────┘
                                           │ signed permit
                                           ▼
                                  ┌──────────────────┐     allowlist only
                                  │ Executor / Proxy │ ────────────────► MCP tool
                                  │ permit verify    │
                                  └──────────────────┘
```

- **Agent proposes** a `tools/call` (server, tool, args, capability token).
- **Harness authorizes** against a contract (named agents, allowlist, max steps).
- **Harness signs a permit** bound to proposal id, tool, and argument hash.
- **Executor forwards** only if the permit verifies. No permit ⇒ no socket to the tool server from the gated path.

## Contracts

### Gate contract

- `contractId`, `agentIds[]`, `allowlist[]`, `maxSteps`, `permitTtlSeconds`
- `escalateUnlisted` → `ask` instead of `deny` (still not execute)
- Allowlist rows: `serverId`, `toolName`, `audience`, `requiredActions[]`

### Capability token

- Verified via `CapabilityTokenVerifier` interface
- v0 ships `LocalDemoTokenVerifier` (HMAC demo) for offline proof
- Production path: `AtHomeVerifierAdapter` → atHome verify client (AGPL boundary stays outside the MIT gate core until explicitly vendored)

### Permit

- HMAC-signed by harness-only `permitKey`
- Binds: proposal, agent, server, tool, `argumentsHash`, token id, expiry
- Argument mutation after issue fails closed

### Audit

- Append-only events with `prevHash` / `eventHash` (SHA-256 over canonical JSON)
- Events name outcome and `reasonCode` without logging raw tokens or keys

## Policy order (deny-by-default)

1. Agent named in contract?
2. `maxSteps` remaining?
3. Tool on allowlist? (else deny or ask)
4. Capability token present?
5. Signature / expiry / audience / nonce?
6. Required actions present?
7. Non-transitive subject check
8. Else allow → issue permit

## MCP surface

`McpToolGateProxy` intercepts JSON-RPC `tools/call`. Extension bag `_capgate` carries token / agent / server / proposal ids. Unauthorized calls return JSON-RPC error `-32031` and **never** invoke `forward()`.

Full stdio/HTTP MCP SDK wiring is a next hardening step; the enforcement core does not depend on host packaging.

## What this is not

- Not a prompt library or “please obey” wrapper
- Not transitive delegation by default
- Not production-grade isolation (no gVisor/network policy yet)
- Not a replacement for atHome identity/protocol

## Code map

| Path                               | Role                                  |
| ---------------------------------- | ------------------------------------- |
| `src/capgate/types.ts`             | Contracts                             |
| `src/capgate/policy.ts`            | Deterministic policy                  |
| `src/capgate/token.ts`             | Verifier interface + demo mint/verify |
| `src/capgate/permit.ts`            | Signed permits                        |
| `src/capgate/audit.ts`             | Hash-chained audit                    |
| `src/capgate/gate.ts`              | Harness + executor boundary           |
| `src/capgate/mcp-proxy.ts`         | MCP `tools/call` gate                 |
| `test/capgate/adversarial.test.ts` | Adversarial proof                     |

## Next hardening (one line)

Wire real MCP stdio proxy + atHome verify client behind a clear license boundary, with process isolation so the agent cannot read `permitKey` or tool credentials.
