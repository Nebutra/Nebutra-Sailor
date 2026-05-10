# @nebutra/audit

> **Status: WIP** — Not yet integrated into any production app. Do not import until this notice is removed.

Audit logging for compliance and security.

## Installation

```bash
pnpm add @nebutra/audit
```

## Features

- **Structured Logs** — Consistent audit event format
- **Multi-tenant** — Events scoped by organization
- **Immutable** — Append-only audit trail
- **Queryable** — Search and filter audit logs

## Usage

### Log Event

```typescript
import { auditLog } from "@nebutra/audit";

await auditLog.log({
  action: "user.login",
  actor: {
    id: "user_123",
    email: "user@example.com",
  },
  resource: {
    type: "session",
    id: "sess_456",
  },
  tenantId: "org_789",
  metadata: {
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
  },
});
```

### Common Actions

```typescript
// Authentication
auditLog.log({ action: "user.login", ... });
auditLog.log({ action: "user.logout", ... });
auditLog.log({ action: "user.password_reset", ... });

// Data access
auditLog.log({ action: "data.export", ... });
auditLog.log({ action: "data.delete", ... });

// Admin actions
auditLog.log({ action: "member.invite", ... });
auditLog.log({ action: "member.remove", ... });
auditLog.log({ action: "settings.update", ... });
```

### Query Logs

```typescript
const logs = await auditLog.query({
  tenantId: "org_789",
  action: "user.login",
  actorId: "user_123",
  from: new Date("2024-01-01"),
  to: new Date("2024-01-31"),
  limit: 100,
});
```

### Middleware

```typescript
import { auditMiddleware } from "@nebutra/audit";

// Auto-log all API requests
app.use(
  auditMiddleware({
    exclude: ["/health", "/metrics"],
  }),
);
```

## Event Schema

```typescript
interface AuditEvent {
  id: string; // Unique event ID
  timestamp: Date; // Event time
  action: string; // Action identifier
  actor: {
    id: string;
    email?: string;
    type: "user" | "system" | "api_key";
  };
  resource: {
    type: string;
    id: string;
  };
  tenantId: string;
  result: "success" | "failure";
  metadata?: Record<string, unknown>;
}
```

## Storage

Audit logs are stored in:

- **Primary:** Supabase (queryable)
- **Archive:** S3/R2 (long-term retention)

## Related

- [Database package](../db/)
- [Observability](../../infra/ops/observability/)
