# @nebutra/config

Shared configuration utilities.

## Installation

```bash
pnpm add @nebutra/config
```

## Features

- **Type-safe Config** — Validated configuration with Zod
- **Environment Handling** — Development/staging/production
- **Service Registry** — Centralized service endpoints
- **Shared Constants** — Common values across packages

## Usage

### Environment Config

```typescript
import { env, isProduction, isDevelopment } from "@nebutra/config";

if (isProduction) {
  // Production-only logic
}

console.log(env.DATABASE_URL);
```

### Service Registry

```typescript
import { services } from "@nebutra/config";

const aiServiceUrl = services.ai.url;
// Development: http://localhost:8001
// Production: https://ai.nebutra.com

await fetch(`${aiServiceUrl}/v1/generate`);
```

### Feature Flags

```typescript
import { features } from "@nebutra/config";

if (features.WEB3_ENABLED) {
  // Web3 features
}
```

### Plan Limits

```typescript
import { planLimits } from "@nebutra/config";

const limits = planLimits.PRO;
// { apiRequests: 10000, storage: "10GB", ... }
```

## Configuration Schema

```typescript
// Validated at startup
const configSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  // ...
});
```

## Shared Constants

```typescript
import { PLANS, ROLES, LIMITS } from "@nebutra/config";

// Subscription plans
(PLANS.FREE, PLANS.PRO, PLANS.ENTERPRISE);

// User roles
(ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER);

// System limits
(LIMITS.MAX_FILE_SIZE, LIMITS.MAX_TEAM_MEMBERS);
```

## Related

- [API Gateway](../../backends/gateway/)
- [Database package](../db/)
