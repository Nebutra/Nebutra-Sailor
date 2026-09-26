# @nebutra/identity

Provider-agnostic identity adapter layer — maps auth-provider-specific session objects to a canonical `CanonicalIdentity` shape.

## Design Intent

This package defines an `IdentityAdapter` interface and an `IdentityAdapterRegistry` that maps a provider's session data to the `CanonicalIdentity` schema from `@nebutra/contracts`, so application code always receives `CanonicalIdentity` regardless of the upstream provider.

`@nebutra/auth` (Better Auth) is the kept, single production auth backend per
ADR 2026-09-24 (Sailor Convergence); the built-in `clerk` and `authjs`
adapters here are not that backend and are not currently wired to any caller
in this monorepo — they exist for a consumer that talks to Clerk or Auth.js
directly and needs to normalize its claims into the same canonical shape (for
example, a future integration point for `apps/sleptons`'s own direct Clerk
usage, which Nebutra keeps intentionally as its own product, stripped from
the template). Swapping which adapter a given consumer uses requires only
registering a new `IdentityAdapter`; none of this is a scaffold-time or
`create-sailor` choice.

## Usage

```typescript
import { createDefaultIdentityAdapterRegistry } from "@nebutra/identity";

const registry = createDefaultIdentityAdapterRegistry();
const identity = registry.map("clerk", clerkSessionClaims);
```

## Custom Adapter

```typescript
import type { IdentityAdapter } from "@nebutra/identity";

const myAdapter: IdentityAdapter<MyProviderSession> = {
  provider: "my-provider",
  mapToCanonical: (session) => ({ ... }),
};

registry.register(myAdapter);
```
