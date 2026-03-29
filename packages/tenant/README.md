> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/tenant

Multi-tenancy context and isolation for the Nebutra platform.

Provides:
- **Request-scoped tenant context** via AsyncLocalStorage (zero-copy, type-safe)
- **Tenant resolution strategies** (header, subdomain, path, JWT, API key)
- **Middleware integration** (Hono + Next.js)
- **Database isolation** (RLS, schema-per-tenant, database-per-tenant)
- **React hooks** for client-side tenant access

## Installation

```bash
pnpm add @nebutra/tenant
```

## Quick Start

### 1. Set Tenant Context in Middleware

**Hono (API Gateway)**

```typescript
import { Hono } from "hono";
import { tenantMiddleware } from "@nebutra/tenant/middleware";
import { getCurrentTenant } from "@nebutra/tenant";

const app = new Hono();

// Resolve tenant from x-tenant-id header
app.use(
  tenantMiddleware({
    headerName: "x-tenant-id",
    requireTenant: true,
  })
);

app.get("/api/data", async (c) => {
  const tenant = getCurrentTenant();
  return c.json({ tenantId: tenant.id });
});

export default app;
```

**Next.js API Route**

```typescript
// pages/api/data.ts
import { withTenant } from "@nebutra/tenant/middleware";
import { getCurrentTenant } from "@nebutra/tenant";

export default withTenant(async (req, res) => {
  const tenant = getCurrentTenant();
  res.json({ tenantId: tenant.id });
});
```

**Next.js Server Action**

```typescript
// lib/actions.ts
"use server";
import { withServerAction } from "@nebutra/tenant/middleware";
import { getCurrentTenant } from "@nebutra/tenant";
import { getSession } from "@/lib/auth";

export const fetchUserData = withServerAction(
  async (userId: string) => {
    const tenant = getCurrentTenant();
    const user = await db.user.findUnique({
      where: { id: userId, tenantId: tenant.id },
    });
    return user;
  },
  async () => {
    const session = await getSession();
    return session?.tenantId || null;
  }
);
```

### 2. Access Tenant Context

**In Server Code**

```typescript
import { getCurrentTenant, getTenantOrNull } from "@nebutra/tenant";

// Throws error if tenant not found
const tenant = getCurrentTenant();
console.log(tenant.id);

// Returns null if tenant not found
const tenantOpt = getTenantOrNull();
if (tenantOpt) {
  console.log(tenantOpt.id);
}
```

**In Client Components**

```typescript
"use client";
import { useTenant, useTenantId } from "@nebutra/tenant/react";
import { TenantProvider } from "@nebutra/tenant/react";

// In layout or root component
export default function RootLayout({ tenant, children }) {
  return (
    <TenantProvider value={tenant}>
      {children}
    </TenantProvider>
  );
}

// In child components
function Dashboard() {
  const tenantId = useTenantId();
  return <div>Tenant: {tenantId}</div>;
}
```

### 3. Database Isolation (Shared Schema + RLS)

```typescript
import { PrismaClient } from "@prisma/client";
import { withRls } from "@nebutra/tenant/isolation";
import { getCurrentTenant } from "@nebutra/tenant";

const prisma = new PrismaClient();

// In a request handler
const tenant = getCurrentTenant();
const client = withRls(prisma, tenant.id);

// All queries now enforce RLS policies
const users = await client.user.findMany();
```

## Tenant Resolution Strategies

### Header (Default)

```typescript
import { tenantMiddleware } from "@nebutra/tenant/middleware";

app.use(
  tenantMiddleware({
    headerName: "x-tenant-id", // or "x-org-id", etc
  })
);
```

### Subdomain

```typescript
import { tenantMiddleware } from "@nebutra/tenant/middleware";

app.use(
  tenantMiddleware({
    subdomainPattern: "^([a-z0-9-]+)\\.app\\.nebutra\\.com$",
  })
);
// Resolves tenant ID from "acme.app.nebutra.com" → "acme"
```

### URL Path

```typescript
import { tenantMiddleware } from "@nebutra/tenant/middleware";

app.use(
  tenantMiddleware({
    pathPrefix: "/org/:tenantId",
  })
);
// Resolves tenant ID from "/org/acme/dashboard" → "acme"
```

