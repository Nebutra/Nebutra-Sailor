import { describe, expect, it } from "vitest";
import {
  CapabilityError,
  InMemoryIntegrationProvider,
  InMemorySaasConsentStore,
  IntegrationVault,
} from "./index";

describe("IntegrationVault", () => {
  it("requires tenant context before starting OAuth", async () => {
    const vault = IntegrationVault.local({
      providers: [new InMemoryIntegrationProvider({ id: "local", apps: ["notion"] })],
    });

    await expect(vault.startOAuth({ app: "notion", tenantId: "" })).rejects.toThrow(
      CapabilityError,
    );
  });

  it("stores tokens encrypted and lists only token ids and scopes", async () => {
    const vault = IntegrationVault.local({
      providers: [new InMemoryIntegrationProvider({ id: "local", apps: ["notion"] })],
    });
    const connection = await vault.connectToken({
      tenantId: "tenant_a",
      app: "notion",
      accessToken: "secret-token",
      scopes: ["pages:write"],
    });

    await expect(vault.list("tenant_a")).resolves.toEqual([
      expect.objectContaining({
        app: "notion",
        tokenId: connection.tokenId,
        scopes: ["pages:write"],
      }),
    ]);
    expect(JSON.stringify(await vault.list("tenant_a"))).not.toContain("secret-token");
  });

  it("requires explicit per-action consent before invoking a SaaS action", async () => {
    const consent = new InMemorySaasConsentStore();
    const vault = IntegrationVault.local({
      consent,
      providers: [new InMemoryIntegrationProvider({ id: "local", apps: ["notion"] })],
    });
    await vault.connectToken({
      tenantId: "tenant_a",
      app: "notion",
      accessToken: "secret-token",
      scopes: ["pages:write"],
    });

    await expect(
      vault.invoke({
        tenantId: "tenant_a",
        app: "notion",
        action: "create_page",
        args: { title: "Layer 1" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      suggestion: expect.stringContaining("vault:connect"),
    });

    await consent.grant({
      tenantId: "tenant_a",
      app: "notion",
      action: "create_page",
      scopes: ["pages:write"],
    });

    await expect(
      vault.invoke({
        tenantId: "tenant_a",
        app: "notion",
        action: "create_page",
        args: { title: "Layer 1" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      provider: "local",
      result: { app: "notion", action: "create_page", title: "Layer 1" },
    });
  });
});
