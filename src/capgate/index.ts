/**
 * Capgate — fail-closed capability-token MCP tool gate (research-preview).
 *
 * Invariant: agent cannot reach tools except authorize → permit → execute.
 */
export {
  canonicalJson,
  GENESIS_HASH,
  hashArguments,
  sha256Hex,
} from './canonical.js';
export { AuditLog } from './audit.js';
export { CapgateHarness } from './gate.js';
export type { CapgateHarnessOptions } from './gate.js';
export {
  McpToolGateProxy,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpProxyConfig,
  type McpToolsCallParams,
} from './mcp-proxy.js';
export { evaluateProposal } from './policy.js';
export { PermitIssuer } from './permit.js';
export {
  AtHomeVerifierAdapter,
  LocalDemoTokenVerifier,
  type CapabilityTokenVerifier,
  type DemoTokenBody,
} from './token.js';
export type {
  AllowlistedTool,
  AuditEvent,
  CapabilityClaims,
  DecisionOutcome,
  DenyReasonCode,
  DownstreamToolCall,
  ExecutionPermit,
  ExecutorResult,
  GateContract,
  GateEvaluateResult,
  PolicyDecision,
  TokenVerifyResult,
  ToolCallProposal,
} from './types.js';

export const CAPGATE_STATUS = 'research-preview' as const;
export const CAPGATE_INVARIANT =
  'agent cannot reach tools except authorize → permit → execute' as const;
