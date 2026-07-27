/**
 * Short-lived bearer tokens for Pebble diagnostic uploads.
 *
 * The token is the only thing standing between an anonymous caller and a write
 * to private support storage, so it is bound to the exact ticket AND the exact
 * byte count it was minted for. A caller cannot mint a token for 1 KiB and then
 * upload 4 MiB, and cannot point a token at someone else's ticket.
 *
 * Lifetime is 10 minutes per the baseline policy in pebble's ROADMAP.md.
 */

import { jwtVerify, SignJWT } from "jose";

export const DIAGNOSTIC_TOKEN_TTL_SECONDS = 600;

const ISSUER = "nebutra-gateway";
const AUDIENCE = "pebble-diagnostics-upload";

export interface DiagnosticTokenClaims {
  ticketId: string;
  bundleSubmissionId: string;
  bytes: number;
}

/**
 * Signing key. Falls back to SERVICE_SECRET so a deployment that has not yet
 * provisioned a dedicated secret still signs with something unguessable rather
 * than silently accepting unsigned tokens.
 */
export function resolveTokenSecret(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const raw = env["PEBBLE_DIAGNOSTICS_TOKEN_SECRET"]?.trim() || env["SERVICE_SECRET"]?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      "PEBBLE_DIAGNOSTICS_TOKEN_SECRET (or SERVICE_SECRET) must be set to at least 32 characters",
    );
  }
  return new TextEncoder().encode(raw);
}

export async function issueDiagnosticToken(
  claims: DiagnosticTokenClaims,
  secret: Uint8Array,
  now = new Date(),
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ bsid: claims.bundleSubmissionId, bytes: claims.bytes })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.ticketId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + DIAGNOSTIC_TOKEN_TTL_SECONDS)
    .sign(secret);
}

/** Returns the claims, or null for any token we would not act on. */
export async function verifyDiagnosticToken(
  token: string,
  secret: Uint8Array,
): Promise<DiagnosticTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });

    const ticketId = payload.sub;
    const bundleSubmissionId = payload["bsid"];
    const bytes = payload["bytes"];

    if (
      typeof ticketId !== "string" ||
      typeof bundleSubmissionId !== "string" ||
      typeof bytes !== "number" ||
      !Number.isInteger(bytes)
    ) {
      return null;
    }

    return { ticketId, bundleSubmissionId, bytes };
  } catch {
    return null;
  }
}

/** `Authorization: Bearer <token>` → token, or null. */
export function readBearerToken(header: string | undefined | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/**
 * The client rejects an upload URL on a different host than the token endpoint,
 * so derive it from the incoming request rather than from configuration that
 * could drift out of agreement with whatever host actually served the token.
 */
export function deriveUploadUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  const basePath = url.pathname.replace(/\/token\/?$/, "");
  return `${url.origin}${basePath}/upload`;
}
