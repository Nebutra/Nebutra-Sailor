import { describe, expect, it } from "vitest";
import { NEBUTRA_CLAIMS, PROTOCOL_SCOPES, SCOPE_DESCRIPTIONS, SUPPORTED_SCOPES } from "../claims";

/**
 * Pins the issuer's advertised capability to what it actually configures.
 *
 * The gap this exists for: provider.ts sets `ttl.RefreshToken` to 30 days and its
 * docblock promises "Token refresh" and "authorization_code + refresh_token
 * browser flows", while the issuer advertised
 * `grant_types_supported: ["implicit","authorization_code"]` and rejected every
 * client listing refresh_token with
 * `invalid_client_metadata: grant_types can only contain 'implicit' or
 * 'authorization_code'`.
 *
 * oidc-provider enables the refresh_token grant only when `offline_access` is a
 * supported scope, and SUPPORTED_SCOPES was derived from Object.keys(NEBUTRA_CLAIMS)
 * — so a scope carrying no claims could never appear. Three statements of intent,
 * no capability, and the only symptom was a 400 at /auth on a correctly registered
 * client.
 */
describe("issuer grant capability", () => {
  it("supports offline_access, without which the refresh_token grant is off", () => {
    expect(SUPPORTED_SCOPES).toContain("offline_access");
  });

  it("keeps offline_access out of the claims map", () => {
    // It grants persistence, not data. Putting it in NEBUTRA_CLAIMS would imply
    // the userinfo endpoint returns something for it.
    expect(Object.keys(NEBUTRA_CLAIMS)).not.toContain("offline_access");
  });

  it("still exposes every claims-bearing scope", () => {
    // Guards the spread: an edit that replaced the claims keys with the protocol
    // list rather than concatenating them would pass the first assertion.
    for (const scope of Object.keys(NEBUTRA_CLAIMS)) {
      expect(SUPPORTED_SCOPES).toContain(scope);
    }
    expect(SUPPORTED_SCOPES.length).toBe(
      Object.keys(NEBUTRA_CLAIMS).length + PROTOCOL_SCOPES.length,
    );
  });

  it("describes every supported scope for the consent screen", () => {
    // A scope with no description renders as its raw identifier, which is how
    // "offline_access" would have reached a user.
    const undescribed = SUPPORTED_SCOPES.filter((s) => !(s in SCOPE_DESCRIPTIONS));
    expect(undescribed, `scopes with no consent-screen description: ${undescribed}`).toEqual([]);
  });

  it("has no duplicate scopes", () => {
    expect(SUPPORTED_SCOPES.length).toBe(new Set(SUPPORTED_SCOPES).size);
  });
});
