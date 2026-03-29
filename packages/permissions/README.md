> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/permissions

RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control) permissions engine for the Nebutra-Sailor monorepo. Built on CASL with optional OpenFGA support for relationship-based access at scale.

## Features

- **CASL-based in-process evaluation** — Fast, no network calls, great for UI + API middleware
- **OpenFGA integration** — Managed/self-hosted Zanzibar for complex relationship graphs
- **Role hierarchy** — Roles inherit permissions from parent roles
- **ABAC conditions** — Dynamic field resolution at evaluation time
- **Field-level permissions** — Restrict access to specific fields
- **React hooks & components** — `usePermission()`, `<Can>` component for UI gate-keeping
- **Hono middleware** — Automatic permission checks in API routes
- **Provider auto-detection** — Automatically picks CASL or OpenFGA based on env vars

## Installation

```bash
pnpm add @nebutra/permissions
```

## Quick Start

### 1. API Middleware (Hono)

```typescript
import { createPermissions, attachPermissionContext, requirePermission } from "@nebutra/permissions";
import { Hono } from "hono";

const app = new Hono();
const permissions = createPermissions();

app.use(
  attachPermissionContext(async (c) => {
    // Extract user from JWT, session, etc.
    const user = await getCurrentUser(c);
    return {
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
    };
  })
);

// Protect a route
app.patch("/documents/:id", requirePermission("update", "Document"), async (c) => {
  const doc = await db.document.findUnique({ where: { id: c.req.param("id") } });
  // Update logic...
  return c.json(doc);
});
```

### 2. React Components

```typescript
import { PermissionProvider, Can, Cannot, usePermission } from "@nebutra/permissions";
import { createCASLProvider } from "@nebutra/permissions/casl";

const provider = createCASLProvider();

export function App() {
  const userContext = {
    userId: "user_123",
    tenantId: "org_456",
    roles: ["member"],
  };

  return (
    <PermissionProvider provider={provider} context={userContext}>
      <DocumentEditor />
    </PermissionProvider>
  );
}

function DocumentEditor() {
  return (
    <div>
      <Can action="read" resource="Document" subject={document}>
        <p>{document.content}</p>
      </Can>

      <Can action="update" resource="Document" subject={document}>
        <button>Edit</button>
      </Can>

      <Cannot action="delete" resource="Document">
        <p className="text-red-500">You cannot delete this document</p>
      </Cannot>
    </div>
  );
}
```

### 3. Define Custom Roles

```typescript
import { createCASLProvider, type RoleDefinition } from "@nebutra/permissions";

const customRoles: RoleDefinition[] = [
  {
    role: "editor",
    inherits: "member",
    description: "Can create and edit documents",
    rules: [
      {
        action: ["create", "update"],
        resource: "Document",
      },
    ],
  },
];

const provider = createCASLProvider(customRoles);
```

## Role Hierarchy

Roles inherit permissions from parent roles. The default roles are:

- **owner** — Full control
- **admin** — Everything except billing and workspace deletion (inherits owner)
- **member** — CRUD own resources, read shared (inherits viewer)
- **viewer** — Read-only access to shared resources
- **billing_admin** — Manage billing (inherits viewer)
- **guest** — Limited access to shared resources

```typescript
{
  role: "editor",
  inherits: ["member", "reviewer"], // Multiple inheritance
  rules: [ /* ... */ ]
}
```

## ABAC Conditions

Dynamically resolve conditions at evaluation time using template syntax:

```typescript
const rule: PermissionRule = {
  action: "update",
  resource: "Document",
  conditions: {
    createdBy: "${user.userId}",       // Resolved from context
    tenantId: "${user.tenantId}",
    visibility: "private"
  }
};
```

Variables resolved from `PermissionContext`:
- `${user.userId}`
- `${user.tenantId}`
- `${user.attributes.team}` — Custom attributes

## Field-Level Permissions

Restrict access to specific document fields:

```typescript
const rule: PermissionRule = {
  action: "read",
  resource: "Document",
  fields: ["title", "content"], // Only these fields readable
};
```

## Provider Configuration

### CASL (Default, In-Process)

Fast, no network calls. Great for UI and API middleware.

```typescript
import { createCASLProvider } from "@nebutra/permissions/casl";

const provider = createCASLProvider();
```

**Auto-detection:** Uses CASL if no `OPENFGA_API_URL` env var is set.

### OpenFGA (Relationship-Based)

For complex relationship graphs (teams, departments, role cascades).

