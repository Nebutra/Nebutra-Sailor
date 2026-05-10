# @nebutra/feature-flags

> **Status: WIP** — Not yet integrated into any production app. Do not import until this notice is removed.

Feature flag management.

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
import { featureFlags } from "@nebutra/feature-flags";

const isEnabled = await featureFlags.isEnabled("new_dashboard", {
  userId: "user_123",
  tenantId: "org_456",
});

if (isEnabled) {
  // Show new dashboard
}
```

### With Default Value

```typescript
const isEnabled = await featureFlags.isEnabled("experimental", {
  userId: "user_123",
  default: false,
});
```

### Get Flag Value

```typescript
const variant = await featureFlags.getValue("checkout_flow", {
  userId: "user_123",
});
// Returns: "v1" | "v2" | "v3"
```

### React Hook

```typescript
import { useFeatureFlag } from "@nebutra/feature-flags/react";

function Dashboard() {
  const { isEnabled, isLoading } = useFeatureFlag("new_dashboard");

  if (isLoading) return <Spinner />;
  return isEnabled ? <NewDashboard /> : <OldDashboard />;
}
```

## Flag Configuration

```typescript
// Define flags
const flags = {
  new_dashboard: {
    description: "New dashboard UI",
    default: false,
    rules: [
      { tenants: ["org_beta"], enabled: true },
      { percentage: 10 }, // 10% rollout
    ],
  },
  checkout_flow: {
    description: "Checkout flow variant",
    variants: ["v1", "v2", "v3"],
    default: "v1",
  },
};
```

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
- [API Gateway](../../backends/gateway/)
