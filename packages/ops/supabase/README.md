# @nebutra/supabase

Supabase client for Realtime, Storage, and Edge Functions (Auth handled by Clerk).

## Installation

```bash
pnpm add @nebutra/supabase
```

## Environment Variables

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# For client-side (Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Usage

### Client

```typescript
import { getSupabaseClient, getSupabaseServer, getSupabaseTenant } from "@nebutra/supabase";

// Browser client (uses anon key, respects RLS)
const client = getSupabaseClient();

// Server client (uses service key, bypasses RLS)
const server = getSupabaseServer();

// Tenant-scoped client (sets x-tenant-id header)
const tenant = getSupabaseTenant("org_123");
```

### Realtime

```typescript
import { subscribeToTable, broadcast, subscribeToPresence } from "@nebutra/supabase";

// Subscribe to table changes
const channel = subscribeToTable({
  table: "contents",
  filter: "organization_id=eq.org_123",
  onInsert: (row) => console.log("New content:", row),
  onUpdate: ({ old, new: updated }) => console.log("Updated:", updated),
  onDelete: (row) => console.log("Deleted:", row),
});

// Broadcast messages
await broadcast("room:123", "message", { text: "Hello!" });

// Presence (online users)
const presenceChannel = subscribeToPresence("room:123", {
  onJoin: (key, current, newUsers) => console.log("User joined:", newUsers),
  onLeave: (key, current, left) => console.log("User left:", left),
});
```

### Storage

```typescript
import { upload, download, getSignedUrl, remove } from "@nebutra/supabase";

// Upload file
const { path, url } = await upload({
  bucket: "avatars",
  path: "user_123/avatar.png",
  file: fileBlob,
  contentType: "image/png",
});

// Get signed URL (temporary access)
const signedUrl = await getSignedUrl({
  bucket: "private-docs",
  path: "report.pdf",
  expiresIn: 3600, // 1 hour
});

// Delete file
await remove("avatars", ["user_123/avatar.png"]);
```

### Server Utilities

```typescript
import { withTenant, invokeFunction, healthCheck } from "@nebutra/supabase";

// Execute with tenant context
const data = await withTenant("org_123", async (client) => {
  const { data } = await client.from("contents").select("*");
  return data;
});

// Call Edge Function
const result = await invokeFunction("process-webhook", {
  body: { event: "order.created" },
});

// Health check
const status = await healthCheck();
// { status: "healthy", latency: 45 }
```

## Multi-Tenant Pattern

The package supports multi-tenancy through:

1. **RLS Policies** — All queries are filtered by `organization_id`
2. **Tenant Header** — `getSupabaseTenant(id)` sets `x-tenant-id` header
3. **Context Function** — `setTenantContext(id)` for raw SQL queries

## Exports

| Export | Description |
| ------ | ----------- |
| `@nebutra/supabase` | All exports |
| `@nebutra/supabase/client` | Client creation |
| `@nebutra/supabase/realtime` | Realtime subscriptions |
| `@nebutra/supabase/storage` | File storage |
| `@nebutra/supabase/server` | Server utilities |
