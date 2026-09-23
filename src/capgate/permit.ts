import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { canonicalJson, hashArguments } from './canonical.js';
import type {
  CapabilityClaims,
  ExecutionPermit,
  GateContract,
  ToolCallProposal,
} from './types.js';

export interface PermitBody {
  permitId: string;
  proposalId: string;
  contractId: string;
  agentId: string;
  serverId: string;
  toolName: string;
  argumentsHash: string;
  audience: string;
  tokenId: string;
  issuedAt: string;
  expiresAt: string;
}

/**
 * Permit key lives only in the harness/executor process.
 * Agent never sees this key; unsigned or foreign permits are structurally useless.
 */
export class PermitIssuer {
  constructor(
    private readonly permitKey: Buffer,
    private readonly clock: () => Date = () => new Date()
  ) {}

  issue(
    proposal: ToolCallProposal,
    contract: GateContract,
    claims: CapabilityClaims
  ): ExecutionPermit {
    const now = this.clock();
    const body: PermitBody = {
      permitId: randomUUID(),
      proposalId: proposal.proposalId,
      contractId: contract.contractId,
      agentId: proposal.agentId,
      serverId: proposal.serverId,
      toolName: proposal.toolName,
      argumentsHash: hashArguments(proposal.arguments),
      audience: claims.audience,
      tokenId: claims.tokenId,
      issuedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + contract.permitTtlSeconds * 1000
      ).toISOString(),
    };
    const signature = signBody(this.permitKey, body);
    return { ...body, signature };
  }

  verify(
    permit: ExecutionPermit,
    proposal: ToolCallProposal
  ): { ok: true } | { ok: false; detail: string } {
    const { signature, ...body } = permit;
    const expected = signBody(this.permitKey, body);
    if (!timingSafeStringEqual(signature, expected)) {
      return { ok: false, detail: 'permit signature mismatch' };
    }
    if (permit.proposalId !== proposal.proposalId) {
      return { ok: false, detail: 'permit proposal binding mismatch' };
    }
    if (permit.agentId !== proposal.agentId) {
      return { ok: false, detail: 'permit agent binding mismatch' };
    }
    if (
      permit.serverId !== proposal.serverId ||
      permit.toolName !== proposal.toolName
    ) {
      return { ok: false, detail: 'permit tool binding mismatch' };
    }
    const argsHash = hashArguments(proposal.arguments);
    if (permit.argumentsHash !== argsHash) {
      return { ok: false, detail: 'permit arguments binding mismatch' };
    }
    const now = this.clock().getTime();
    if (now >= Date.parse(permit.expiresAt)) {
      return { ok: false, detail: 'permit expired' };
    }
    return { ok: true };
  }
}

function signBody(key: Buffer, body: PermitBody): string {
  return createHmac('sha256', key).update(canonicalJson(body)).digest('hex');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}
