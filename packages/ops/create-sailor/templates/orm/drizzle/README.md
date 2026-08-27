# @nebutra/db-drizzle

Opt-in Drizzle ORM access layer. Lives alongside `@nebutra/db` (Prisma).

## When to use which

| Scenario | Use |
|---|---|
| New code, want SQL-shaped query builder | `@nebutra/db-drizzle` |
| Existing auth / billing / audit / oauth flows | `@nebutra/db` (Prisma — they're built on it) |
| Migrations + schema source of truth | `@nebutra/db` (Prisma owns schema) |

Both connect to the same `DATABASE_URL`. Treat Drizzle's `src/schema/*.ts` as
**read-mostly mirrors** of the Prisma schema until the dual-ORM era ends.

## Setup

```bash
pnpm --filter @nebutra/db-drizzle db:generate   # generate migrations from schema
pnpm --filter @nebutra/db-drizzle db:push       # push schema directly (dev only)
pnpm --filter @nebutra/db-drizzle db:studio     # open Drizzle Studio
```

## Usage

```ts
import { db, schema } from "@nebutra/db-drizzle";
import { eq } from "drizzle-orm";

// Read
const user = await db.query.users.findFirst({
  where: eq(schema.users.email, "alice@example.com"),
});

// Insert
await db.insert(schema.users).values({
  id: crypto.randomUUID(),
  name: "Alice",
  email: "alice@example.com",
});
```

## Schema coverage

Currently mirrored (read-safe with the Prisma side):

- `auth.user` / `auth.session` / `auth.account` / `auth.verification`
- `auth.organization` / `auth.member` / `auth.invitation`
- `public.subscriptions` / `public.usage_ledger`

Add more in `src/schema/*.ts` as you migrate features off Prisma. Keep
column names + types in lock-step with `packages/platform/db/prisma/schema.prisma`.

## Migration path (dual-ORM → Drizzle primary)

Not on the roadmap until enough new code lands on Drizzle to make the swap
worth the risk. Until then, write against whichever client matches your use
case and don't double-write the same table from both.
