# KCQ frontend contract

Read DESIGN.md before changing presentation. This app integrates the canonical
KCQ library through public exports and slots; upstream library changes belong
in a KCQ PR. Product auth comes from @nebutra/auth/browser. Never import a
provider SDK directly into the app or create another identity store.

Public pages (`src/public/`, `public.html`) are a separate entry: never import
auth, chart persistence, the workbench, Agent providers or React islands there
(the build enforces this). Add public paths in `src/public/routes.ts` and keep
`public/robots.txt`, `public/sitemap.xml`, `infra/fly/kcq.nginx.conf` and the
SEO closure test in step.

Preserve browser persistence initialization before dynamic chart imports.
Session and membership failures must fail closed. Workspace changes reload;
never switch singleton storage scopes in place. Use TDD for behavior changes.

Use shared canonical UI primitives for navigation, KCQ resolved theme tokens
for colours, and colocated stories for React UI. Keep Vue presentation thin:
state, subscriptions and cleanup belong in use-workbench.ts. New tokens must
have a documented semantic purpose; no arbitrary brand overrides or fake data.

Checks: pnpm --filter @nebutra/kcq typecheck, pnpm --filter @nebutra/kcq build,
pnpm exec biome check apps/kcq. Build the canonical packages and shared Nebutra
workspace dependencies first; do not rely on an existing local dist directory.