### JWT Claim

```typescript
import { tenantMiddleware } from "@nebutra/tenant/middleware";

app.use(
  tenantMiddleware({
    jwtClaimName: "tenant_id", // or "org_id", etc
  })
);
```

### API Key (Custom)

```typescript
import { fromApiKey, compose } from "@nebutra/tenant";
import { tenantMiddleware } from "@nebutra/tenant/middleware";

const keyResolver = fromApiKey(async (apiKey) => {
  const key = await db.apiKey.findUnique({
    where: { key: apiKey },
  });
  return key?.tenantId ?? null;
});

app.use(
  tenantMiddleware({
    resolver: keyResolver,
  })
);
```

### Composite (Fallback Chain)

```typescript
import { compose, fromHeader, fromSubdomain, fromPath } from "@nebutra/tenant";
import { tenantMiddleware } from "@nebutra/tenant/middleware";

const resolver = compose(
  fromHeader("x-tenant-id"),
  fromSubdomain("^([a-z0-9-]+)\\.app\\.nebutra\\.com$"),
  fromPath("/org/:tenantId")
);

app.use(
  tenantMiddleware({
    resolver,
  })
);
// Tries header first, then subdomain, then path
```

## Isolation Strategies

### Shared Schema + RLS (Default)

Single PostgreSQL schema with Row-Level Security (RLS) policies enforced at the database level.

```typescript
import { withRls } from "@nebutra/tenant/isolation";

const prisma = new PrismaClient();
const client = withRls(prisma, tenantId);

// All queries filtered by RLS policy:
// WHERE current_setting('app.current_tenant_id') = table.tenant_id
```

### Schema Per Tenant

Separate PostgreSQL schema per tenant (e.g., `org_acme_public`, `org_customer_public`).

```typescript
import { getTenantSchema } from "@nebutra/tenant/isolation";

const schemaName = getTenantSchema("acme-corp");
// Returns: "org_acme_corp_public"

// Use with migration tool:
// pnpm prisma migrate deploy --schema org_acme_corp_public
```

### Database Per Tenant

Separate PostgreSQL database per tenant, with connection pooling.

```typescript
import { getTenantDatabaseUrl } from "@nebutra/tenant/isolation";

const tenantDbUrl = getTenantDatabaseUrl("acme-corp");
// Returns: "postgresql://user:pass@localhost/nebutra_acme_corp"

// Create new Prisma client for this database:
const tenantPrisma = new PrismaClient({
  datasources: {
    db: { url: tenantDbUrl },
  },
});
```

## Types

### `TenantContext`

Runtime tenant context passed through requests.

```typescript
interface TenantContext {
  id: string; // Unique tenant identifier
  slug?: string; // URL-friendly slug
  plan?: "free" | "pro" | "enterprise"; // Subscription tier
  features?: string[]; // Feature flags
  limits?: Record<string, number>; // Rate limits and quotas
  metadata?: Record<string, unknown>; // Custom data
}
```

### `TenantInfo`

Persistent tenant information, usually loaded from database.

```typescript
interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
  settings: Record<string, unknown>;
  parentTenantId?: string; // For hierarchical orgs
}
```

### `TenantConfig`

Configuration for tenant extraction and isolation.

```typescript
interface TenantConfig {
  strategy?: "shared_schema" | "schema_per_tenant" | "database_per_tenant";
  headerName?: string; // Default: "x-tenant-id"
  subdomainPattern?: string; // Regex for subdomain extraction
  pathPrefix?: string; // URL path prefix
  jwtClaimName?: string; // JWT claim name
  requireTenant?: boolean; // Throw error if not found (default: true)
  resolver?: TenantResolver; // Custom resolver function
}
```

## API Reference

### Context

- `runWithTenant(context, fn)` — Execute function with tenant context
- `getCurrentTenant()` — Get current tenant (throws if missing)
- `getTenantOrNull()` — Get current tenant or null
- `requireTenant(tenant, context?)` — Assertion helper
- `getCurrentTenantId()` — Get tenant ID (throws if missing)
- `getTenantIdOrNull()` — Get tenant ID or null

