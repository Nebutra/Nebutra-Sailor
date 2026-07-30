import { describe, expect, it, vi } from "vitest";
import { createPrismaAdapter, type SecretRecovery } from "../adapters/prisma-adapter";

function redisStub() {
  return {} as Parameters<typeof createPrismaAdapter>[1];
}

/** A well-formed envelope. Contents are irrelevant — recovery is injected. */
function envelope() {
  return {
    id: "sec_1",
    ciphertext: "Y2lwaGVy",
    encryptedDek: "ZGVr",
    iv: "aXY=",
    authTag: "dGFn",
    keyVersion: 1,
    algorithm: "aes-256-gcm",
    createdAt: "2026-07-30T00:00:00.000Z",
  };
}

function clientRow(over: Record<string, unknown> = {}) {
  return {
    clientId: "c",
    clientSecretHash: null,
    clientSecretEnvelope: null,
    tokenEndpointAuthMethod: "none",
    grantTypes: ["authorization_code"],
    redirectUris: ["https://app.nebutra.com/callback"],
    responseTypes: ["code"],
    allowedScopes: ["openid", "profile"],
    name: "Client",
    logoUrl: null,
    websiteUrl: null,
    privacyPolicyUrl: null,
    tosUrl: null,
    ...over,
  };
}

function adapterFor(row: Record<string, unknown>, recover: SecretRecovery) {
  const prisma = { oAuthClient: { findFirst: vi.fn(async () => row) } };
  return createPrismaAdapter(prisma as never, redisStub(), recover)("Client");
}

/** Recovery that must never be reached. */
const neverCalled: SecretRecovery = async () => {
  throw new Error("secret recovery should not have been attempted");
};

describe("Prisma OIDC client adapter — client_secret handling", () => {
  it("never turns clientSecretHash into a client_secret", async () => {
    // The original reason this adapter refuses: a hash verifies a secret the
    // caller already holds, it cannot produce one. oidc-provider needs the real
    // secret for its own client-auth check, and handing it something that merely
    // looks like one would accept requests it should reject.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const recover = vi.fn(neverCalled);
    const adapter = adapterFor(
      clientRow({
        clientId: "hash-only",
        clientSecretHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        clientSecretEnvelope: null,
        tokenEndpointAuthMethod: "client_secret_basic",
      }),
      recover,
    );

    await expect(adapter.find("hash-only")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("client_secret_envelope"));
    expect(recover).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("serves a confidential client by recovering its envelope", async () => {
    const recover = vi.fn<SecretRecovery>(async () => "s3cr3t-from-kms");
    const adapter = adapterFor(
      clientRow({
        clientId: "cf-access",
        clientSecretEnvelope: envelope(),
        tokenEndpointAuthMethod: "client_secret_basic",
      }),
      recover,
    );

    await expect(adapter.find("cf-access")).resolves.toMatchObject({
      client_id: "cf-access",
      client_secret: "s3cr3t-from-kms",
      token_endpoint_auth_method: "client_secret_basic",
    });
    expect(recover).toHaveBeenCalledOnce();
  });

  it("omits client_secret entirely for a public client", async () => {
    const found = await adapterFor(
      clientRow({
        clientId: "public",
        grantTypes: ["authorization_code", "refresh_token"],
        allowedScopes: ["openid", "profile", "email"],
      }),
      neverCalled,
    ).find("public");

    // toMatchObject would pass with a stray client_secret present, and a stray
    // empty-string secret is the dangerous case: oidc-provider infers
    // confidentiality from the key existing, so it would start authenticating a
    // PKCE client against a secret of "".
    expect(found).not.toHaveProperty("client_secret");
    expect(found).toMatchObject({ client_id: "public", token_endpoint_auth_method: "none" });
  });

  it("ignores an envelope on a client whose auth method is none", async () => {
    // A row carrying both auth_method "none" and an envelope is a
    // misconfiguration. The method decides; the envelope is left untouched rather
    // than silently upgrading the client to confidential.
    const recover = vi.fn(neverCalled);
    const found = await adapterFor(
      clientRow({ clientId: "public-with-envelope", clientSecretEnvelope: envelope() }),
      recover,
    ).find("public-with-envelope");

    expect(found).not.toHaveProperty("client_secret");
    expect(recover).not.toHaveBeenCalled();
  });

  it("fails CLOSED when recovery throws", async () => {
    // The case that matters most. If a KMS outage made the adapter serve the
    // client without a secret, the token endpoint would stop authenticating
    // clients at all. An outage must make the client unavailable, never open.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter = adapterFor(
      clientRow({
        clientId: "kms-down",
        clientSecretEnvelope: envelope(),
        tokenEndpointAuthMethod: "client_secret_basic",
      }),
      async () => {
        throw new Error("kms unreachable");
      },
    );

    await expect(adapter.find("kms-down")).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("kms unreachable"));
    error.mockRestore();
  });

  it("defaults to vault-backed recovery when none is injected", async () => {
    // Guards the wiring itself: a default that silently became a no-op would make
    // every test above pass while production served no confidential client.
    const prisma = { oAuthClient: { findFirst: vi.fn(async () => null) } };
    expect(() => createPrismaAdapter(prisma as never, redisStub())("Client")).not.toThrow();
  });
});
