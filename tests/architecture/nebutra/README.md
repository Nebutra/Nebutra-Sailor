# tests/architecture/nebutra — invariants of the Nebutra instance

Every test here asserts a fact about **Nebutra's deployment** of Sailor, not
about Sailor: which Fly app serves `kuanlan.nebutra.com`, which nginx vhost the
ECS host carries, which DNS record `open.nebutra.com` points at, whether the
Nebutra Vercel env patches dogfood the brand config.

They run in this repository's `pnpm test:arch` (the `tests/architecture/**`
glob in `vitest.arch.config.ts` includes this directory) and are stripped from
the public Sailor template by the `tests/architecture/nebutra/` rule in
`.templateignore` — a scaffolded project has none of the files they read.

A test belongs here when it names a Nebutra host, Fly app, ECS script, DNS
record or account. A test belongs one level up when it would hold for any
deployment of the template.

Relative imports from this directory reach the repo root with `../../../`.