```typescript
import { createOpenFGAProvider } from "@nebutra/permissions/openfga";

const provider = createOpenFGAProvider(
  "http://openfga.internal:8080",
  roles
);

// Write relationship tuples
await provider.write([
  { user: "user_123", relation: "member", object: "team:acme" },
  { user: "team:acme", relation: "parent", object: "org:company" },
]);

// Check access
const allowed = await provider.check(
  "user_123",
  "can_edit",
  "document:doc_456"
);
```

**Auto-detection:** Uses OpenFGA if `OPENFGA_API_URL` env var is set.

## Environment Variables

```env
# Provider selection (auto-detects if empty)
PERMISSIONS_PROVIDER=casl              # "casl" | "openfga"

# OpenFGA configuration
OPENFGA_API_URL=http://openfga:8080    # Triggers OpenFGA provider
OPENFGA_STORE_ID=abc123                # Optional
OPENFGA_AUTH_TOKEN=secret              # Optional for managed OpenFGA
```

## API Reference

### `createPermissions(config?)`

Initialize the global permissions manager (singleton).

```typescript
const permissions = createPermissions({
  provider: "casl",
  roles: customRoles,
  openFgaApiUrl: "http://openfga:8080",
});
```

### `getPermissions()`

Get the global permissions manager instance.

```typescript
const permissions = getPermissions();
const can = permissions.can(context, "read", "Document");
```

### `requirePermission(action, resource, options?)`

Hono middleware for automatic permission checks.

```typescript
app.delete(
  "/documents/:id",
  requirePermission("delete", "Document", {
    extractSubject: (c) => ({ id: c.req.param("id") }),
    onDenied: (c, error) => c.json({ error: error.message }, 403),
  }),
  deleteDocumentHandler
);
```

### `attachPermissionContext(extractUser)`

Hono middleware to attach user context from request.

```typescript
app.use(
  attachPermissionContext(async (c) => {
    const token = c.req.header("authorization");
    const user = await verifyToken(token);
    return {
      userId: user.id,
      tenantId: user.organizationId,
      roles: user.roles,
      attributes: { team: user.teamId },
    };
  })
);
```

### `<Can>` / `<Cannot>` (React)

Conditionally render based on permissions.

```typescript
<Can action="update" resource="Document" subject={doc} fallback={<p>Read-only</p>}>
  <DocumentForm />
</Can>

<Cannot action="publish" resource="Document">
  <p>Publishing disabled</p>
</Cannot>
```

### `usePermission(action, resource, subject?)`

Hook to check permissions in components.

```typescript
function DocumentButton() {
  const canDelete = usePermission("delete", "Document", document);
  return canDelete ? <button>Delete</button> : null;
}
```

## Examples

### Example 1: Team Workspace with Roles

```typescript
// API setup
const permissions = createPermissions();

app.use(
  attachPermissionContext(async (c) => {
    const user = await getCurrentUser(c);
    return {
      userId: user.id,
      tenantId: user.workspaceId,
      roles: user.workspaceRoles,
    };
  })
);

app.get(
  "/projects",
  async (c) => {
    const user = c.get("user");
    const projects = await db.project.findMany({
      where: {
        workspaceId: user.tenantId,
        // If using Prisma + CASL
        // ...accessibleBy(ability, "read").project
      },
    });
    return c.json(projects);
  }
);

// React component
<PermissionProvider provider={provider} context={userContext}>
  {projects.map((project) => (
    <div key={project.id}>
      <h3>{project.name}</h3>
      <Can action="update" resource="Project" subject={project}>
        <EditProjectButton projectId={project.id} />
      </Can>
    </div>
  ))}
</PermissionProvider>
```

### Example 2: Custom Role with Conditions

```typescript
const advancedRoles: RoleDefinition[] = [
  {
    role: "project_owner",
    description: "Own projects within a workspace",
    rules: [
      {
        action: ["create", "read", "update", "delete"],
        resource: "Project",
        conditions: {
          "ownerId": "${user.userId}",
          "workspaceId": "${user.tenantId}",
        },
      },
      {
        action: ["invite"],
        resource: "User",
        conditions: { "workspaceId": "${user.tenantId}" },
      },
    ],
  },
];

const provider = createCASLProvider(advancedRoles);
```

## Troubleshooting

### Permission check always returns false

- Verify user context is being set correctly (roles, userId, tenantId)
- Check role definitions include the required rule
- Ensure conditions match the subject data

### CASL provider caching issues

Clear the provider cache:

```typescript
import { CASLProvider } from "@nebutra/permissions/casl";

const provider = new CASLProvider();
provider.clearCache();
```

### OpenFGA connection errors

Verify `OPENFGA_API_URL` is reachable:

```bash
curl http://openfga:8080/health
```

Check logs for `OpenFGA check error` messages.

## License

MIT
