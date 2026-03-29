> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/webhooks

Provider-agnostic webhook outbound management system for Nebutra. Supports **Svix** (managed) and **custom** (self-hosted) webhook delivery.

## Installation

```bash
pnpm add @nebutra/webhooks
```

## Quick Start

### 1. Initialize the webhooks provider

```typescript
import { getWebhooks } from "@nebutra/webhooks";

// Auto-detects provider from environment
const webhooks = await getWebhooks();

// Or explicit config
import { createWebhooks } from "@nebutra/webhooks";

const webhooks = await createWebhooks({
  provider: "svix",
  apiKey: "svix_test_...",
});
```

### 2. Create a webhook endpoint

```typescript
const endpoint = await webhooks.createEndpoint(
  "org_123", // tenantId
  {
    url: "https://example.com/webhooks",
    eventTypes: ["user.created", "invoice.paid"], // optional; empty = all events
    active: true,
    metadata: { team: "engineering" },
  }
);

console.log(endpoint.id);     // whe_...
console.log(endpoint.secret); // signing secret
```

### 3. Dispatch an event

```typescript
const messageId = await webhooks.sendEvent({
  eventType: "user.created",
  payload: {
    userId: "user_123",
    email: "alice@example.com",
    createdAt: new Date().toISOString(),
  },
  tenantId: "org_123",
});

console.log(messageId); // msg_...
```

### 4. Verify incoming webhooks (consumer side)

```typescript
import { verifyPayload } from "@nebutra/webhooks";

// In your API route handler
export async function POST(req: Request) {
  const signature = req.headers.get("Webhook-Signature");
  const payload = await req.text();

  // Extract timestamp from signature header
  const parts = signature.split(".");
  const timestamp = parts[1];

  try {
    verifyPayload(payload, parts[2], secret, timestamp);
    // Signature valid, process webhook
  } catch (error) {
    // Invalid or expired signature
    return new Response("Unauthorized", { status: 401 });
  }
}
```

## Providers

### Svix (Managed)

**Best for:** SaaS products, managed infrastructure, enterprise features.

Auto-detects if `SVIX_API_KEY` is set. Otherwise, pass config:

```typescript
const webhooks = await createWebhooks({
  provider: "svix",
  apiKey: "svix_test_...",
});
```

**Features:**
- ✅ Managed retry logic (exponential backoff)
- ✅ Built-in rate limiting & security
- ✅ Event replay and retry UI
- ✅ Webhook signing (Svix format)
- ✅ Application isolation per tenant
- ❌ No direct access to delivery attempts (API limitation)

**Environment variables:**
```env
SVIX_API_KEY=svix_test_...
```

### Custom (Self-Hosted)

**Best for:** Full control, on-premise deployments, fine-grained observability.

Auto-detects if `SVIX_API_KEY` is not set. Otherwise:

```typescript
const webhooks = await createWebhooks({
  provider: "custom",
  redisUrl: "redis://localhost:6379", // optional, for persistence
  maxRetries: 6,
  initialBackoffSec: 5,
});
```

**Features:**
- ✅ Full control over delivery logic
- ✅ In-memory or Redis-backed state
- ✅ Exponential backoff: 5s, 30s, 2m, 15m, 1h, 6h
- ✅ Manual retry & delivery observability
- ✅ HMAC-SHA256 signing (industry standard)
- ❌ You handle infra, scaling, monitoring

**Note:** For production use, implement Redis persistence and integrate with `@nebutra/queue` for distributed delivery.

## API

### `createWebhooks(config?: WebhookConfig): Promise<WebhookProvider>`

Create a webhooks provider.

```typescript
interface WebhookConfig {
  provider: "svix" | "custom";
  // ... provider-specific options
}
```

### `getWebhooks(): Promise<WebhookProvider>`

Get the default (singleton) provider. Auto-detects from environment.

### `WebhookProvider` Interface

#### `createEndpoint(tenantId, endpoint): Promise<WebhookEndpoint>`

Register a new webhook endpoint for a tenant.

```typescript
interface WebhookEndpoint {
  id: string;                    // whe_...
  url: string;                   // https://example.com/webhooks
  tenantId: string;              // org_123
  secret: string;                // signing secret (base64)
  eventTypes: string[];          // ["user.created", "invoice.paid"]
  active: boolean;
  createdAt: string;             // ISO-8601
  metadata?: Record<string, unknown>;
}
```

#### `updateEndpoint(endpointId, updates): Promise<WebhookEndpoint>`

Update an endpoint (URL, eventTypes, active status, metadata).

#### `deleteEndpoint(endpointId): Promise<void>`

Delete an endpoint.

#### `listEndpoints(tenantId): Promise<WebhookEndpoint[]>`

List all endpoints for a tenant.

#### `sendEvent(event): Promise<string>`

Dispatch an event to all matching endpoints. Returns message ID.

```typescript
interface WebhookMessage {
  eventType: string;                // "user.created"
  payload: Record<string, unknown>; // event data
  tenantId: string;                 // org_123
}
```

#### `getDeliveryAttempts(messageId): Promise<WebhookDeliveryAttempt[]>`

Get delivery attempt history for a message.

