# @nebutra/auth

> Provider-agnostic authentication abstraction layer supporting Clerk and Better Auth.

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

`User`, `Session`, `Organization`, `AuthConfig`, `AuthProviderId`, `SignInMethod`, `CreateUserInput`, `CreateOrgInput`

## Configuration

Depends on the chosen provider:

| Provider | Required Environment Variables |
|----------|-------------------------------|
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| Better Auth | Database connection (via `@nebutra/db`) |
