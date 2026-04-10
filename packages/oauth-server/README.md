# @nebutra/oauth-server

> OIDC Identity Provider engine for the Nebutra platform, enabling "Sign in with Nebutra" for third-party applications.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/oauth-server@workspace:*
```

## Usage

```typescript
import { createNebutraOIDCProvider, SCOPE_DESCRIPTIONS } from "@nebutra/oauth-server";

const provider = createNebutraOIDCProvider({
  issuer: "https://id.nebutra.com",
  prisma, // PrismaClient instance
  redis,  // ioredis instance
});
```

## API

| Export | Description |
|--------|-------------|
| `createNebutraOIDCProvider(config)` | Create an OIDC provider instance |
| `createPrismaAdapter(prisma)` | Prisma-backed adapter for oidc-provider storage |
| `EPHEMERAL_MODELS` | List of models stored ephemerally (not persisted) |
| `SUPPORTED_SCOPES` | Array of supported OAuth scopes |
| `SCOPE_DESCRIPTIONS` | Human-readable scope descriptions |
| `NEBUTRA_CLAIMS` | Custom claims added to ID tokens |

### Types

| Type | Description |
|------|-------------|
| `NebutraOIDCConfig` | Configuration for the OIDC provider (issuer, prisma, redis) |

## Dependencies

- `oidc-provider` -- Core OIDC implementation
- `ioredis` -- Redis for session and token storage
- `@nebutra/db` -- Prisma for persistent data (clients, grants)
- `@nebutra/contracts` -- Shared type contracts
