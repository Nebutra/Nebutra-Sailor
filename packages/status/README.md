# @nebutra/status

Public status page integration.

## Installation

```bash
pnpm add @nebutra/status
```

## Features

- **OpenStatus Integration** — Public status page
- **Incident Management** — Create and update incidents
- **Uptime Tracking** — Monitor service availability
- **Status Badges** — Embeddable status indicators

## Usage

### Report Status

```typescript
import { status } from "@nebutra/status";

// Report service status
await status.report({
  service: "api",
  status: "operational",
});

// Report degraded performance
await status.report({
  service: "api",
  status: "degraded",
  message: "Elevated response times",
});
```

### Create Incident

```typescript
import { incidents } from "@nebutra/status";

const incident = await incidents.create({
  title: "API Degradation",
  status: "investigating",
  impact: "minor",
  message: "We are investigating elevated error rates.",
  affectedServices: ["api", "dashboard"],
});
```

### Update Incident

```typescript
await incidents.update(incident.id, {
  status: "identified",
  message: "Root cause identified. Working on fix.",
});

// Resolve incident
await incidents.resolve(incident.id, {
  message: "Issue has been resolved.",
});
```

### Status Values

| Status           | Description               |
| ---------------- | ------------------------- |
| `operational`    | All systems normal        |
| `degraded`       | Reduced performance       |
| `partial_outage` | Some features unavailable |
| `major_outage`   | Service unavailable       |
| `maintenance`    | Planned maintenance       |

### Incident Status

| Status          | Description              |
| --------------- | ------------------------ |
| `investigating` | Looking into the issue   |
| `identified`    | Root cause found         |
| `monitoring`    | Fix deployed, monitoring |
| `resolved`      | Issue resolved           |

## OpenStatus Configuration

```typescript
import { configureStatus } from "@nebutra/status";

configureStatus({
  apiKey: process.env.OPENSTATUS_API_KEY,
  pageId: "your-page-id",
  services: {
    api: "monitor-id-1",
    dashboard: "monitor-id-2",
    database: "monitor-id-3",
  },
});
```

## Status Badge

```typescript
import { getStatusBadge } from "@nebutra/status";

const badge = getStatusBadge("api");
// Returns SVG badge URL
```

## Environment Variables

```bash
OPENSTATUS_API_KEY=your-api-key
OPENSTATUS_PAGE_ID=your-page-id
```

## Related

- [Health package](../health/)
- [Alerting package](../alerting/)
- [Observability](../../infra/ops/observability/)
