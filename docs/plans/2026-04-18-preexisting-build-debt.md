# Pre-existing Build Debt — Observed 2026-04-18

> Logged during Phase 0 landing, NOT caused by Phase 0. Tracking here for
> next session's "build health" pass.

## Vercel landing build failure (commit `5fb7f03`)

Three classes of errors in `pnpm build --filter=@nebutra/landing`:

### 1. `"use client"` directive placement bugs (1 file)

**`apps/landing/src/components/landing/navbar/DesktopNav.tsx`**
```tsx
import React from "react";

("use client");  // ❌ parses as statement, not directive
```

Fix: move `"use client";` to line 1 (before imports).

Vercel also reported similar error patterns; search for the same shape across
`src/components/landing/` before declaring complete.

### 2. `@nebutra/vault` + `@nebutra/metering` + `@nebutra/license` `.js` import resolution

Packages use TS source-style imports like:
```ts
export { ... } from "./crypto.js";
export { ... } from "./factory.js";
export { generateSlug } from "./generate-slug.js";
```

These work in the packages' own tsc/tsup builds but fail when Next.js bundles
them directly from source (no build step was run first in the landing
build graph).

Fix options (pick one per package):
- **A** — build the package as proper tsup/tsc artifact and have consumers
  read `dist/` (add `main` + `types` pointing to `./dist/index.js`)
- **B** — change source to bare paths (`from "./crypto"`) + set `moduleResolution: "bundler"` in consumers
- **C** — add tsup `bundle: true` so external refs don't leak

### 3. Transitive effect on landing build

Any route importing `@nebutra/license` → `@nebutra/vault` → `./crypto.js`
fails. Currently `apps/landing/src/app/api/license/route.ts`.

## Sync-template lockfile mismatch

GH Action `sync-template.yml` previously used `--frozen-lockfile`. pnpm
10.32.1 in CI reports:

```
react (lockfile: catalog:, manifest: ^19.2.4)
react-dom (lockfile: catalog:, manifest: ^19.2.4)
```

Local `pnpm install --lockfile-only` shows no drift. Root cause not fully
diagnosed — likely pnpm's catalog resolver disagreeing between local Node 22
and CI Node 20.

**Interim fix applied**: workflow now uses `--no-frozen-lockfile`. This is
safe for mirror sync (not production build).

Root cause investigation TODO:
- Try bumping CI to Node 22 (matches local)
- Check if a named catalog (`catalogs:` plural) fixes the resolver
- File upstream pnpm issue if reproducible

## Priority

None of these block Phase 0 instrumentation shipping. All are pre-Phase-0
drift that surfaced when build was exercised.

Next session should:
1. Fix 1 `"use client"` placement in `DesktopNav.tsx` (2 min)
2. Decide package build strategy for vault/metering/license (~30 min)
3. Revisit lockfile frozen-lockfile once Node version aligned (~15 min)
