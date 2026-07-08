import { describe, expect, it, vi } from "vitest";
import { createPrismaAdapter } from "../adapters/prisma-adapter";

function redisStub() {
  return {} as Parameters<typeof createPrismaAdapter>[1];
}

describe("Prisma OIDC client adapter", () => {
  it("does not expose clientSecretHash as client_secret", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const prisma = {
      oAuthClient: {
        findFirst: vi.fn(async () => ({
          clientId: "confidential-client",
          clientSecretHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
          tokenEndpointAuthMethod: "client_secret_basic",
          grantTypes: ["authorization_code"],
          redirectUris: ["https://app.nebutra.com/callback"],
          responseTypes: ["code"],
          allowedScopes: ["openid", "profile"],
          name: "Confidential Client",
          logoUrl: null,
          websiteUrl: null,
          privacyPolicyUrl: null,
          tosUrl: null,
        })),
      },
    };

    const adapter = createPrismaAdapter(prisma as never, redisStub())("Client");

    await expect(adapter.find("confidential-client")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no retrievable client secret"));
  });

  it("returns public clients without a client_secret", async () => {
    const prisma = {
      oAuthClient: {
        findFirst: vi.fn(async () => ({
          clientId: "public-client",
          clientSecretHash: null,
          tokenEndpointAuthMethod: "none",
          grantTypes: ["authorization_code", "refresh_token"],
          redirectUris: ["https://app.nebutra.com/callback"],
          responseTypes: ["code"],
          allowedScopes: ["openid", "profile", "email"],
          name: "Public Client",
          logoUrl: null,
          websiteUrl: null,
          privacyPolicyUrl: null,
          tosUrl: null,
        })),
      },
    };

    const adapter = createPrismaAdapter(prisma as never, redisStub())("Client");

    await expect(adapter.find("public-client")).resolves.toMatchObject({
      client_id: "public-client",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: ["https://app.nebutra.com/callback"],
      response_types: ["code"],
      scope: "openid profile email",
      token_endpoint_auth_method: "none",
      client_name: "Public Client",
    });
  });
});
