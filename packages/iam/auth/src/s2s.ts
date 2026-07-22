import { randomUUID } from "node:crypto";
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
 * tenant context. Only jose HS256 JWTs are accepted (legacy hex-HMAC was removed).
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
    return false;
  }
}
