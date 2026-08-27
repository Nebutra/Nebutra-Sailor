import { InMemoryIntegrationProvider, IntegrationVault } from "../src";

const vault = IntegrationVault.local({
  providers: [new InMemoryIntegrationProvider({ id: "local", apps: ["docs"] })],
});

try {
  await vault.connectToken({
    tenantId: "tenant_demo",
    app: "docs",
    accessToken: "local-development-token",
    scopes: ["documents:write"],
  });

  await vault.grantConsent({
    tenantId: "tenant_demo",
    app: "docs",
    action: "create_page",
    scopes: ["documents:write"],
  });

  const result = await vault.invoke({
    tenantId: "tenant_demo",
    app: "docs",
    action: "create_page",
    args: { title: "Layer 1", body: "Published through the integration vault." },
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await vault.close();
}
