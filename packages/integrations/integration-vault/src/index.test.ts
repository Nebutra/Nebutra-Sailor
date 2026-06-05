import { describe, expect, it } from "vitest";
import {
  CapabilityError,
  InMemoryIntegrationProvider,
  InMemorySaasConsentStore,
  type IntegrationProvider,
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

  it("caps provider doctor concurrency to avoid burst health checks", async () => {
    let active = 0;
    let maxActive = 0;
    const providers = Array.from({ length: 12 }, (_, index): IntegrationProvider => {
      const id = `provider_${index}`;
      return {
        id,
        supports: () => true,
        startOAuth: async (request) => ({
          provider: id,
          app: request.app,
          url: `https://example.test/${id}`,
          state: `state_${id}`,
          scopes: request.scopes ?? [],
        }),
        invoke: async () => ({ provider: id }),
        doctor: async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 0));
          active -= 1;
          return { ok: true, provider: id };
        },
      };
    });

    const vault = IntegrationVault.local({ providers });

    await expect(vault.doctor()).resolves.toMatchObject({ ok: true });
    expect(maxActive).toBeLessThanOrEqual(4);
  });
});
