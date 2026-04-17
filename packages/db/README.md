# @nebutra/db

Prisma 7 database client and schema for Supabase PostgreSQL.

> ⚠️ **Important for AI Assistants**: This package uses **Prisma 7.x** with the new `prisma-client` generator. Do NOT use outdated Prisma patterns. Read the [Prisma 7 Migration Guide](#prisma-7-critical-changes) below.

## Prisma 7 Critical Changes

### What Changed in Prisma 7 (Released 2025)

1. **New Generator**: `prisma-client-js` → `prisma-client`
2. **Explicit Output Path**: Client no longer generated to `node_modules`
3. **Adapter Required**: Must use `@prisma/adapter-pg` or `accelerateUrl`
4. **Config File**: New `prisma.config.ts` for centralized configuration
5. **ESM-First**: Better Edge/Workers support, ~90% smaller bundle

### ❌ DO NOT Use (Outdated Patterns)

```typescript
// ❌ WRONG: Old import path
import { PrismaClient } from "@prisma/client";

// ❌ WRONG: No adapter in constructor
const prisma = new PrismaClient({
  log: ["query"],
});

// ❌ WRONG: Old generator in schema
generator client {
  provider = "prisma-client-js"  // DEPRECATED
}
```

### ✅ Correct Patterns (Prisma 7)

```typescript
// ✅ CORRECT: Import from generated path
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// ✅ CORRECT: Use adapter
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});
```

```prisma
// ✅ CORRECT: New generator with output path
generator client {
  provider = "prisma-client"  // NEW generator name
  output   = "../src/generated/prisma"  // REQUIRED explicit path
}
```

## Project Structure

```
packages/db/
├── prisma/
│   ├── schema.prisma       # Prisma schema
│   ├── migrations/         # Migration history
│   └── seed.ts             # Seed data
├── prisma.config.ts        # Prisma 7 config file
└── src/
    ├── index.ts            # Public exports
    ├── client.ts           # PrismaClient singleton with adapter
    └── generated/prisma/   # Generated client (NOT in node_modules)
        ├── client.ts
        ├── enums.ts
        ├── models/
        └── internal/
```

## Installation

```bash
pnpm add @nebutra/db
```

## Setup

### 1. Configure environment

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### 2. Generate client

```bash
pnpm db:generate
```

### 3. Run migrations

```bash
pnpm db:migrate
```

## Usage

```typescript
import { prisma } from "@nebutra/db";

// Query
const users = await prisma.user.findMany({
  where: { organizationId: "org_123" },
});

// Create
const user = await prisma.user.create({
  data: {
    email: "user@example.com",
    clerkId: "user_123",
  },
});
```

## Commands

| Command            | Description            |
| ------------------ | ---------------------- |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate`  | Run migrations (dev)   |
| `pnpm db:push`     | Push schema changes    |
| `pnpm db:studio`   | Open Prisma Studio     |
| `pnpm db:seed`     | Seed database          |

## Dependencies Required for Prisma 7

```json
{
  "dependencies": {
    "@prisma/adapter-pg": "^7.0.1",
    "@prisma/client": "^7.0.0",
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "@types/pg": "^8.15.6",
    "prisma": "^7.0.0"
  }
}
```

## prisma.config.ts (Required for Prisma 7)

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
});
```

## Client Initialization (Prisma 7 Pattern)

```typescript
// src/client.ts
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

## Type Exports (Prisma 7 Pattern)

```typescript
// src/index.ts
export { prisma, type PrismaClient } from "./client.js";

// Import types from generated path, NOT @prisma/client
export type {
  Organization,
  User,
  // ... other types
} from "./generated/prisma/client.js";
```

## Multi-tenancy

All models include `organizationId` for Row-Level Security:

```prisma
model Content {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  
  organization Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@map("contents")
}
```

## Prisma 7 Benefits

- **~90% smaller bundle**: Rust-free client
- **Up to 3x faster queries**: Optimized query engine
- **ESM-first**: Native ES modules support
- **Edge/Workers ready**: Better serverless compatibility
- **Multi-file generation**: Easier debugging and tree-shaking
- **Improved TypeScript**: ~70% faster type checking

## Troubleshooting

### Error: `accelerateUrl` is required

Prisma 7 requires either `adapter` or `accelerateUrl`. Use the adapter pattern:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg(pool);
new PrismaClient({ adapter });
```

### Error: Cannot find module `@prisma/client`

In Prisma 7, types are imported from the generated path:

```typescript
// ❌ Wrong
import { User } from "@prisma/client";

// ✅ Correct
import { User } from "./generated/prisma/client.js";
```

### Generated files not found

Run `pnpm db:generate` after any schema changes.

## Seeding Model Config

After running migrations, seed the AI model pricing table:

```bash
pnpm --filter @nebutra/db seed:models            # online, ~400+ models from models.dev
pnpm --filter @nebutra/db seed:models --offline  # embedded 5-model fallback
```

Pricing data comes from [models.dev](https://models.dev/api.json) via the
[`tokenlens`](https://github.com/xn1cklas/tokenlens) TypeScript wrapper —
community-maintained, updated whenever providers change prices. No hand-curated
pricing tables to maintain.

The script is idempotent (safe to re-run) and maps `models.dev` provider IDs to
our `AIProvider` enum (`OPENAI`, `ANTHROPIC`, `GOOGLE`, `SILICONFLOW`, `CUSTOM`).
Models without complete `cost.input` / `cost.output` are skipped. Customers
wishing to override community pricing can manually edit rows after seeding.

## Related

- [Prisma 7 Release Notes](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Database RLS policies](../../infra/supabase/)
- [Supabase dashboard](https://supabase.com/dashboard)
