import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The control plane reads across every tenant, and this module is what decides
 * whether a request is from a person Cloudflare authenticated. Each assertion
 * below corresponds to a way that check could be hollow while still looking like
 * a check.
 */

const TEAM = "nebutra.cloudflareaccess.com";
const AUD = "test-aud-tag";

let priv: CryptoKey;
let jwksBody: string;
/** A second key, never published — stands in for "signed by someone else". */
let foreignPriv: CryptoKey;

beforeEach(async () => {
  vi.resetModules();
  process.env.ACCESS_TEAM_DOMAIN = TEAM;
  process.env.ACCESS_AUD = AUD;

  const pair = await generateKeyPair("RS256", { extractable: true });
  priv = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwksBody = JSON.stringify({ keys: [{ ...jwk, alg: "RS256", kid: "k1", use: "sig" }] });

  foreignPriv = (await generateKeyPair("RS256", { extractable: true })).privateKey;

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(jwksBody, { headers: { "content-type": "application/json" } })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ACCESS_AUD;
});

async function token(
  claims: Record<string, unknown>,
  opts: { key?: CryptoKey; iss?: string; aud?: string; exp?: string } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuedAt()
    .setIssuer(opts.iss ?? `https://${TEAM}`)
    .setAudience(opts.aud ?? AUD)
    .setExpirationTime(opts.exp ?? "1h")
    .sign(opts.key ?? priv);
}

async function verify(assertion: string | null) {
  const { verifyAccessAssertion } = await import("../access-assertion");
  return verifyAccessAssertion(assertion);
}

describe("Cloudflare Access assertion", () => {
  it("accepts a correctly signed assertion and returns the email", async () => {
    const t = await token({ email: "Owner@Example.com" });
    // Lower-cased so the users.email lookup is not case-sensitive by accident.
    await expect(verify(t)).resolves.toEqual({ email: "owner@example.com", sub: undefined });
  });

  it("rejects a token signed by a key the team never published", async () => {
    // The whole point of verification. Without it, anyone able to reach this
    // process could mint their own assertion.
    const t = await token({ email: "attacker@example.com" }, { key: foreignPriv });
    await expect(verify(t)).resolves.toBeNull();
  });

  it("rejects an assertion for a DIFFERENT Access application", async () => {
    // aud is per-application. Omitting this check would let a valid assertion for
    // any other app in the same Cloudflare account authenticate here — the most
    // plausible real-world bypass, because such tokens genuinely exist and are
    // genuinely signed by the same team.
    const t = await token({ email: "someone@example.com" }, { aud: "another-apps-aud" });
    await expect(verify(t)).resolves.toBeNull();
  });

  it("rejects an assertion from another Cloudflare team", async () => {
    const t = await token(
      { email: "someone@example.com" },
      { iss: "https://evil.cloudflareaccess.com" },
    );
    await expect(verify(t)).resolves.toBeNull();
  });

  it("rejects an expired assertion", async () => {
    const t = await token({ email: "owner@example.com" }, { exp: "-1h" });
    await expect(verify(t)).resolves.toBeNull();
  });

  it("rejects a token carrying no email claim", async () => {
    await expect(verify(await token({}))).resolves.toBeNull();
  });

  it("returns null rather than throwing when the header is absent", async () => {
    await expect(verify(null)).resolves.toBeNull();
    await expect(verify("")).resolves.toBeNull();
    await expect(verify("not-a-jwt")).resolves.toBeNull();
  });

  it("refuses everything when ACCESS_AUD is unset", async () => {
    // Fail closed on misconfiguration. Treating a missing audience as "accept any"
    // would turn the gate into a formality precisely when someone forgot to
    // configure it — the moment it is least likely to be noticed.
    // delete, not `= undefined`: assigning undefined to process.env stores the
    // STRING "undefined", which is truthy — the exact misconfiguration the module
    // now rejects explicitly, and one this test would otherwise fail to exercise.
    delete process.env.ACCESS_AUD;
    vi.resetModules();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(verify(await token({ email: "owner@example.com" }))).resolves.toBeNull();
    expect(err).toHaveBeenCalledWith(expect.stringContaining("ACCESS_AUD"));
    err.mockRestore();
  });
});
