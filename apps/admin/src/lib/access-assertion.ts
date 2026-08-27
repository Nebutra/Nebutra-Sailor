import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies the Cloudflare Access assertion and returns the email it proves.
 *
 * THE HEADER IS NOT THE PROOF.
 *
 * nginx also forwards `Cf-Access-Authenticated-User-Email`, and reading that
 * would be one line. It is a plaintext header: anything that can reach this
 * process can set it to any address, and the whole control plane would then be
 * one curl away. The proof is `Cf-Access-Jwt-Assertion`, a JWT signed by the
 * team's keys — so that is what gets verified, and the convenience header is
 * ignored entirely.
 *
 * Three things are checked, and each one matters on its own:
 *   - the signature, against the team's published JWKS;
 *   - the issuer, so a token minted by some other Cloudflare team is not
 *     accepted here;
 *   - the audience, which is per-APPLICATION. Without it, a valid assertion for
 *     any other app in this same account would authenticate against the control
 *     plane.
 *
 * Layer two of three. Access answers "did Cloudflare authenticate this person";
 * PlatformStaff answers "may they operate the platform" — see ./staff.
 */

/**
 * Treats the literal strings "undefined" and "null" as unset. Environment
 * variables are always strings, so a template or script that interpolates a
 * missing value yields exactly those — and `if (!AUD)` would happily accept them
 * as a real audience, turning a misconfiguration into a check against a tag
 * nothing will ever carry. Failing loudly is the point.
 */
function envOrNull(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return raw;
}

const TEAM_DOMAIN = envOrNull("ACCESS_TEAM_DOMAIN") ?? "nebutra.cloudflareaccess.com";
const AUD = envOrNull("ACCESS_AUD");

/**
 * Cached across requests: createRemoteJWKSet handles fetching and rotation, and
 * rebuilding it per request would fetch the key set on every page view.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function keys() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${TEAM_DOMAIN}/cdn-cgi/access/certs`));
  }
  return jwks;
}

export interface AccessIdentity {
  email: string;
  /** Cloudflare's own subject id. Retained for audit, never used for authorisation. */
  sub: string | undefined;
}

/**
 * Returns the verified identity, or null. Null covers every failure — absent
 * header, bad signature, wrong issuer or audience, expired token — and callers
 * must not distinguish: telling an unauthenticated visitor *why* they failed
 * only helps someone probing the edge.
 */
export async function verifyAccessAssertion(
  assertion: string | null | undefined,
): Promise<AccessIdentity | null> {
  if (!assertion) return null;

  // Refusing to start without an audience is deliberate. A missing AUD would
  // otherwise silently widen the check to "any assertion from this team",
  // which is the difference between a gate and a formality.
  if (!AUD) {
    console.error(
      "[admin] ACCESS_AUD is not set; refusing to accept any Access assertion. " +
        "Set it to the Access application's aud tag.",
    );
    return null;
  }

  try {
    const { payload } = await jwtVerify(assertion, keys(), {
      issuer: `https://${TEAM_DOMAIN}`,
      audience: AUD,
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    if (!email) return null;
    return { email, sub: typeof payload.sub === "string" ? payload.sub : undefined };
  } catch (error) {
    console.warn(
      `[admin] Access assertion rejected: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
