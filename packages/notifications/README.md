> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/notifications

Provider-agnostic notification center for the Nebutra platform. Supports multiple channels (in-app, email, push, SMS, chat) and multiple backends (Novu or self-hosted).

## Features

- **Multi-channel**: Send notifications across in-app, email, push, SMS, and chat
- **Provider-agnostic**: Switch between Novu and self-hosted without changing application code
- **Multi-tenant**: Built-in support for tenant isolation
- **Preferences**: User-controlled notification preferences per channel
- **In-app feed**: Native in-app notification center with read/unread tracking
- **Pluggable dispatchers**: Direct provider accepts custom implementations for each channel

## Installation

```bash
pnpm add @nebutra/notifications
```

## Quick Start

### Auto-detection (recommended)

```typescript
import { getNotificationProvider, createNotification } from "@nebutra/notifications";

const notifier = await getNotificationProvider();

// Send a notification
await notifier.send(
  createNotification(
    "invoice.paid",
    "user_123",
    ["email", "in_app"],
    {
      invoiceId: "inv_456",
      amount: 99.99,
      email: "user@example.com",
    },
    "tenant_789"
  )
);
```

The provider is auto-detected based on environment:
- If `NOVU_API_KEY` is set → Novu
- Otherwise → Direct (with in-memory store)

### Explicit Configuration

#### Using Novu

```typescript
import { createNotificationProvider } from "@nebutra/notifications";

const notifier = await createNotificationProvider({
  provider: "novu",
  apiKey: "your-novu-api-key",
  baseUrl: "https://api.novu.co", // optional, for self-hosted
});
```

#### Using Direct Provider with Custom Dispatchers

```typescript
import { createNotificationProvider } from "@nebutra/notifications";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const notifier = await createNotificationProvider({
  provider: "direct",
  emailDispatcher: {
    send: async (to, subject, body) => {
      const result = await resend.emails.send({
        from: "noreply@example.com",
        to,
        subject,
        html: body,
      });
      return {
        sent: !result.error,
        messageId: result.data?.id || "",
        error: result.error?.message,
      };
    },
  },
  // Add other dispatchers as needed
});
```

## API Reference

### Send Notifications

```typescript
// Send to a single recipient
const result = await notifier.send(createNotification(
  type,
  recipientId,
  channels,
  data,
  tenantId
));

// Send to multiple recipients (batched)
const results = await notifier.sendBatch([
  notification1,
  notification2,
  notification3,
]);
```

### Manage Preferences

```typescript
// Get user's notification preferences
const prefs = await notifier.getPreferences(userId, tenantId);

// Update preferences for specific channels
await notifier.updatePreferences(userId, [
  { channel: "email", enabled: false },
  { channel: "sms", frequency: "daily" },
], tenantId);
```

### In-App Notifications

```typescript
// Get user's in-app feed
const feed = await notifier.getInAppNotifications(userId, {
  limit: 20,
  offset: 0,
  unreadOnly: false,
}, tenantId);
// Returns: { notifications: [...], total: 42, unreadCount: 5 }

// Mark as read
await notifier.markAsRead(notificationId, userId, tenantId);
```

## Notification Payload

```typescript
interface NotificationPayload {
  id?: string; // Auto-generated if omitted
  type: string; // Template ID (e.g., "invoice.paid")
  recipientId: string; // User ID
  tenantId?: string; // Tenant isolation
  channels: NotificationChannel[]; // Where to send
  data: Record<string, unknown>; // Template variables
  overrides?: {
    email?: { subject?: string; body?: string };
    sms?: { body?: string };
    push?: { title?: string; body?: string };
    in_app?: { title?: string; body?: string };
    chat?: { text?: string };
  };
  metadata?: Record<string, unknown>; // Debug info
}
```

## Providers

### Novu

Managed notification infrastructure with templates, delivery guarantees, and built-in preference management.

**Setup:**
1. Sign up at https://novu.co
2. Get your API key from the dashboard
3. Create templates in Novu dashboard

**Env vars:**
```env
NOVU_API_KEY=your-api-key
NOTIFICATION_PROVIDER=novu # optional
```

### Direct

