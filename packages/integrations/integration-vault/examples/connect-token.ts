import { InMemoryIntegrationProvider, IntegrationVault } from "../src";

const vault = IntegrationVault.local({
  providers: [new InMemoryIntegrationProvider({ id: "local", apps: ["docs"] })],
});

try {
  const flow = await vault.startOAuth({
    tenantId: "tenant_demo",
    app: "docs",
    scopes: ["documents:write"],
  });

  const connection = await vault.connectToken({
    tenantId: "tenant_demo",
    app: "docs",
    accessToken: "local-development-token",
    scopes: flow.scopes,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        auth_url: flow.url,
        token_id: connection.tokenId,
        scopes: connection.scopes,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await vault.close();
}
