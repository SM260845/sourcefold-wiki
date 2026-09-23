import { AuditLog } from './audit.js';
import { evaluateProposal } from './policy.js';
import { PermitIssuer } from './permit.js';
import type { CapabilityTokenVerifier } from './token.js';
import type {
  ExecutorResult,
  GateContract,
  GateEvaluateResult,
  ToolCallProposal,
} from './types.js';

export interface CapgateHarnessOptions {
  contract: GateContract;
  verifier: CapabilityTokenVerifier;
  /** HMAC key for permits — harness memory only. */
  permitKey: Buffer;
  clock?: () => Date;
}

/**
 * Harness: proposal → decision → signed permit.
 * Executor path separately demands a valid permit before any downstream forward.
 */
export class CapgateHarness {
  readonly audit = new AuditLog();
  private stepsUsed = 0;
  private readonly issuer: PermitIssuer;
  private readonly clock: () => Date;

  constructor(private readonly options: CapgateHarnessOptions) {
    this.clock = options.clock ?? (() => new Date());
    this.issuer = new PermitIssuer(options.permitKey, this.clock);
  }

  evaluate(proposal: ToolCallProposal): GateEvaluateResult {
    const startedAt = this.clock().toISOString();
    this.audit.append({
      eventType: 'proposal_received',
      at: startedAt,
      proposalId: proposal.proposalId,
      agentId: proposal.agentId,
      serverId: proposal.serverId,
      toolName: proposal.toolName,
      detail: 'proposal accepted for evaluation',
    });

    const decision = evaluateProposal(proposal, {
      contract: this.options.contract,
      verifier: this.options.verifier,
      clock: this.clock,
      stepsUsed: this.stepsUsed,
    });

    if (decision.outcome === 'allow' && decision.claims) {
      this.audit.append({
        eventType: 'token_verified',
        at: decision.decidedAt,
        proposalId: proposal.proposalId,
        agentId: proposal.agentId,
        serverId: proposal.serverId,
        toolName: proposal.toolName,
        detail: `token ${decision.claims.tokenId} ok for audience ${decision.claims.audience}`,
      });
    } else if (
      decision.reasonCode === 'missing_token' ||
      decision.reasonCode === 'invalid_token' ||
      decision.reasonCode === 'expired_token' ||
      decision.reasonCode === 'audience_mismatch' ||
      decision.reasonCode === 'nonce_replay'
    ) {
      this.audit.append({
        eventType: 'token_rejected',
        at: decision.decidedAt,
        proposalId: proposal.proposalId,
        agentId: proposal.agentId,
        serverId: proposal.serverId,
        toolName: proposal.toolName,
        reasonCode: decision.reasonCode,
        detail: decision.detail,
      });
    }

    this.audit.decision({
      at: decision.decidedAt,
      proposalId: proposal.proposalId,
      agentId: proposal.agentId,
      serverId: proposal.serverId,
      toolName: proposal.toolName,
      outcome: decision.outcome,
      reasonCode: decision.reasonCode,
      detail: decision.detail,
    });

    if (decision.outcome !== 'allow' || !decision.claims) {
      return {
        decision,
        auditEvents: [...this.audit.list()],
      };
    }

    const permit = this.issuer.issue(
      proposal,
      this.options.contract,
      decision.claims
    );
    this.stepsUsed += 1;

    this.audit.append({
      eventType: 'permit_issued',
      at: permit.issuedAt,
      proposalId: proposal.proposalId,
      agentId: proposal.agentId,
      serverId: proposal.serverId,
      toolName: proposal.toolName,
      outcome: 'allow',
      permitId: permit.permitId,
      detail: `permit ${permit.permitId} ttl=${this.options.contract.permitTtlSeconds}s`,
    });

    return {
      decision,
      permit,
      auditEvents: [...this.audit.list()],
    };
  }

  /**
   * Executor: only forwards when permit verifies against the same proposal.
   * No permit ⇒ no tool reach. This is the structural boundary.
   */
  execute(
    proposal: ToolCallProposal,
    permit: GateEvaluateResult['permit']
  ): ExecutorResult {
    const at = this.clock().toISOString();
    if (!permit) {
      const blocked = this.audit.append({
        eventType: 'execution_blocked',
        at,
        proposalId: proposal.proposalId,
        agentId: proposal.agentId,
        serverId: proposal.serverId,
        toolName: proposal.toolName,
        reasonCode: 'permit_invalid',
        detail: 'execution requires harness-signed permit',
      });
      return {
        forwarded: false,
        reasonCode: 'permit_invalid',
        detail: 'execution requires harness-signed permit',
        auditEvents: [blocked],
      };
    }

    const verified = this.issuer.verify(permit, proposal);
    if (!verified.ok) {
      const reasonCode =
        verified.detail === 'permit expired'
          ? 'permit_expired'
          : 'permit_invalid';
      const blocked = this.audit.append({
        eventType: 'permit_rejected',
        at,
        proposalId: proposal.proposalId,
        agentId: proposal.agentId,
        serverId: proposal.serverId,
        toolName: proposal.toolName,
        reasonCode,
        permitId: permit.permitId,
        detail: verified.detail,
      });
      return {
        forwarded: false,
        reasonCode,
        detail: verified.detail,
        auditEvents: [blocked],
      };
    }

    const forwarded = this.audit.append({
      eventType: 'execution_forwarded',
      at,
      proposalId: proposal.proposalId,
      agentId: proposal.agentId,
      serverId: proposal.serverId,
      toolName: proposal.toolName,
      outcome: 'allow',
      permitId: permit.permitId,
      detail: 'forward to downstream MCP server',
    });

    return {
      forwarded: true,
      detail: 'forward to downstream MCP server',
      call: {
        serverId: proposal.serverId,
        toolName: proposal.toolName,
        arguments: proposal.arguments,
      },
      auditEvents: [forwarded],
    };
  }

  get stepsConsumed(): number {
    return this.stepsUsed;
  }
}
