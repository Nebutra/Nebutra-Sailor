# integration-vault Replication Guide

## 5-Minute Quickstart

```ts
import { IntegrationVault, InMemoryIntegrationProvider } from "@nebutra/integration-vault";

const vault = IntegrationVault.local({
  providers: [new InMemoryIntegrationProvider({ id: "local", apps: ["docs"] })],
});

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
  args: { title: "Hello" },
});

console.log(result);
```

## Commands

```bash
pnpm vault:doctor
pnpm vault:connect docs
pnpm vault:list
pnpm vault:debug
```

## Examples

```bash
tsx packages/integrations/integration-vault/examples/connect-token.ts
tsx packages/integrations/integration-vault/examples/invoke-consented.ts
tsx packages/integrations/integration-vault/examples/provider-fallback.ts
```

## Implementation Steps

1. Create an `IntegrationProvider` adapter for each external app channel.
2. Keep OAuth token exchange and refresh inside the sidecar or backend boundary.
3. Store tokens through `@nebutra/vault` and persist only encrypted envelopes plus token ids.
4. Require `tenantId` for connect, list, consent, and invoke.
5. Ask for per-action consent before the first invocation of each app action.
6. Route all external tool calls through `invoke()` so audit and trace layers have one boundary to observe.

## Debug Format

Local CLI operations append JSON records to `.nebutra/debug/integration-vault.jsonl`. Production adapters should emit the same shape with tenant, app, action, provider, and suggestion-bearing failure details.
