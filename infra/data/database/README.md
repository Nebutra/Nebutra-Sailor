# Database Infrastructure

## Architecture

```
packages/platform/db/              → Prisma schema (single source of truth)
infra/data/database/           → Database-level configs (RLS, extensions)
infra/iac/terraform/          → Cloud infrastructure provisioning
```

## Schema Management

**All models defined in `packages/platform/db/prisma/schema.prisma`**

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema (dev only)
pnpm db:studio      # Open Prisma Studio
```

## Row Level Security (RLS)

RLS policies are in `policies/rls.sql`. Apply after migrations:

```bash
psql $DATABASE_URL -f infra/data/database/policies/rls.sql
```

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector for embeddings
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."      # Pooled connection
DIRECT_URL="postgresql://..."        # Direct (for migrations)
```

## Provider Compatibility

This setup works with:
- Supabase
- Neon
- PlanetScale (with adapter)
- AWS RDS
- Google Cloud SQL
- Self-hosted Postgres
