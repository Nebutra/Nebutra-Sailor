import { InMemoryIntegrationProvider, IntegrationVault } from "../src";

const vault = IntegrationVault.local({
  providers: [
    new InMemoryIntegrationProvider({ id: "primary", apps: ["crm"] }),
    new InMemoryIntegrationProvider({ id: "fallback", apps: ["*"] }),
  ],
});

try {
  const direct = await vault.startOAuth({ tenantId: "tenant_demo", app: "crm" });
  const fallback = await vault.startOAuth({ tenantId: "tenant_demo", app: "calendar" });

  process.stdout.write(
    `${JSON.stringify(
      {
        direct_provider: direct.provider,
        fallback_provider: fallback.provider,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await vault.close();
}
