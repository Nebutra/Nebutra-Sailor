# AGENTS.md — apps/tsekaluk-dev

Scoped execution contract for the Tsekaluk personal site app.

## Scope

This app owns the personal/editorial Next.js surface under `apps/tsekaluk-dev`.

It owns:

- app routing, metadata, and page behavior under `src/app`
- editorial content under `content/`
- local docs/content collection config in `source.config.ts`
- app-local Prisma schema under `prisma/schema.prisma`
- app-local env bootstrapping and helpers under `src/lib`

It does not own shared package behavior from `@nebutra/*` workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `src/app/` for routing, metadata, feeds, and page behavior
- `content/` and `source.config.ts` for editorial content and collection schema
- `prisma/schema.prisma` for the app-local database schema
- `src/lib/env` for required environment validation at app startup
- `next.config.ts` and `prisma.config.ts` for app runtime and Prisma config

Do not treat `.next/`, generated Prisma client files, or descriptive docs as
implementation truth.

## Contract Boundaries

- Content changes belong in `content/`; route and rendering behavior belong in
  `src/app/`.
- Collection schema changes must stay aligned with `source.config.ts`.
- Database model changes belong in `prisma/schema.prisma`; generated client code
  under `prisma/generated/` is derived.
- Keep env validation centralized in `src/lib/env` instead of scattering
  required-variable checks throughout route files.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`
- `prisma/generated/`

If generated Prisma output or rendered site output is wrong, update the checked-in
source and regenerate instead of editing derived artifacts.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/tsekaluk-dev typecheck`
- `pnpm --filter @nebutra/tsekaluk-dev build`
