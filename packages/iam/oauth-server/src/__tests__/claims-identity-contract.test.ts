/**
 * D4 contract test — `@nebutra/oauth-server` ↔ `@nebutra/identity`.
 *
 * Validates the boundary defined in ADR `2026-05-10-auth-provider-abstraction-wave2.md` D4:
 * any claims this server emits MUST be parseable by `NebutraIdentityAdapter`
 * back into a valid `CanonicalIdentity`. This test is the first real consumer
 * of `@nebutra/identity` and turns the conceptual seam into a runtime-enforced
 * contract — break it and CI fails.
 *
 * If this test starts failing, the wire format between the IdP and resource
 * servers has diverged: either oauth-server is emitting a claim shape that
 * identity can't read, OR identity has changed its expected shape in a way
 * that breaks compatibility with what we already issue. Either one is a
 * downstream auth break.
 */

import { NebutraIdentityAdapter } from "@nebutra/identity";
import { describe, expect, it } from "vitest";
import { NEBUTRA_CLAIMS, SUPPORTED_SCOPES } from "../claims";

describe("D4 contract: oauth-server claims → identity adapter", () => {
  const adapter = new NebutraIdentityAdapter();

  it("round-trips a fully-populated organization:read token into a valid CanonicalIdentity", () => {
    // Simulate the claims the server would emit when the client requests
    // `openid profile email organization:read`. The exact union is the merge
    // of all listed claim names in NEBUTRA_CLAIMS for those scopes.
    const emitted = {
      sub: "user_123",
      name: "Ada Lovelace",
      picture: "https://example.com/ada.jpg",
      updated_at: 1715500800,
      email: "ada@example.com",
      email_verified: true,
      "nebutra:organization_id": "org_456",
      "nebutra:organization_name": "Difference Engine",
      "nebutra:organization_slug": "difference-engine",
      "nebutra:role": "OWNER",
      "nebutra:plan": "PRO",
    };

    const canonical = adapter.mapToCanonical(emitted);

    expect(canonical).not.toBeNull();
    expect(canonical).toEqual({
      provider: "nebutra",
      userId: "user_123",
      organizationId: "org_456",
      role: "OWNER",
      plan: "PRO",
      email: "ada@example.com",
      claimsVersion: "v1",
    });
  });

  it("returns null when `sub` is missing (auth fundamental)", () => {
    const emitted = { email: "ada@example.com" } as unknown as Parameters<
      typeof adapter.mapToCanonical
    >[0];
    expect(adapter.mapToCanonical(emitted)).toBeNull();
  });

  it("tolerates lowercase / unknown role values (defensive narrowing)", () => {
    const canonical = adapter.mapToCanonical({
      sub: "user_1",
      "nebutra:role": "owner", // lowercase — adapter only accepts upper enum
    });
    expect(canonical).not.toBeNull();
    expect(canonical?.role).toBeUndefined(); // unrecognized → undefined, not crash
  });

  it("tolerates unknown plan values (defensive narrowing)", () => {
    const canonical = adapter.mapToCanonical({
      sub: "user_1",
      "nebutra:plan": "TRIAL", // not in FREE/PRO/ENTERPRISE
    });
    expect(canonical).not.toBeNull();
    expect(canonical?.plan).toBeUndefined();
  });

  it("works when only openid scope was granted (minimal payload)", () => {
    const canonical = adapter.mapToCanonical({ sub: "user_min" });
    expect(canonical).toEqual({
      provider: "nebutra",
      userId: "user_min",
      organizationId: undefined,
      role: undefined,
      plan: undefined,
      email: undefined,
      claimsVersion: "v1",
    });
  });

  it("every NEBUTRA_CLAIMS scope name is well-formed (no typos that'd misroute consent)", () => {
    expect(SUPPORTED_SCOPES.length).toBeGreaterThanOrEqual(8);
    expect(SUPPORTED_SCOPES).toEqual(Object.keys(NEBUTRA_CLAIMS));
    for (const scope of SUPPORTED_SCOPES) {
      // OIDC standard scopes are lowercase letters or word:word
      expect(scope).toMatch(/^[a-z]+(:[a-z]+)?$/);
    }
  });

  describe("known gaps (documented, not fixed by this test)", () => {
    it("identity adapter does NOT propagate organization_name or organization_slug — oauth-server over-emits or identity under-reads", () => {
      // ADR D4 follow-up: oauth-server's NEBUTRA_CLAIMS["organization:read"]
      // includes `nebutra:organization_name` and `nebutra:organization_slug`,
      // but NebutraIdentityAdapter currently drops them. Two acceptable resolutions:
      //
      //   (a) extend NebutraIdentityAdapter (and CanonicalIdentity) to carry
      //       organizationName / organizationSlug — useful for UIs and avoids
      //       a round-trip to fetch them.
      //   (b) trim oauth-server's emitted claims to only what identity reads —
      //       smaller tokens.
      //
      // This test asserts the CURRENT gap so any change to either side wakes us up.
      const orgReadClaims = NEBUTRA_CLAIMS["organization:read"];
      expect(orgReadClaims).toContain("nebutra:organization_name");
      expect(orgReadClaims).toContain("nebutra:organization_slug");

      const canonical = adapter.mapToCanonical({
        sub: "user_1",
        "nebutra:organization_id": "org_1",
        "nebutra:organization_name": "Acme",
        "nebutra:organization_slug": "acme",
      });
      // Adapter only surfaces organizationId today; name + slug are dropped.
      expect(canonical).not.toBeNull();
      expect(canonical?.organizationId).toBe("org_1");
      expect(canonical).not.toHaveProperty("organizationName");
      expect(canonical).not.toHaveProperty("organizationSlug");
    });
  });
});
