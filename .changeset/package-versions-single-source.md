---
"nebutra": patch
"create-sailor": patch
---

Align scaffolded `@nebutra/*` dependency ranges with monorepo package.json versions.

- Make `packages/ops/preset/src/nebutra-package-versions.ts` the single source of truth
- Re-export it from the `nebutra` and `create-sailor` CLIs (remove the stale CLI-local map)
- Add `pnpm package-versions:sync` / `package-versions:check` and wire check into release
