/**
 * Capgate contracts — auditor-readable names, deny-by-default semantics.
 * Research-preview: shapes are stable enough for demos; not a production claim.
 */

export type DecisionOutcome = 'allow' | 'deny' | 'ask';

export type DenyReasonCode =
  | 'missing_token'
  | 'invalid_token'
  | 'expired_token'
  | 'audience_mismatch'
  | 'action_not_permitted'
  | 'tool_not_allowlisted'
  | 'server_not_allowlisted'
  | 'nonce_replay'
  | 'permit_invalid'
  | 'permit_expired'
  | 'max_steps_exceeded'
  | 'policy_deny'
  | 'escalation_required';

/** Agent-visible proposal. Never carries tool credentials or permit keys. */
export interface ToolCallProposal {
  proposalId: string;
  agentId: string;
  /** Downstream MCP server id from the gate allowlist. */
  serverId: string;
  toolName: string;
  /** JSON-serializable tool arguments. */
  arguments: Record<string, unknown>;
  /** Capability token presented by the agent (opaque string). */
  capabilityToken?: string;
  /** Optional client nonce for replay binding. */
  clientNonce?: string;
  requestedAt: string;
}

/** Allowlist entry bound into the harness config (not agent-writable). */
export interface AllowlistedTool {
  serverId: string;
  toolName: string;
  /** Audience string the capability token must match. */
  audience: string;
  /** Optional action constraint labels the token must include. */
  requiredActions?: string[];
}

export interface GateContract {
  contractId: string;
  /** Named agent principals allowed to propose under this contract. */
  agentIds: string[];
  allowlist: AllowlistedTool[];
  maxSteps: number;
  /** If true, unmatched allowlist hits become ask instead of deny. */
  escalateUnlisted?: boolean;
  /** Wall-clock permit TTL in seconds. */
  permitTtlSeconds: number;
}

export interface CapabilityClaims {
  tokenId: string;
  issuer: string;
  subject: string;
  audience: string;
  actions: string[];
  notBefore: string;
  expiresAt: string;
  nonce?: string;
}

export interface TokenVerifyResult {
  ok: boolean;
  claims?: CapabilityClaims;
  reasonCode?: DenyReasonCode;
  detail?: string;
}

export interface PolicyDecision {
  outcome: DecisionOutcome;
  reasonCode?: DenyReasonCode;
  detail: string;
  matchedAllowlist?: AllowlistedTool;
  claims?: CapabilityClaims;
  decidedAt: string;
}

/** Harness-signed permit. Executor rejects anything else. */
export interface ExecutionPermit {
  permitId: string;
  proposalId: string;
  contractId: string;
  agentId: string;
  serverId: string;
  toolName: string;
  /** Canonical hash of arguments the permit binds to. */
  argumentsHash: string;
  audience: string;
  tokenId: string;
  issuedAt: string;
  expiresAt: string;
  /** Detached signature over the permit body (hex). */
  signature: string;
}

export interface AuditEvent {
  seq: number;
  eventId: string;
  eventType:
    | 'proposal_received'
    | 'token_verified'
    | 'token_rejected'
    | 'decision'
    | 'permit_issued'
    | 'permit_rejected'
    | 'execution_forwarded'
    | 'execution_blocked';
  at: string;
  proposalId?: string;
  agentId?: string;
  serverId?: string;
  toolName?: string;
  outcome?: DecisionOutcome;
  reasonCode?: DenyReasonCode;
  detail?: string;
  permitId?: string;
  /** SHA-256 hex of prior event payload, or genesis zeros. */
  prevHash: string;
  /** SHA-256 hex of this event payload excluding this field. */
  eventHash: string;
}

export interface GateEvaluateResult {
  decision: PolicyDecision;
  permit?: ExecutionPermit;
  auditEvents: AuditEvent[];
}

export interface DownstreamToolCall {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ExecutorResult {
  forwarded: boolean;
  reasonCode?: DenyReasonCode;
  detail: string;
  call?: DownstreamToolCall;
  auditEvents: AuditEvent[];
}
