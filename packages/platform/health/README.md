# @nebutra/health

Health check utilities.

## Installation

```bash
pnpm add @nebutra/health
```

## Features

- **Dependency Checks** — Monitor database, cache, services
- **Liveness/Readiness** — Kubernetes-compatible probes
- **Aggregation** — Combined health status
- **Timeouts** — Configurable check timeouts

## Usage

### Basic Health Check

```typescript
import { healthCheck } from "@nebutra/health";

const health = await healthCheck.check();
// {
//   status: "healthy",
//   timestamp: "2024-01-15T10:30:00Z",
//   checks: { ... }
// }
```

### Register Checks

```typescript
import { healthCheck } from "@nebutra/health";

// Database check
healthCheck.register("database", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "healthy" };
});

// Redis check
healthCheck.register("redis", async () => {
  await redis.ping();
  return { status: "healthy" };
});

// External API check
healthCheck.register("stripe", async () => {
  const response = await fetch("https://api.stripe.com/health");
  return {
    status: response.ok ? "healthy" : "unhealthy",
    latency: response.headers.get("x-response-time"),
  };
});
```

### HTTP Endpoints

```typescript
import { healthRoutes } from "@nebutra/health";

// Express/Hono
app.route("/", healthRoutes);

// Endpoints:
// GET /health          - Full health check
// GET /health/live     - Liveness probe (is app running?)
// GET /health/ready    - Readiness probe (can accept traffic?)
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Check Options

```typescript
healthCheck.register("slow-service", checkFn, {
  timeout: 5000, // 5 second timeout
  critical: true, // Fails overall health if unhealthy
  interval: 30000, // Cache result for 30 seconds
});
```

## Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.2.3",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 5
    },
    "redis": {
      "status": "healthy",
      "latency": 2
    },
    "stripe": {
      "status": "degraded",
      "message": "High latency",
      "latency": 850
    }
  }
}
```

## Status Values

| Status      | Description             |
| ----------- | ----------------------- |
| `healthy`   | All systems operational |
| `degraded`  | Partial functionality   |
| `unhealthy` | Service unavailable     |

## Related

- [Status package](../status/)
- [Alerting package](../alerting/)