Self-hosted provider that delegates to pluggable dispatchers. Useful for custom implementations or existing email/SMS services.

**Dispatchers to implement:**

```typescript
interface EmailDispatcher {
  send(to: string, subject: string, body: string, html?: string): Promise<{
    messageId: string;
    sent: boolean;
    error?: string;
  }>;
}

interface PushDispatcher {
  send(userId: string, title: string, body: string, data?: Record<string, string>): Promise<{
    messageId: string;
    sent: boolean;
    error?: string;
  }>;
}

interface SMSDispatcher {
  send(phoneNumber: string, body: string): Promise<{
    messageId: string;
    sent: boolean;
    error?: string;
  }>;
}

interface ChatDispatcher {
  send(webhookUrl: string, text: string, data?: Record<string, unknown>): Promise<{
    messageId: string;
    sent: boolean;
    error?: string;
  }>;
}

interface InAppNotificationStore {
  create(notification: Omit<InAppNotification, "id" | "createdAt" | "updatedAt">): Promise<InAppNotification>;
  markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void>;
  markAsReadBatch(notificationIds: string[], userId: string, tenantId?: string): Promise<void>;
  getByUserId(userId: string, options?: InAppFeedOptions, tenantId?: string): Promise<InAppFeedResult>;
  deleteOld(beforeDate: Date, tenantId?: string): Promise<number>;
}

interface PreferenceStore {
  getAll(userId: string, tenantId?: string): Promise<NotificationPreference[]>;
  getByChannel(userId: string, channel: NotificationChannel, tenantId?: string): Promise<NotificationPreference | null>;
  updateBatch(userId: string, preferences: Partial<NotificationPreference>[], tenantId?: string): Promise<void>;
}
```

## Multi-Tenancy

All notification operations support `tenantId` for isolating notifications across different customers:

```typescript
await notifier.send(
  createNotification(
    "invoice.paid",
    "user_123",
    ["email"],
    { invoiceId: "inv_456" },
    "tenant_789" // ← Tenant isolation
  )
);

// Preferences are also tenant-scoped
await notifier.getPreferences(userId, tenantId);
```

## Environment Variables

```env
# Provider selection (optional, auto-detected)
NOTIFICATION_PROVIDER=novu|direct

# Novu configuration
NOVU_API_KEY=your-api-key
NOVU_BASE_URL=https://api.novu.co # optional, for self-hosted

# Logging
LOG_LEVEL=info|debug|warn|error
```

## Examples

### Send Email Notification

```typescript
const notifier = await getNotificationProvider();

await notifier.send(
  createNotification(
    "payment.received",
    "user_123",
    ["email"],
    {
      amount: 99.99,
      email: "user@example.com",
    }
  )
);
```

### Send Multi-Channel Notification

```typescript
await notifier.send(
  createNotification(
    "project.shared",
    "user_123",
    ["email", "in_app", "push"],
    {
      projectName: "Q1 Planning",
      projectId: "proj_456",
      sharedBy: "Alice",
      email: "user@example.com",
      title: "Project Shared",
      body: "Alice shared Q1 Planning with you",
    }
  )
);
```

### Batch Send

```typescript
const notifications = [
  createNotification("invoice.paid", "user_1", ["email"], { ...data }),
  createNotification("invoice.paid", "user_2", ["email"], { ...data }),
  createNotification("invoice.paid", "user_3", ["email", "in_app"], { ...data }),
];

const results = await notifier.sendBatch(notifications);
```

### Handle User Preferences

```typescript
// User disables email notifications
await notifier.updatePreferences(userId, [
  {
    channel: "email",
    enabled: false,
  },
]);

// Subsequent sends to this user won't include email channel
// (even if "email" is in the channels array)
```

## Testing

For development, use the in-memory direct provider (default):

```typescript
import { createNotificationProvider } from "@nebutra/notifications";

const notifier = await createNotificationProvider({
  provider: "direct",
  // Uses in-memory stores — no external services needed
});

// Test your notification logic
await notifier.send(createNotification(
  "test.notification",
  "test_user",
  ["in_app"],
  { message: "Hello" }
));
```

## License

Proprietary — Nebutra platform
