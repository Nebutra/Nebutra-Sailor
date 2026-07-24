# @nebutra/auth

> Provider-agnostic authentication abstraction for **multi-provider parallel**
> (Better Auth default, Clerk enterprise option, Auth.js / NextAuth + Supabase migration).
>
> Product apps import **only this package**. Adapters live inside
> `src/providers/*`. Switch at scaffold (`create-sailor --auth=...`) or runtime
> via `AUTH_PROVIDER` / `NEXT_PUBLIC_AUTH_PROVIDER`.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/auth@workspace:*
```

## Usage

### Server-side

```typescript
import { createAuth } from "@nebutra/auth";

const auth = await createAuth({ provider: "better-auth" });
const session = await auth.getSession(request);
```

### Client-side

```typescript
import { useAuth } from "@nebutra/auth/client";

const { user, signOut } = useAuth();
```

### React Provider

```tsx
import { AuthProvider } from "@nebutra/auth/react";

<AuthProvider provider="better-auth">
  <App />
</AuthProvider>
```

### Middleware

```typescript
import { createAuthMiddleware } from "@nebutra/auth/middleware";

const middleware = createAuthMiddleware({ provider: "clerk" });
```

## API

| Export | Subpath | Description |
|--------|---------|-------------|
| `createAuth` | `.` | Server-side auth factory |
| `createAuthMiddleware` | `./middleware` | Middleware factory for route protection |
| `useAuth` | `./client` | Client-side auth hook |
| `AuthProvider` | `./react` | React context provider |

### Types

`User`, `Session`, `Organization`, `AuthConfig`, `AuthProviderId`, `AuthCapabilities`,
`SignInMethod`, `CreateUserInput`, `CreateOrgInput`

### Multi-provider matrix

```ts
import {
  AUTH_PROVIDER_MATRIX,
  getConfiguredAuthProvider,
  isCapabilityDeclared,
  isCapabilityEffective,
} from "@nebutra/auth";

const provider = getConfiguredAuthProvider();
const profile = AUTH_PROVIDER_MATRIX[provider];
// UI gate: declared AND runtime probe
if (isCapabilityEffective(provider, "organizations", auth.capabilities)) {
  // show org switcher
}
```

| Provider | Tier | Notes |
|----------|------|--------|
| **better-auth** | first-class (default) | Self-hosted reference implementation |
| **clerk** | optional-enterprise | Explicit `AUTH_PROVIDER=clerk` |
| **nextauth** | migration | **Auth.js** (ex-NextAuth.js; package `next-auth`). Scaffold / migrate only |
| **supabase** | migration | Scaffold / experimental |
| **dev** | dev-only | Synthetic local sessions |

**Impersonation** is declared `false` for all providers until an adapter ships
end-to-end support (product returns `501 AUTH_CAPABILITY_UNSUPPORTED`).

## Configuration

Depends on the chosen provider:

| Provider | Required Environment Variables |
|----------|-------------------------------|
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| Better Auth | Database connection (via `@nebutra/db`) |
