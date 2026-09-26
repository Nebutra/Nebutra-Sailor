# @nebutra/auth

> Authentication abstraction for Sailor's single kept provider: **Better Auth**
> (per ADR 2026-09-24 Sailor Convergence — the Clerk, Auth.js/NextAuth, and
> Supabase adapters have been deleted, not demoted). `dev` remains for
> synthetic local sessions.
>
> Product apps import **only this package**. The adapter lives inside
> `src/providers/better-auth.ts`. `create-sailor` has no `--auth` flag — the
> scaffold ships Better Auth only; runtime behavior is controlled via
> `AUTH_PROVIDER` / `NEXT_PUBLIC_AUTH_PROVIDER`.
>
> `apps/sleptons` is a documented exception: it is Nebutra's own product,
> stripped from the template, and keeps a direct `@clerk/nextjs` integration
> that does not go through this package.

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

const middleware = createAuthMiddleware({ provider: "better-auth" });
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
| **dev** | dev-only | Synthetic local sessions |

**Impersonation** is declared `false` for all providers until an adapter ships
end-to-end support (product returns `501 AUTH_CAPABILITY_UNSUPPORTED`).

## Configuration

| Provider | Required Environment Variables |
|----------|-------------------------------|
| Better Auth | Database connection (via `@nebutra/db`) |

`apps/sleptons`'s direct Clerk integration configures itself independently
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and is out of scope
for this package.
