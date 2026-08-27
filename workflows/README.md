# Workflows

Event-driven business workflow definitions. Extracted from `infra/` at W2.3
because these are **business logic**, not infrastructure — they share the same
conceptual layer as [`packages/integrations/queue/`](../packages/integrations/queue/),
[`packages/integrations/event-bus/`](../packages/integrations/event-bus/), and
[`packages/integrations/saga/`](../packages/integrations/saga/).

## Structure

```
workflows/
├── inngest/    # Serverless background jobs + cron + event-driven processing (Inngest CE)
├── n8n/        # Visual workflow automation (n8n self-hosted)
└── pusher/     # Real-time messaging glue (Pusher / Soketi)
```

## Provider notes

| Provider | When to use | Hosting |
|---------|------------|---------|
| **Inngest** | TypeScript-defined durable workflows; retries, scheduling, fan-out/fan-in | Self-hosted CE or Inngest Cloud |
| **n8n** | Non-engineer-authored automations / integrations | Self-hosted (`docker-compose`) |
| **Pusher** | Low-latency client push (chat, presence) | Pusher Cloud or Soketi self-host |

## Related packages

- [`@nebutra/queue`](../packages/integrations/queue/) — provider-agnostic queue interface (QStash + BullMQ)
- [`@nebutra/event-bus`](../packages/integrations/event-bus/) — pub/sub abstraction
- [`@nebutra/saga`](../packages/integrations/saga/) — long-running transaction orchestration
- [`@nebutra/webhooks`](../packages/integrations/webhooks/) — outbound webhook delivery
