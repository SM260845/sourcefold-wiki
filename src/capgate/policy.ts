import type { CapabilityTokenVerifier } from './token.js';
import type {
  AllowlistedTool,
  GateContract,
  PolicyDecision,
  ToolCallProposal,
} from './types.js';

export interface PolicyEngineOptions {
  contract: GateContract;
  verifier: CapabilityTokenVerifier;
  clock?: () => Date;
  /** Steps already consumed under this contract for the agent. */
  stepsUsed?: number;
}

/**
 * Deterministic deny-by-default policy.
 * Order: contract agent → max steps → allowlist → token → actions.
 */
export function evaluateProposal(
  proposal: ToolCallProposal,
  options: PolicyEngineOptions
): PolicyDecision {
  const clock = options.clock ?? (() => new Date());
  const at = clock().toISOString();
  const { contract, verifier } = options;
  const stepsUsed = options.stepsUsed ?? 0;

  if (!contract.agentIds.includes(proposal.agentId)) {
    return deny(
      at,
      'policy_deny',
      `agent ${proposal.agentId} not named in contract ${contract.contractId}`
    );
  }

  if (stepsUsed >= contract.maxSteps) {
    return deny(
      at,
      'max_steps_exceeded',
      `maxSteps ${contract.maxSteps} already consumed`
    );
  }

  const match = findAllowlistEntry(
    contract.allowlist,
    proposal.serverId,
    proposal.toolName
  );

  if (!match) {
    if (contract.escalateUnlisted) {
      return {
        outcome: 'ask',
        reasonCode: 'escalation_required',
        detail: `tool ${proposal.serverId}/${proposal.toolName} not allowlisted; escalation required`,
        decidedAt: at,
      };
    }
    return deny(
      at,
      'tool_not_allowlisted',
      `no allowlist entry for ${proposal.serverId}/${proposal.toolName}`
    );
  }

  if (!proposal.capabilityToken) {
    return deny(at, 'missing_token', 'capability token required on tools/call');
  }

  const verified = verifier.verify(proposal.capabilityToken, match.audience);
  if (!verified.ok || !verified.claims) {
    return deny(
      at,
      verified.reasonCode ?? 'invalid_token',
      verified.detail ?? 'token verification failed'
    );
  }

  const required = match.requiredActions ?? [];
  for (const action of required) {
    if (!verified.claims.actions.includes(action)) {
      return deny(
        at,
        'action_not_permitted',
        `token missing required action ${action}`
      );
    }
  }

  // Non-transitive: subject must match proposing agent unless contract lists both.
  if (
    verified.claims.subject !== proposal.agentId &&
    !contract.agentIds.includes(verified.claims.subject)
  ) {
    return deny(
      at,
      'policy_deny',
      `token subject ${verified.claims.subject} cannot delegate to ${proposal.agentId}`
    );
  }

  return {
    outcome: 'allow',
    detail: `allow ${proposal.serverId}/${proposal.toolName} under ${contract.contractId}`,
    matchedAllowlist: match,
    claims: verified.claims,
    decidedAt: at,
  };
}

function findAllowlistEntry(
  allowlist: AllowlistedTool[],
  serverId: string,
  toolName: string
): AllowlistedTool | undefined {
  return allowlist.find(
    (entry) => entry.serverId === serverId && entry.toolName === toolName
  );
}

function deny(
  at: string,
  reasonCode: PolicyDecision['reasonCode'],
  detail: string
): PolicyDecision {
  return {
    outcome: 'deny',
    reasonCode,
    detail,
    decidedAt: at,
  };
}
