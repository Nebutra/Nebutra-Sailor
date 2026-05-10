# Pusher Real-time Infrastructure

Real-time communication powered by [Pusher](https://pusher.com) for notifications, presence, and live updates.

## Features

- **Real-time Notifications**: Push updates to users instantly
- **Presence Channels**: Track online users and typing indicators
- **Private Channels**: Secure tenant-isolated messaging
- **Event Broadcasting**: Integrate with `@nebutra/event-bus`

## Channel Naming Convention

| Pattern                     | Example                  | Description                 |
| --------------------------- | ------------------------ | --------------------------- |
| `private-tenant-{tenantId}` | `private-tenant-org_123` | Tenant-wide broadcasts      |
| `private-user-{userId}`     | `private-user-user_456`  | User-specific notifications |
| `presence-room-{roomId}`    | `presence-room-doc_789`  | Collaborative presence      |
| `public-{channel}`          | `public-announcements`   | Public broadcasts           |

## Setup

### 1. Create Pusher Account

1. Go to [pusher.com](https://pusher.com) and create an app
2. Choose your cluster (recommend `ap1` for APAC)
3. Copy your credentials

### 2. Environment Variables

```bash
# Server-side (secret)
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret

# Client-side (public)
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1

# Optional: Auth endpoint
NEXT_PUBLIC_PUSHER_AUTH_ENDPOINT=/api/pusher/auth
```

### 3. Install Dependencies

```bash
pnpm add pusher pusher-js
```

## Usage

### Server-side (API Routes / BFF)

```typescript
import { pusherServer, triggerEvent } from "@/lib/pusher/server";

// Trigger event to a channel
await triggerEvent(
  `private-tenant-${tenantId}`,
  "notification",
  { message: "New order received", orderId: "123" }
);

// Batch trigger to multiple channels
await pusherServer.triggerBatch([
  { channel: `private-user-${userId1}`, name: "alert", data: { ... } },
  { channel: `private-user-${userId2}`, name: "alert", data: { ... } },
]);
```

### Client-side (React)

```typescript
import { usePusher, useChannel, usePresenceChannel } from "@/lib/pusher/client";

function NotificationListener() {
  const channel = useChannel(`private-user-${userId}`);

  useEffect(() => {
    if (!channel) return;

    channel.bind("notification", (data) => {
      toast.info(data.message);
    });

    return () => channel.unbind("notification");
  }, [channel]);

  return null;
}

function CollaborativeEditor({ roomId }) {
  const { members, myId } = usePresenceChannel(`presence-room-${roomId}`);

  return (
    <div>
      <span>{members.length} users online</span>
      {members.map(member => (
        <Avatar key={member.id} user={member.info} />
      ))}
    </div>
  );
}
```

### Auth Endpoint

```typescript
// apps/api-gateway/src/routes/pusher/auth.ts
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  const { socket_id, channel_name } = await req.json();
  const user = await getCurrentUser(req);

  // Validate channel access
  if (channel_name.startsWith("private-tenant-")) {
    const tenantId = channel_name.replace("private-tenant-", "");
    if (user.tenantId !== tenantId) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Authorize
  const auth = pusherServer.authorizeChannel(socket_id, channel_name, {
    user_id: user.id,
    user_info: { name: user.name, avatar: user.avatar },
  });

  return Response.json(auth);
}
```

## Event Types

Pre-defined event types for consistency:

```typescript
// Notifications
"notification"; // General notifications
"notification:urgent"; // High-priority alerts

// Collaboration
"presence:join"; // User joined
"presence:leave"; // User left
"cursor:move"; // Cursor position update
"typing:start"; // Typing indicator on
"typing:stop"; // Typing indicator off

// Data sync
"record:created"; // New record created
"record:updated"; // Record updated
"record:deleted"; // Record deleted

// System
"system:maintenance"; // Maintenance notice
"system:reload"; // Trigger client reload
```

## Integration with Event Bus

Bridge internal events to Pusher for real-time delivery:

```typescript
import { eventBus, EventTypes } from "@nebutra/event-bus";
import { broadcastToTenant } from "./broadcast";

// Subscribe to event bus and broadcast via Pusher
eventBus.subscribe(EventTypes.ORDER_CREATED, async (event) => {
  await broadcastToTenant(event.tenantId, "order:created", {
    orderId: event.data.orderId,
    total: event.data.total,
  });
});
```

## Self-hosted Alternative (Soketi)

For self-hosted deployments, use [Soketi](https://soketi.app):

```bash
# Docker
docker run -p 6001:6001 quay.io/soketi/soketi:latest

# Environment
PUSHER_HOST=localhost
PUSHER_PORT=6001
NEXT_PUBLIC_PUSHER_WS_HOST=localhost
NEXT_PUBLIC_PUSHER_WS_PORT=6001
```

## Rate Limits

| Plan       | Messages/day | Connections | Channels |
| ---------- | ------------ | ----------- | -------- |
| Sandbox    | 200K         | 100         | 100      |
| Startup    | 2M           | 500         | 1,000    |
| Pro        | 20M          | 10K         | 10K      |
| Enterprise | Custom       | Custom      | Custom   |

## Related

- [Pusher Documentation](https://pusher.com/docs/channels/)
- [Pusher React Hooks](https://github.com/mayteio/use-pusher)
- [Soketi](https://soketi.app) - Self-hosted alternative
