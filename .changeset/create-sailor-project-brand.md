---
"create-sailor": patch
---

A new project carries its own brand from the first render. create-sailor title-cases the project name ("acme-rocket" → "Acme Rocket") and runs the template's own brand pipeline after install — `pnpm brand:init --yes --name "Acme Rocket"` then `pnpm brand:apply` — so the welcome page, app header, sign-in and site show the project's name as a text wordmark instead of Nebutra's logo and name, with Nebutra's colours kept as the neutral default. With `--no-install` (or a failed install) the name is left in `.sailor/brand.json` and the first `pnpm dev` applies it. The README keeps its license notice across `brand:apply`, the install passes `--no-frozen-lockfile` so a fresh project also installs under `CI=true`, and the next-steps guide points at editing `brand.config.ts` rather than creating it.
