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

import { brand } from "@nebutra/brand/metadata";
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
 * Headers used to reconstruct the **client-facing** public URL behind reverse
 * proxies (Cloudflare → origin.nebutra.com, pebble nginx → api-gateway).
 */
export type PublicRequestHints = {
  /** Full request URL as seen by the process (often internal). */
  requestUrl: string;
  /** First X-Forwarded-Host, or Host. */
  forwardedHost?: string | null;
  /** First X-Forwarded-Proto (https/http). */
  forwardedProto?: string | null;
  /**
   * Original path as the browser/client requested it (e.g. `/diagnostics/token`
   * on pebble.nebutra.com). When missing, falls back to the gateway pathname.
   */
  originalUri?: string | null;
};

/** Internal / alternate hosts that must never appear in client-facing URLs. */
const HOST_ALIASES: Record<string, string> = {
  [brand.domains.origin]: brand.domains.api,
  origin: brand.domains.api,
};

/**
 * Brand / legacy hosts that reverse-proxy `/diagnostics/*` → gateway
 * `/pebble/diagnostics/*`. Client same-host checks require the public path
 * without the `/pebble` prefix.
 */
const BRAND_DIAGNOSTICS_HOSTS = new Set([
  brand.domains.pebble,
  `www.${brand.domains.pebble}`,
  "www.onpebble.dev",
  "onpebble.dev",
]);

function firstHeaderValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.split(",")[0]?.trim() || undefined;
}

function stripDefaultPort(host: string): string {
  // host may include port; drop :443 / :80 for cleaner URLs
  return host.replace(/:(443|80)$/, "");
}

/**
 * Reconstruct the public origin + path for the token endpoint as the **client**
 * sees it. Desktop Pebble requires:
 * - https when the token endpoint was https
 * - upload_url host === token endpoint host
 * See pebble apps/desktop/.../diagnostics.rs `validate_upload_url`.
 */
export function resolvePublicTokenEndpoint(hints: PublicRequestHints): URL {
  const internal = new URL(hints.requestUrl);

  let host =
    firstHeaderValue(hints.forwardedHost) || firstHeaderValue(internal.host) || internal.hostname;
  host = stripDefaultPort(host);
  host = HOST_ALIASES[host] ?? HOST_ALIASES[host.toLowerCase()] ?? host;

  let proto =
    firstHeaderValue(hints.forwardedProto)?.replace(/:$/, "") ||
    internal.protocol.replace(":", "") ||
    "https";

  // Production public hosts must never advertise http — CF/nginx terminate TLS.
  if (
    host.endsWith(`.${brand.domains.landing}`) ||
    host.endsWith(".onpebble.dev") ||
    host === "onpebble.dev"
  ) {
    proto = "https";
  }

  // Prefer the path the client actually hit (brand proxy), else gateway path.
  let pathname =
    firstHeaderValue(hints.originalUri)?.split("?")[0] ||
    internal.pathname ||
    "/pebble/diagnostics/token";

  // If only the gateway path is known but the public host is the brand front,
  // strip the product namespace so same-host clients get /diagnostics/upload.
  if (BRAND_DIAGNOSTICS_HOSTS.has(host) && pathname.startsWith("/pebble/")) {
    pathname = pathname.slice("/pebble".length) || "/";
  }

  // Direct API host must keep /pebble prefix.
  if (
    (host === brand.domains.api || host.endsWith(".workers.dev")) &&
    pathname.startsWith("/diagnostics")
  ) {
    pathname = `/pebble${pathname}`;
  }

  if (!pathname.endsWith("/token") && !pathname.endsWith("/token/")) {
    // Defensive: if something stripped the leaf, assume token route.
    pathname = pathname.replace(/\/?$/, "/token");
  }

  return new URL(`${proto}://${host}${pathname.startsWith("/") ? "" : "/"}${pathname}`);
}

/**
 * The client rejects an upload URL on a different host than the token endpoint,
 * so derive it from the **public** request (forwarded headers), not the
 * process-local URL (which is often http://origin.nebutra.com behind CF).
 */
export function deriveUploadUrl(
  requestUrl: string,
  hints: Omit<PublicRequestHints, "requestUrl"> = {},
): string {
  const tokenUrl = resolvePublicTokenEndpoint({
    requestUrl,
    forwardedHost: hints.forwardedHost ?? null,
    forwardedProto: hints.forwardedProto ?? null,
    originalUri: hints.originalUri ?? null,
  });
  const basePath = tokenUrl.pathname.replace(/\/token\/?$/, "");
  return `${tokenUrl.origin}${basePath}/upload`;
}
