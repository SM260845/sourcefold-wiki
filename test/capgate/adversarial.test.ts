import { describe, expect, it } from 'vitest';
import {
  CapgateHarness,
  LocalDemoTokenVerifier,
  McpToolGateProxy,
  type GateContract,
  type ToolCallProposal,
} from '../../src/capgate/index.js';

const FIXED_NOW = new Date('2026-09-23T08:00:00.000Z');

function baseContract(): GateContract {
  return {
    contractId: 'ctr-fs-demo',
    agentIds: ['agent@local'],
    maxSteps: 5,
    permitTtlSeconds: 60,
    allowlist: [
      {
        serverId: 'fs',
        toolName: 'read_file',
        audience: 'mcp:fs:read_file',
        requiredActions: ['read'],
      },
    ],
  };
}

function mintReadToken(
  verifier: LocalDemoTokenVerifier,
  overrides: Partial<{
    audience: string;
    actions: string[];
    subject: string;
    nonce: string;
    expiresAt: string;
  }> = {}
): string {
  return verifier.mint({
    tokenId: 'tok-1',
    issuer: 'operator@local',
    subject: overrides.subject ?? 'agent@local',
    audience: overrides.audience ?? 'mcp:fs:read_file',
    actions: overrides.actions ?? ['read'],
    notBefore: '2026-09-23T00:00:00.000Z',
    expiresAt: overrides.expiresAt ?? '2026-09-24T00:00:00.000Z',
    nonce: overrides.nonce,
  });
}

function proposal(
  token: string | undefined,
  extra: Partial<ToolCallProposal> = {}
): ToolCallProposal {
  return {
    proposalId: 'prop-1',
    agentId: 'agent@local',
    serverId: 'fs',
    toolName: 'read_file',
    arguments: { path: '/tmp/x' },
    capabilityToken: token,
    requestedAt: FIXED_NOW.toISOString(),
    ...extra,
  };
}

function harness(verifier: LocalDemoTokenVerifier): CapgateHarness {
  return new CapgateHarness({
    contract: baseContract(),
    verifier,
    permitKey: Buffer.from('ab'.repeat(32), 'hex'),
    clock: () => FIXED_NOW,
  });
}

describe('Capgate adversarial paths', () => {
  it('denies tools/call without capability token', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const h = harness(verifier);
    const result = h.evaluate(proposal(undefined));
    expect(result.decision.outcome).toBe('deny');
    expect(result.decision.reasonCode).toBe('missing_token');
    expect(result.permit).toBeUndefined();
    const exec = h.execute(proposal(undefined), undefined);
    expect(exec.forwarded).toBe(false);
  });

  it('denies wrong audience even with valid signature', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const token = mintReadToken(verifier, {
      audience: 'mcp:fs:write_file',
    });
    const result = harness(verifier).evaluate(proposal(token));
    expect(result.decision.outcome).toBe('deny');
    expect(result.decision.reasonCode).toBe('audience_mismatch');
  });

  it('denies allowlisted tool when required action missing', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const token = mintReadToken(verifier, { actions: ['list'] });
    const result = harness(verifier).evaluate(proposal(token));
    expect(result.decision.outcome).toBe('deny');
    expect(result.decision.reasonCode).toBe('action_not_permitted');
  });

  it('denies nonce replay', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const token = mintReadToken(verifier, { nonce: 'n-1' });
    const h = harness(verifier);
    const first = h.evaluate(proposal(token, { proposalId: 'p1' }));
    expect(first.decision.outcome).toBe('allow');
    const second = h.evaluate(proposal(token, { proposalId: 'p2' }));
    expect(second.decision.outcome).toBe('deny');
    expect(second.decision.reasonCode).toBe('nonce_replay');
  });

  it('allows scoped token then forwards only with signed permit', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const token = mintReadToken(verifier);
    const h = harness(verifier);
    const prop = proposal(token);
    const evaluated = h.evaluate(prop);
    expect(evaluated.decision.outcome).toBe('allow');
    expect(evaluated.permit).toBeDefined();

    const blocked = h.execute(prop, undefined);
    expect(blocked.forwarded).toBe(false);

    const tampered = {
      ...evaluated.permit!,
      toolName: 'write_file',
    };
    const rejected = h.execute(prop, tampered);
    expect(rejected.forwarded).toBe(false);
    expect(rejected.reasonCode).toBe('permit_invalid');

    const ok = h.execute(prop, evaluated.permit);
    expect(ok.forwarded).toBe(true);
    expect(ok.call?.toolName).toBe('read_file');
  });

  it('blocks argument mutation after permit issue', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const token = mintReadToken(verifier);
    const h = harness(verifier);
    const prop = proposal(token);
    const evaluated = h.evaluate(prop);
    const mutated: ToolCallProposal = {
      ...prop,
      arguments: { path: '/etc/passwd' },
    };
    const exec = h.execute(mutated, evaluated.permit);
    expect(exec.forwarded).toBe(false);
    expect(exec.detail).toMatch(/arguments binding/);
  });

  it('MCP proxy never calls forward on deny', async () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const h = harness(verifier);
    let forwardCount = 0;
    const proxy = new McpToolGateProxy({
      harness: h,
      defaultServerId: 'fs',
      defaultAgentId: 'agent@local',
      forward: () => {
        forwardCount += 1;
        return { content: [{ type: 'text', text: 'secret' }] };
      },
    });

    const denied = await proxy.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'read_file', arguments: { path: 'x' } },
    });
    expect(denied.error).toBeDefined();
    expect((denied.error?.data as { reasonCode?: string })?.reasonCode).toBe(
      'missing_token'
    );
    expect(forwardCount).toBe(0);

    const token = mintReadToken(verifier);
    const allowed = await proxy.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: 'x' },
        _capgate: {
          capabilityToken: token,
          proposalId: 'prop-ok',
        },
      },
    });
    expect(allowed.error).toBeUndefined();
    expect(allowed.result).toEqual({
      content: [{ type: 'text', text: 'secret' }],
    });
    expect(forwardCount).toBe(1);
  });

  it('keeps hash-chained audit explaining deny and allow', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const h = harness(verifier);
    h.evaluate(proposal(undefined, { proposalId: 'deny-me' }));
    const token = mintReadToken(verifier);
    h.evaluate(proposal(token, { proposalId: 'allow-me' }));
    const chain = h.audit.verifyChain();
    expect(chain.ok).toBe(true);
    const outcomes = h.audit
      .list()
      .filter((e) => e.eventType === 'decision')
      .map((e) => e.outcome);
    expect(outcomes).toEqual(['deny', 'allow']);
  });

  it('rejects transitive delegation to unnamed agent', () => {
    const verifier = new LocalDemoTokenVerifier(
      Buffer.from('cd'.repeat(32), 'hex'),
      () => FIXED_NOW
    );
    const token = mintReadToken(verifier, { subject: 'other-agent' });
    const result = harness(verifier).evaluate(
      proposal(token, { agentId: 'agent@local' })
    );
    expect(result.decision.outcome).toBe('deny');
    expect(result.decision.reasonCode).toBe('policy_deny');
  });
});
