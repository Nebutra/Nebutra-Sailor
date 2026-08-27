# @nebutra/identity

Provider-agnostic identity adapter layer — maps auth-provider-specific session objects to a canonical `CanonicalIdentity` shape.

## Design Intent

Nebutra supports multiple auth providers (Clerk, Auth.js, custom). Rather than leaking provider-specific types into application code, this package defines an `IdentityAdapter` interface and an `IdentityAdapterRegistry` that maps any provider's session data to the `CanonicalIdentity` schema from `@nebutra/contracts`. Application code always receives `CanonicalIdentity`; swapping auth providers requires only registering a new adapter.

The Clerk adapter is the default production adapter. The Auth.js adapter provides a drop-in alternative. Both are tested against the same `CanonicalIdentity` schema.

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
