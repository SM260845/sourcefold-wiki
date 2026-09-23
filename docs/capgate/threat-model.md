# Capgate threat model (research-preview)

## Assets

- Downstream tool capabilities (filesystem, shell, cloud APIs)
- Tool credentials held by executor-side MCP servers
- Permit signing key
- Audit integrity
- Capability token private minting material (operator-side)

## Adversaries

| Adversary                | Goal                    | Structural control                                                      |
| ------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| Prompt-injected agent    | Call unrestricted tools | No permit ⇒ executor does not forward                                   |
| Stolen agent session     | Reuse broad authority   | Audience-scoped + action-scoped tokens; short TTL                       |
| Confused deputy MCP host | Skip policy             | Host must route `tools/call` only through Capgate proxy                 |
| Log scraper              | Harvest secrets         | Tokens/keys never written to audit; demo tokens still treated sensitive |
| Audit tamper             | Hide deny/allow         | Hash chain verification                                                 |

## Explicit non-goals (v0)

- Stopping a compromised host OS that can ptrace the harness
- Multi-tenant cloud isolation
- Formal verification of the policy engine
- Military / dual-use tooling

## Deny reasons (stable codes)

`missing_token`, `invalid_token`, `expired_token`, `audience_mismatch`, `action_not_permitted`, `tool_not_allowlisted`, `server_not_allowlisted`, `nonce_replay`, `permit_invalid`, `permit_expired`, `max_steps_exceeded`, `policy_deny`, `escalation_required`

## Residual risks (honest)

- Demo HMAC verifier is not atHome Ed25519 protocol — demos must be labeled
- In-process harness+executor shares memory until split into separate processes
- MCP hosts that bypass the proxy defeat the gate (deployment constraint, not a prompt fix)
- Research-preview: no production readiness claim
