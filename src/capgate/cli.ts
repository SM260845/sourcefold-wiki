#!/usr/bin/env node
/**
 * Capgate research-preview CLI: evaluate a proposal JSON against a contract.
 * Not a full MCP host binary yet — proves the authorize path locally.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CapgateHarness } from './gate.js';
import { LocalDemoTokenVerifier } from './token.js';
import type { GateContract, ToolCallProposal } from './types.js';
import { CAPGATE_INVARIANT, CAPGATE_STATUS } from './index.js';

const HELP = `capgate (${CAPGATE_STATUS})

Invariant: ${CAPGATE_INVARIANT}

Usage:
  capgate evaluate --contract <file.json> --proposal <file.json> [--token-secret <hex>]
  capgate version
  capgate help

Notes:
  - Demo tokens use LocalDemoTokenVerifier (HMAC). Not atHome wire format.
  - Permit key is ephemeral process memory for this CLI invocation.
  - This is research-preview, not production.
`;

export async function runCapgateCli(
  argv: string[],
  io: {
    stdout: (s: string) => void;
    stderr: (s: string) => void;
    readFile: (p: string) => Promise<string>;
  } = {
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
    readFile: (p) => readFile(p, 'utf8'),
  }
): Promise<number> {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === 'help' || args.includes('--help')) {
    io.stdout(HELP);
    return 0;
  }
  if (args[0] === 'version' || args.includes('--version')) {
    io.stdout(`capgate 0.0.0-research-preview\n`);
    return 0;
  }
  if (args[0] !== 'evaluate') {
    io.stderr(`unknown command: ${args[0]}\n`);
    io.stdout(HELP);
    return 2;
  }

  const contractPath = flagValue(args, '--contract');
  const proposalPath = flagValue(args, '--proposal');
  const secretHex = flagValue(args, '--token-secret') ?? '00'.repeat(32);
  if (!contractPath || !proposalPath) {
    io.stderr('evaluate requires --contract and --proposal\n');
    return 2;
  }

  const contract = JSON.parse(await io.readFile(contractPath)) as GateContract;
  const proposal = JSON.parse(
    await io.readFile(proposalPath)
  ) as ToolCallProposal;

  const verifier = new LocalDemoTokenVerifier(Buffer.from(secretHex, 'hex'));
  const harness = new CapgateHarness({
    contract,
    verifier,
    permitKey: Buffer.from('11'.repeat(32), 'hex'),
  });

  const result = harness.evaluate(proposal);
  const execution = harness.execute(proposal, result.permit);
  const chain = harness.audit.verifyChain();

  io.stdout(
    JSON.stringify(
      {
        status: CAPGATE_STATUS,
        invariant: CAPGATE_INVARIANT,
        decision: result.decision,
        permitIssued: Boolean(result.permit),
        permitId: result.permit?.permitId,
        execution,
        auditChainOk: chain.ok,
        audit: harness.audit.list(),
      },
      null,
      2
    ) + '\n'
  );

  return result.decision.outcome === 'allow' && execution.forwarded ? 0 : 1;
}

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const thisFilePath = fileURLToPath(import.meta.url);

if (entryPath && entryPath === thisFilePath) {
  const exitCode = await runCapgateCli(process.argv);
  process.exitCode = exitCode;
}
