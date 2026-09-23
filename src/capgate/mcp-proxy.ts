import { CapgateHarness } from './gate.js';
import type { ExecutionPermit, ToolCallProposal } from './types.js';

/**
 * MCP JSON-RPC shapes Capgate intercepts. Full SDK transport is optional later;
 * the gate binds on tools/call semantics, not on a particular host binary.
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface McpToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
  /** Capgate extension: capability token on the call. */
  _capgate?: {
    capabilityToken?: string;
    agentId?: string;
    serverId?: string;
    proposalId?: string;
  };
}

export interface McpProxyConfig {
  harness: CapgateHarness;
  /** Default downstream server id when call omits _capgate.serverId. */
  defaultServerId: string;
  defaultAgentId: string;
  /**
   * Downstream forwarder. Harness already authorized; this only runs with a permit.
   * Production: real MCP client. Tests: mock.
   */
  forward: (call: {
    serverId: string;
    toolName: string;
    arguments: Record<string, unknown>;
    permit: ExecutionPermit;
  }) => Promise<unknown> | unknown;
}

const DENY_RPC_CODE = -32031;

/**
 * Thin MCP tools/call gate.
 * Unauthorized tools/call never reaches forward().
 */
export class McpToolGateProxy {
  constructor(private readonly config: McpProxyConfig) {}

  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;
    if (request.method !== 'tools/call') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Capgate proxy only gates tools/call; got ${request.method}`,
        },
      };
    }

    const raw = (request.params ?? {}) as Record<string, unknown>;
    const name = raw.name;
    if (!name || typeof name !== 'string') {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'tools/call requires name' },
      };
    }

    const meta =
      raw._capgate && typeof raw._capgate === 'object'
        ? (raw._capgate as NonNullable<McpToolsCallParams['_capgate']>)
        : {};
    const args =
      raw.arguments && typeof raw.arguments === 'object'
        ? (raw.arguments as Record<string, unknown>)
        : {};
    const proposal: ToolCallProposal = {
      proposalId: meta.proposalId ?? `prop-${String(id ?? 'anon')}`,
      agentId: meta.agentId ?? this.config.defaultAgentId,
      serverId: meta.serverId ?? this.config.defaultServerId,
      toolName: name,
      arguments: args,
      capabilityToken: meta.capabilityToken,
      requestedAt: new Date().toISOString(),
    };

    const evaluated = this.config.harness.evaluate(proposal);
    if (evaluated.decision.outcome !== 'allow' || !evaluated.permit) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: DENY_RPC_CODE,
          message: `capgate deny: ${evaluated.decision.detail}`,
          data: {
            outcome: evaluated.decision.outcome,
            reasonCode: evaluated.decision.reasonCode,
          },
        },
      };
    }

    const executed = this.config.harness.execute(proposal, evaluated.permit);
    if (!executed.forwarded || !executed.call) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: DENY_RPC_CODE,
          message: `capgate execution blocked: ${executed.detail}`,
          data: { reasonCode: executed.reasonCode },
        },
      };
    }

    try {
      const result = await this.config.forward({
        serverId: executed.call.serverId,
        toolName: executed.call.toolName,
        arguments: executed.call.arguments,
        permit: evaluated.permit,
      });
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'downstream forward failed';
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32002, message },
      };
    }
  }
}