```typescript
interface WebhookDeliveryAttempt {
  id: string;
  messageId: string;
  endpointId: string;
  status: "success" | "failed" | "pending" | "timeout";
  statusCode: number | null;
  response: string | null;
  attemptNumber: number;
  nextRetryAt: string | null; // ISO-8601
  attemptedAt: string;        // ISO-8601
}
```

#### `retryMessage(messageId, endpointId): Promise<void>`

Manually retry delivery to a specific endpoint.

#### `rotateSecret(endpointId): Promise<string>`

Rotate the signing secret. Returns new secret.

#### `verifySignature(payload, signature, secret): Promise<boolean>`

Verify a webhook signature. Throws on invalid signature.

#### `close(): Promise<void>`

Graceful shutdown.

## Event Types

```typescript
enum WebhookEventType {
  // User events
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",

  // Invoice events
  INVOICE_PAID = "invoice.paid",
  INVOICE_FAILED = "invoice.failed",
  INVOICE_UPDATED = "invoice.updated",

  // Subscription events
  SUBSCRIPTION_CREATED = "subscription.created",
  SUBSCRIPTION_UPDATED = "subscription.updated",
  SUBSCRIPTION_CANCELLED = "subscription.cancelled",

  // Organization events
  ORG_CREATED = "org.created",
  ORG_UPDATED = "org.updated",
  ORG_DELETED = "org.deleted",
}
```

To add custom events, extend the enum or use string literals:

```typescript
await webhooks.sendEvent({
  eventType: "custom.myevent",
  payload: { ...data },
  tenantId: "org_123",
});
```

## Signing & Verification

### Standard Format

Webhooks are signed using **HMAC-SHA256**. The signature is included in the `Webhook-Signature` header:

```
Webhook-Signature: whsec_{secret}.{timestamp}.{signature}
```

Where:
- `secret` — base64-encoded signing secret (32 bytes)
- `timestamp` — Unix timestamp (seconds since epoch)
- `signature` — base64-encoded HMAC-SHA256 hash

### Verification

```typescript
import { verifyPayload, parseWebhookSignatureHeader } from "@nebutra/webhooks";

export async function POST(req: Request) {
  const payload = await req.text();
  const headerValue = req.headers.get("Webhook-Signature");

  const parsed = parseWebhookSignatureHeader(headerValue);
  if (!parsed) {
    return new Response("Invalid signature format", { status: 400 });
  }

  try {
    await webhooks.verifySignature(payload, headerValue, endpoint.secret);
    // Process webhook
  } catch (error) {
    return new Response("Unauthorized", { status: 401 });
  }
}
```

### Replay Attack Protection

Verification includes timestamp validation. Signatures older than 5 minutes (configurable) are rejected:

```typescript
verifyPayload(payload, signature, secret, timestamp, toleranceSec = 300);
```

## Examples

### Create & List Endpoints

```typescript
const webhooks = await getWebhooks();

// Create
const endpoint = await webhooks.createEndpoint("org_123", {
  url: "https://api.example.com/webhooks",
  eventTypes: ["invoice.paid"],
  metadata: { team: "payments" },
});

// List
const endpoints = await webhooks.listEndpoints("org_123");
console.log(endpoints);

// Delete
await webhooks.deleteEndpoint(endpoint.id);
```

### Send & Retry

```typescript
// Send event
const messageId = await webhooks.sendEvent({
  eventType: "invoice.paid",
  payload: {
    invoiceId: "inv_123",
    amount: 9999,
    currency: "USD",
  },
  tenantId: "org_123",
});

// Check delivery status
const attempts = await webhooks.getDeliveryAttempts(messageId);
for (const attempt of attempts) {
  console.log(
    `Endpoint ${attempt.endpointId}: ${attempt.status} (attempt ${attempt.attemptNumber})`
  );
}

// Manual retry
if (attempts.some((a) => a.status === "failed")) {
  await webhooks.retryMessage(messageId, failedEndpoint.id);
}
```

### Rotate Secrets

```typescript
const newSecret = await webhooks.rotateSecret(endpoint.id);
console.log(`New secret: ${newSecret}`);

// Store in your DB / notifiable secret manager
// Consumers need to be notified of the rotation
```

## Environment Variables

### Svix

```env
SVIX_API_KEY=svix_test_...
WEBHOOK_PROVIDER=svix  # optional, auto-detected
```

### Custom

```env
REDIS_URL=redis://localhost:6379  # optional, for persistence
WEBHOOK_PROVIDER=custom             # optional, auto-detected
```

## Production Checklist

For **Svix**:
- Set `SVIX_API_KEY` in production environment
- No additional setup required

For **Custom**:
- Deploy Redis or use managed Redis (AWS ElastiCache, etc.)
- Integrate with `@nebutra/queue` for distributed delivery
- Implement persistent state store (PostgreSQL table)
- Add monitoring/alerting on delivery failures
- Set up dead-letter queue for messages exceeding max retries
- Consider rate limiting per endpoint

## Contributing

When adding new features:
1. Update types in `src/types.ts`
2. Implement in both providers (`src/providers/svix.ts`, `src/providers/custom.ts`)
3. Add tests (if applicable)
4. Update this README with examples

## License

Proprietary — Nebutra-Sailor
