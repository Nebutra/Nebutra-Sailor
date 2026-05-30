import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { type JWTVerifyOptions, jwtVerify, SignJWT } from "jose";

export interface ServiceTokenContext {
  userId?: string;
  organizationId?: string;
  role?: string;
  plan?: string;
}

export interface SignServiceTokenOptions {
  /** Secret used to derive the HS256 signing key. Defaults to `process.env.SERVICE_SECRET`. */
  secret?: string;
  /** Token lifetime in seconds. Defaults to 300 (5 minutes). */
  expiresInSeconds?: number;
  /** Optional `iss` (issuer) claim. */
  issuer?: string;
  /** Optional `aud` (audience) claim. */
  audience?: string;
}

export interface VerifyServiceTokenOptions {
  secret?: string;
  /** When set, the token's `iss` claim must match. */
  issuer?: string;
  /** When set, the token's `aud` claim must match. */
  audience?: string;
}

const ALG = "HS256";
const DEFAULT_EXPIRES_IN_SECONDS = 300;

/**
 * Derive the symmetric signing key from the shared service secret.
 * jose requires HS256 keys as `Uint8Array`.
 */
function deriveKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Build the JWT claims set from a service-token context. Only present fields
 * are included so that verification can match on the exact same shape.
 */
function buildClaims(context: ServiceTokenContext): Record<string, string> {
  const claims: Record<string, string> = {};
  if (context.userId) claims.userId = context.userId;
  if (context.organizationId) claims.organizationId = context.organizationId;
  if (context.role) claims.role = context.role;
  if (context.plan) claims.plan = context.plan;
  return claims;
}

/**
 * Sign a short-lived service-to-service token.
 *
 * The token is a signed JWS (HS256) carrying the tenant context as claims,
 * plus `iat`, `exp` (short-lived, default 5 minutes), and a unique `jti`
 * (replay-tracking identifier). `iss` / `aud` are optional.
 *
 * @param context Tenant context to embed (`userId` / `organizationId` / `role` / `plan`).
 * @param options Signing options, OR a `secret` string for backwards-compatible call style.
 */
export async function signServiceToken(
  context: ServiceTokenContext,
  options: SignServiceTokenOptions | string = {},
): Promise<string> {
  const opts: SignServiceTokenOptions = typeof options === "string" ? { secret: options } : options;
  const secret = opts.secret ?? process.env.SERVICE_SECRET ?? "";

  if (!secret) {
    throw new Error("SERVICE_SECRET is required to sign service tokens");
  }

  const expiresInSeconds = opts.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS;

  let builder = new SignJWT(buildClaims(context))
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${expiresInSeconds}s`);

  if (opts.issuer) builder = builder.setIssuer(opts.issuer);
  if (opts.audience) builder = builder.setAudience(opts.audience);

  return builder.sign(deriveKey(secret));
}

/**
 * Verify a service-to-service token and confirm its claims match the expected
 * tenant context. The signature, `exp`, and (when provided) `iss`/`aud` are
 * validated by jose; the per-field equality checks below preserve the original
 * "headers are only trusted when they match the signed token" contract.
 *
 * MIGRATION (double-read, opt-in): tokens minted by the previous hand-rolled
 * HMAC scheme carry no `exp`/`jti`, so they are replayable. The legacy fallback
 * is therefore OFF by default and only enabled via `S2S_ALLOW_LEGACY=1` for the
 * rolling-deploy window where a signer may still run the old code. A `warn` is
 * logged whenever a legacy token is accepted; once that stops appearing, unset
 * the flag and delete `verifyLegacyHmacToken` (S2S tokens are request-scoped and
 * short-lived, so one deploy cycle suffices).
 */
export async function verifyServiceToken(
  token: string | undefined,
  userId?: string,
  organizationId?: string,
  role?: string,
  plan?: string,
  options: VerifyServiceTokenOptions | string = {},
): Promise<boolean> {
  const opts: VerifyServiceTokenOptions =
    typeof options === "string" ? { secret: options } : options;
  const secret = opts.secret ?? process.env.SERVICE_SECRET ?? "";

  if (!token || !secret) return false;

  const expected: ServiceTokenContext = {};
  if (userId) expected.userId = userId;
  if (organizationId) expected.organizationId = organizationId;
  if (role) expected.role = role;
  if (plan) expected.plan = plan;

  // Primary path: verify as a signed JWT (signature + exp + optional iss/aud).
  // `issuer`/`audience` are only added when set — under `exactOptionalPropertyTypes`,
  // passing them as `undefined` is not assignable to jose's `string | string[]`.
  const verifyOptions: JWTVerifyOptions = { algorithms: [ALG] };
  if (opts.issuer) verifyOptions.issuer = opts.issuer;
  if (opts.audience) verifyOptions.audience = opts.audience;

  try {
    const { payload } = await jwtVerify(token, deriveKey(secret), verifyOptions);

    return (
      (payload.userId ?? undefined) === expected.userId &&
      (payload.organizationId ?? undefined) === expected.organizationId &&
      (payload.role ?? undefined) === expected.role &&
      (payload.plan ?? undefined) === expected.plan
    );
  } catch {
    // Primary (JWT) verification failed. Only consider the deprecated legacy
    // HMAC path when explicitly opted in for the migration window.
  }

  if (!legacyFallbackAllowed()) return false;

  const legacyOk = verifyLegacyHmacToken(token, expected, secret);
  if (legacyOk) {
    // A legacy (no-exp, replayable) token was accepted — a pre-JWT signer is
    // still active. Once this warning stops appearing, unset S2S_ALLOW_LEGACY
    // and remove the legacy path.
    console.warn(
      "[s2s] accepted a deprecated legacy-HMAC service token (no exp/jti); a pre-JWT signer is still active. Unset S2S_ALLOW_LEGACY once migrated.",
    );
  }
  return legacyOk;
}

// ── Legacy hand-rolled HMAC scheme (deprecated, kept for migration double-read) ──

/**
 * Whether the deprecated legacy-HMAC fallback is permitted. Opt-in only, via
 * `S2S_ALLOW_LEGACY=1`. Default OFF so the new scheme's `exp`/`jti` replay
 * protection cannot be silently downgraded by a leaked, never-expiring legacy
 * token.
 */
function legacyFallbackAllowed(): boolean {
  return process.env.S2S_ALLOW_LEGACY === "1";
}

function canonicalizeServiceTokenContext(context: ServiceTokenContext): string {
  return [
    context.userId ?? "",
    context.organizationId ?? "",
    context.role ?? "",
    context.plan ?? "",
  ].join(":");
}

function verifyLegacyHmacToken(
  token: string,
  expected: ServiceTokenContext,
  secret: string,
): boolean {
  // Legacy tokens are hex-encoded HMAC-SHA256 digests.
  if (!/^[0-9a-f]+$/.test(token)) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(canonicalizeServiceTokenContext(expected))
    .digest("hex");

  const tokenBuffer = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (tokenBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(tokenBuffer, expectedBuffer);
}
