import { randomUUID } from 'node:crypto';
import { canonicalJson, GENESIS_HASH, sha256Hex } from './canonical.js';
import type { AuditEvent, DecisionOutcome, DenyReasonCode } from './types.js';

type AuditInput = Omit<
  AuditEvent,
  'seq' | 'eventId' | 'prevHash' | 'eventHash'
>;

/**
 * Tamper-evident append-only audit log. Hash chain binds each decision.
 * Does not store secrets, raw tokens, or permit keys.
 */
export class AuditLog {
  private events: AuditEvent[] = [];
  private lastHash: string = GENESIS_HASH;

  append(input: AuditInput): AuditEvent {
    const seq = this.events.length + 1;
    const eventId = randomUUID();
    const prevHash = this.lastHash;
    const withoutHash = {
      seq,
      eventId,
      ...input,
      prevHash,
    };
    const eventHash = sha256Hex(canonicalJson(withoutHash));
    const event: AuditEvent = { ...withoutHash, eventHash };
    this.events.push(event);
    this.lastHash = eventHash;
    return event;
  }

  decision(params: {
    at: string;
    proposalId: string;
    agentId: string;
    serverId: string;
    toolName: string;
    outcome: DecisionOutcome;
    reasonCode?: DenyReasonCode;
    detail: string;
  }): AuditEvent {
    return this.append({
      eventType: 'decision',
      at: params.at,
      proposalId: params.proposalId,
      agentId: params.agentId,
      serverId: params.serverId,
      toolName: params.toolName,
      outcome: params.outcome,
      reasonCode: params.reasonCode,
      detail: params.detail,
    });
  }

  list(): readonly AuditEvent[] {
    return this.events;
  }

  /** Verify chain integrity from genesis. */
  verifyChain(): { ok: true } | { ok: false; atSeq: number; detail: string } {
    let prev = GENESIS_HASH;
    for (const event of this.events) {
      if (event.prevHash !== prev) {
        return {
          ok: false,
          atSeq: event.seq,
          detail: `prevHash break at seq ${event.seq}`,
        };
      }
      const { eventHash, ...rest } = event;
      const expected = sha256Hex(canonicalJson(rest));
      if (expected !== eventHash) {
        return {
          ok: false,
          atSeq: event.seq,
          detail: `eventHash mismatch at seq ${event.seq}`,
        };
      }
      prev = eventHash;
    }
    return { ok: true };
  }
}
