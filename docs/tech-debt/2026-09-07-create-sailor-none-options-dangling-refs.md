# create-sailor: `none` options leave dangling workspace refs (found 2026-09-07)

Found while scaffolding a standalone marketing site (`douxing-site`) with the **local** build of
`create-sailor` 1.10.0 (template mirror 1.1.2). Not fixed here. Tracked as GitHub issues #536 (dangling `workspace:*` refs), #537 (provider pruning breaks imports), #538 (`.templateignore` strips `icp-footer.tsx`).

## Symptoms

1. Any `--<subsystem>=none` for a package-backed subsystem (`auth`, `payment`, `db`, and the
   built-in defaults `notifications` / `webhooks` / `feature-flags`) deletes the package directory
   but leaves `"@nebutra/<pkg>": "workspace:*"` in 14+ other manifests. `pnpm install` fails with
   `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. Because the defaults are `none`, a plain `create-sailor -y`
   scaffold is uninstallable.
2. `--payment=stripe` deletes `billing/src/{chinapay,lemonsqueezy,polar}` while `index.ts` and
   `checkout` still import them.
3. `--auth=clerk` deletes `auth/src/providers/{better-auth,nextauth,supabase}.ts` and narrows the
   provider type union while `server.ts` still references the removed providers.
4. `.templateignore` strips `apps/landing/src/components/icp-footer.tsx` while
   `[lang]/layout.tsx` imports it.

## Workaround used

Name a concrete provider for every subsystem (it only writes env placeholders), then restore the
deleted provider sources byte-for-byte from the monorepo. See
`~/Documents/实验性项目/douxing-site/docs/SCAFFOLD.md` for the exact command and fixes.

## Fix direction (closure-phase compatible: "make an existing feature install, run, or test")

- Prune must rewrite dependents' manifests (or replace the package with a stub that keeps the
  public surface) instead of deleting the directory.
- Provider removal must also rewrite the barrel/type union, or leave the sources and gate at runtime.
- `.templateignore` needs a dangling-import check in `scripts/template-check.ts`.
- Add a CI job that scaffolds with `-y` into a temp dir and runs `pnpm install` (P2 already asks
  for "template into a temp project").
