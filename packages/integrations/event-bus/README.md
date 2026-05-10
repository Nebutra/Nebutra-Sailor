# @nebutra/event-bus

> **Status: WIP** — Partially integrated (consumed by `@nebutra/saga` and `workflows/pusher`). Not yet used by any production app.

Cross-service event communication.

## Installation

```bash
pnpm add @nebutra/event-bus
```

## Features

- **Pub/Sub** — Publish and subscribe to events
- **Type-safe** — Typed event schemas
- **Multi-tenant** — Events scoped by tenant
- **Async** — Non-blocking event delivery

## Usage

### Define Events

```typescript
// Event schema
interface UserCreatedEvent {
  userId: string;
  email: string;
  tenantId: string;
  timestamp: number;
}
```

### Publish Events

```typescript
import { eventBus } from "@nebutra/event-bus";

await eventBus.publish("user.created", {
  userId: "123",
  email: "user@example.com",
  tenantId: "org_456",
  timestamp: Date.now(),
});
```

### Subscribe to Events

```typescript
import { eventBus } from "@nebutra/event-bus";

eventBus.subscribe("user.created", async (event) => {
  console.log("New user:", event.email);
  await sendWelcomeEmail(event.email);
});
```

### Event Types

| Event               | Description          |
| ------------------- | -------------------- |
| `user.created`      | New user registered  |
| `user.updated`      | User profile updated |
| `order.placed`      | New order created    |
| `order.fulfilled`   | Order shipped        |
| `content.published` | Content published    |

## Patterns

### Fan-out

Multiple subscribers for one event:

```typescript
// Service A
eventBus.subscribe("order.placed", sendConfirmationEmail);

// Service B
eventBus.subscribe("order.placed", updateInventory);

// Service C
eventBus.subscribe("order.placed", notifyWarehouse);
```

### Request-Reply

For synchronous-style communication:

```typescript
const response = await eventBus.request("user.validate", {
  email: "user@example.com",
});
```

## Related

- [Saga patterns](../saga/)
- [Inngest workflows](../../workflows/inngest/)
