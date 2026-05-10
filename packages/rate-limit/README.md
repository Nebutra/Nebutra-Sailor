# @nebutra/rate-limit

Multi-tenant token bucket rate limiting.

## Installation

```bash
pnpm add @nebutra/rate-limit
```

## Features

- **Token Bucket** — Smooth rate limiting algorithm
- **Multi-tenant** — Per-tenant limits
- **API Weights** — Different weights for different endpoints
- **Plan-based** — FREE/PRO/ENTERPRISE tiers

## Usage

### Basic Rate Limiting

```typescript
import { createRateLimiter, getRateLimiter } from "@nebutra/rate-limit";

// Create limiter for a user
const limiter = createRateLimiter({
  identifier: "user:123",
  plan: "PRO",
});

// Check rate limit
const result = await limiter.limit();

if (!result.success) {
  // Rate limited
  console.log(`Retry after ${result.reset}ms`);
}
```

### With API Weights

```typescript
import { getRateLimiter, getApiWeight } from "@nebutra/rate-limit";

const limiter = getRateLimiter("user:123", "PRO");

// Different endpoints consume different tokens
const weight = getApiWeight("/api/v1/generate"); // e.g., 10 tokens
const result = await limiter.limit(weight);
```

### In Middleware

```typescript
// backends/gateway/src/middlewares/rateLimit.ts
import { getRateLimiter, getApiWeight } from "@nebutra/rate-limit";

export async function rateLimitMiddleware(c, next) {
  const userId = c.get("userId");
  const plan = c.get("plan");
  const path = c.req.path;

  const limiter = getRateLimiter(userId, plan);
  const weight = getApiWeight(path);
  const result = await limiter.limit(weight);

  if (!result.success) {
    return c.json({ error: "Rate limited" }, 429);
  }

  return next();
}
```

## Plan Limits

| Plan       | Requests/min | Tokens/min |
| ---------- | ------------ | ---------- |
| FREE       | 60           | 100        |
| PRO        | 600          | 1000       |
| ENTERPRISE | 6000         | 10000      |

## API Weights

| Endpoint              | Weight |
| --------------------- | ------ |
| `/api/v1/generate`    | 10     |
| `/api/v1/embed`       | 5      |
| `/api/v1/*` (default) | 1      |

## Configuration

```typescript
import { PLAN_LIMITS, API_WEIGHTS } from "@nebutra/rate-limit";

// Customize limits
PLAN_LIMITS.PRO.tokensPerMinute = 2000;

// Add custom endpoint weights
API_WEIGHTS["/api/v1/custom"] = 3;
```

## Related

- [Cache strategies](../cache/)
- [BFF rate limit middleware](../../backends/gateway/)
