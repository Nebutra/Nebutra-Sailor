# @nebutra/alerting

Alerting and notification utilities.

## Installation

```bash
pnpm add @nebutra/alerting
```

## Features

- **Multi-channel** — Slack, Discord, Email, PagerDuty
- **Alert Levels** — Info, warning, error, critical
- **Throttling** — Prevent alert storms
- **Templates** — Consistent alert formatting

## Usage

### Send Alert

```typescript
import { alert } from "@nebutra/alerting";

await alert.send({
  level: "error",
  title: "Database connection failed",
  message: "Unable to connect to primary database",
  metadata: {
    host: "db.example.com",
    error: error.message,
  },
});
```

### Alert Levels

```typescript
alert.info("Deployment started", { version: "1.2.3" });
alert.warning("High memory usage", { usage: "85%" });
alert.error("Payment failed", { orderId: "123" });
alert.critical("Service down", { service: "api" });
```

### Channel Configuration

```typescript
import { configureChannels } from "@nebutra/alerting";

configureChannels({
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: "#alerts",
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  pagerduty: {
    routingKey: process.env.PAGERDUTY_KEY,
    levels: ["critical"], // Only critical alerts
  },
});
```

### Throttling

```typescript
// Same alert only sent once per 5 minutes
await alert.send({
  level: "warning",
  title: "Rate limit approaching",
  throttle: {
    key: "rate-limit-warning",
    duration: 300, // seconds
  },
});
```

### Alert Templates

```typescript
import { templates } from "@nebutra/alerting";

// Pre-formatted alerts
await templates.deploymentStarted({ version: "1.2.3", env: "production" });
await templates.deploymentFailed({ version: "1.2.3", error: "Build failed" });
await templates.serviceHealthy({ service: "api" });
await templates.serviceUnhealthy({ service: "api", reason: "Timeout" });
```

## Environment Variables

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PAGERDUTY_ROUTING_KEY=your-key
ALERT_DEFAULT_CHANNEL=slack
```

## Related

- [Observability](../../infra/ops/observability/)
- [Health package](../health/)
