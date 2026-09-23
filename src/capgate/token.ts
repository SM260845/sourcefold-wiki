import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalJson } from './canonical.js';
import type {
  CapabilityClaims,
  DenyReasonCode,
  TokenVerifyResult,
} from './types.js';

/**
 * Verifier boundary. Production path plugs atHome verify client here.
 * Capgate never embeds root keys or tool credentials in the agent process.
 */
export interface CapabilityTokenVerifier {
  verify(token: string, expectedAudience: string): TokenVerifyResult;
}

export interface DemoTokenBody {
  tokenId: string;
  issuer: string;
  subject: string;
  audience: string;
  actions: string[];
  notBefore: string;
  expiresAt: string;
  nonce?: string;
}

/**
 * Local HMAC demo verifier for research-preview tests.
 * Not atHome protocol-equivalent — adapter slot only. Label demos as such.
 */
export class LocalDemoTokenVerifier implements CapabilityTokenVerifier {
  constructor(
    private readonly secret: Buffer,
    private readonly clock: () => Date = () => new Date(),
    private readonly seenNonces: Set<string> = new Set()
  ) {}

  /** Mint a demo token for tests/demos. Harness-side only. */
  mint(body: DemoTokenBody): string {
    const payload = canonicalJson(body);
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    const sig = createHmac('sha256', this.secret)
      .update(payloadB64)
      .digest('base64url');
    return `cgdemo.${payloadB64}.${sig}`;
  }

  verify(token: string, expectedAudience: string): TokenVerifyResult {
    if (!token || !token.startsWith('cgdemo.')) {
      return fail('invalid_token', 'token format rejected');
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return fail('invalid_token', 'token structure rejected');
    }
    const [, payloadB64, sig] = parts;
    const expectedSig = createHmac('sha256', this.secret)
      .update(payloadB64)
      .digest('base64url');
    if (!timingSafeStringEqual(sig, expectedSig)) {
      return fail('invalid_token', 'signature mismatch');
    }

    let body: DemoTokenBody;
    try {
      body = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      ) as DemoTokenBody;
    } catch {
      return fail('invalid_token', 'payload not JSON');
    }

    if (body.audience !== expectedAudience) {
      return fail(
        'audience_mismatch',
        `token audience ${body.audience} != ${expectedAudience}`
      );
    }

    const now = this.clock().getTime();
    const nbf = Date.parse(body.notBefore);
    const exp = Date.parse(body.expiresAt);
    if (Number.isNaN(nbf) || Number.isNaN(exp)) {
      return fail('invalid_token', 'invalid time claims');
    }
    if (now < nbf) {
      return fail('invalid_token', 'token not yet valid');
    }
    if (now >= exp) {
      return fail('expired_token', 'token expired');
    }

    if (body.nonce) {
      if (this.seenNonces.has(body.nonce)) {
        return fail('nonce_replay', 'nonce already consumed');
      }
      this.seenNonces.add(body.nonce);
    }

    const claims: CapabilityClaims = {
      tokenId: body.tokenId,
      issuer: body.issuer,
      subject: body.subject,
      audience: body.audience,
      actions: [...body.actions],
      notBefore: body.notBefore,
      expiresAt: body.expiresAt,
      nonce: body.nonce,
    };
    return { ok: true, claims };
  }
}

function fail(reasonCode: DenyReasonCode, detail: string): TokenVerifyResult {
  return { ok: false, reasonCode, detail };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/**
 * Placeholder for atHome-backed verification.
 * Wire real client without importing AGPL into the MIT gate core until boundary is explicit.
 */
export class AtHomeVerifierAdapter implements CapabilityTokenVerifier {
  constructor(
    private readonly verifyFn: (
      token: string,
      audience: string
    ) => Promise<TokenVerifyResult> | TokenVerifyResult
  ) {}

  verify(token: string, expectedAudience: string): TokenVerifyResult {
    const result = this.verifyFn(token, expectedAudience);
    if (result instanceof Promise) {
      throw new Error(
        'AtHomeVerifierAdapter: async verify requires async gate path (not enabled in v0)'
      );
    }
    return result;
  }
}