### Resolvers

- `fromHeader(headerName?)` — Resolve from HTTP header
- `fromSubdomain(pattern)` — Resolve from subdomain regex
- `fromPath(prefix)` — Resolve from URL path
- `fromJwtClaim(claimName)` — Resolve from JWT claim
- `fromApiKey(lookupFn)` — Resolve from API key lookup
- `compose(...resolvers)` — Composite resolver with fallback

### Middleware

- `tenantMiddleware(config)` — Hono middleware
- `withTenant(handler, config)` — Next.js API route wrapper
- `withServerAction(handler, getTenantId)` — Next.js Server Action wrapper

### Isolation

- `withRls(prisma, tenantId)` — Apply RLS extension to Prisma
- `getTenantSchema(tenantId)` — Get schema name for schema-per-tenant
- `getTenantDatabaseUrl(tenantId, baseUrl?)` — Get DB URL for database-per-tenant
- `TenantAwarePrismaClient` — Wrapper class for tenant isolation
- `createTenantPrismaProxy(prisma, tenantId, strategy)` — Factory for isolation proxies

### React

- `TenantProvider` — Context provider component
- `useTenant()` — Hook to get current tenant
- `useTenantOrNull()` — Hook to get current tenant or null
- `useTenantId()` — Hook to get tenant ID
- `useTenantIdOrNull()` — Hook to get tenant ID or null
- `useTenantPlan()` — Hook to get tenant plan tier
- `useTenantFeature(feature)` — Hook to check feature flag
- `useTenantLimit(limitName, defaultValue?)` — Hook to get rate limit
- `withTenantGuard(Component, errorFallback?)` — HOC requiring tenant
- `TenantBoundary` — Component requiring tenant context

## Errors

### `TenantRequiredError`

Thrown when tenant context is required but not found.

```typescript
import { TenantRequiredError } from "@nebutra/tenant";

try {
  const tenant = getCurrentTenant();
} catch (err) {
  if (err instanceof TenantRequiredError) {
    console.log(err.statusCode); // 400
  }
}
```

### `TenantIsolationError`

Thrown when database isolation fails.

```typescript
import { TenantIsolationError } from "@nebutra/tenant";

try {
  const schema = getTenantSchema(invalidId);
} catch (err) {
  if (err instanceof TenantIsolationError) {
    console.log(err.strategy); // "schema_per_tenant"
  }
}
```

## Examples

### Multi-Tenant SaaS Dashboard

```typescript
// middleware.ts
import { tenantMiddleware } from "@nebutra/tenant/middleware";
import { compose, fromHeader, fromSubdomain } from "@nebutra/tenant";

const resolver = compose(
  fromHeader("x-tenant-id"),
  fromSubdomain("^([a-z0-9-]+)\\.app\\.nebutra\\.com$")
);

export const middleware = tenantMiddleware({ resolver });

// pages/api/dashboard/stats.ts
import { getCurrentTenant } from "@nebutra/tenant";
import { withRls } from "@nebutra/tenant/isolation";

export default withTenant(async (req, res) => {
  const tenant = getCurrentTenant();
  const prisma = withRls(db, tenant.id);

  const stats = await prisma.stat.aggregate({
    where: { tenantId: tenant.id },
  });

  res.json(stats);
});

// components/Dashboard.tsx
"use client";
import { useTenantId } from "@nebutra/tenant/react";

export function Dashboard() {
  const tenantId = useTenantId();
  return <div>Dashboard for {tenantId}</div>;
}
```

### Feature-Gated Functionality

```typescript
"use client";
import { useTenantFeature, useTenantPlan } from "@nebutra/tenant/react";

function AdvancedAnalytics() {
  const hasAdvanced = useTenantFeature("advanced_analytics");
  const plan = useTenantPlan();

  if (!hasAdvanced && plan === "free") {
    return <UpgradePrompt />;
  }

  return <AnalyticsPanel />;
}
```

## See Also

- [@nebutra/logger](../logger) — Structured logging
- [@nebutra/queue](../queue) — Message queue with tenant support
- Prisma RLS [Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access)
