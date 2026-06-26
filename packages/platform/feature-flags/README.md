# @nebutra/feature-flags

Status: **Foundation**

> **Status: Foundation** — The Redis-cached/env-backed runtime is production-usable and fails closed for in-memory providers in production. Managed Vercel Flags, GrowthBook, and ConfigCat SDK adapters are still provider-wiring work.

Feature flag management for server routes, React clients, and gradual rollout
checks.

## Installation

```bash
pnpm add @nebutra/feature-flags
```

## Features

- **Server & Client** — Works in Node.js and browser
- **Multi-tenant** — Flags scoped per organization
- **Gradual Rollout** — Percentage-based releases
- **User Targeting** — Target specific users/segments

## Usage

### Check Flags

```typescript
import { isFeatureEnabled } from "@nebutra/feature-flags";

const isEnabled = await isFeatureEnabled("new-dashboard", {
  userId: "user_123",
  tenantId: "org_456",
  plan: "pro",
});

if (isEnabled) {
  // Show new dashboard
}
```

### With Default Value

```typescript
import { getFeatureVariant } from "@nebutra/feature-flags";

const variant = await getFeatureVariant("checkout-flow", "control", {
  userId: "user_123",
});
```

### Runtime Status

```typescript
import { resolveFeatureFlagRuntimeStatus } from "@nebutra/feature-flags";

const status = resolveFeatureFlagRuntimeStatus();
// { provider: "cache", mode: "self_hosted", productionSafe: true, ... }
```

### React Hook

```typescript
import { useFeatureFlag } from "@nebutra/feature-flags/react";

function Dashboard() {
  const isEnabled = useFeatureFlag("new-dashboard");

  return isEnabled ? <NewDashboard /> : <OldDashboard />;
}
```

## Flag Configuration

```typescript
import { createMemoryProvider, setFeatureFlagProvider } from "@nebutra/feature-flags";

const previewProvider = createMemoryProvider({
  "new-dashboard": {
    enabled: true,
    rolloutPercentage: 10,
    variants: {
      control: "classic",
      treatment: "compact",
    },
  },
});

setFeatureFlagProvider(previewProvider);
```

The default provider checks `KILL_SWITCH_*`, then Redis via `@nebutra/cache`,
then `FEATURE_FLAG_*` environment variables. `useMemoryProvider()` is for local
development/tests and throws in production unless
`ALLOW_MEMORY_FEATURE_FLAGS_IN_PRODUCTION=true` is set as an explicit temporary
override.

## Rollout Strategies

| Strategy     | Description            |
| ------------ | ---------------------- |
| `boolean`    | Simple on/off          |
| `percentage` | Gradual rollout        |
| `users`      | Specific user IDs      |
| `tenants`    | Specific organizations |
| `plans`      | By subscription tier   |

## Related

- [Config package](../config/)
- [API Gateway](../../../backends/gateway/)
