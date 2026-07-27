# ECS/PM2 release lessons (2026-07)

Operational lessons from production incidents on the Cloud VM fallback path
(`.github/workflows/deploy-ecs.yml` + PM2 + nginx). Keep this short and
actionable; code comments in the workflow are the enforcement layer.

## 1. Preflight must prune only apps being deployed

### Incident

`KEEP_RELEASES` default is `1`. Preflight computed `upload_keep = keep - 1 = 0`
and looped **every** app under `/var/www/nebutra/{landing,web,...,forge}/releases`.
With `upload_keep=0`, `tail -n +1` deleted **all** release directories for every
app — including apps **not** in the current deploy.

A `sailor-docs`-only deploy therefore wiped `forge` / `router` / `web` / `idp` /
`auth` release trees. PM2 processes stayed `online` but `cwd` pointed at
`(deleted)` inodes. Forge started returning **500** (`MODULE_NOT_FOUND` for
`.next/server/middleware-manifest.json`, missing `.next`). Sibling apps could
still answer HTTP until restart (open-file zombies).

### Fix

Preflight builds `PRUNE_APPS` from `needs.detect-changes.outputs.*` and only
prunes those apps. Sibling release trees are never touched.

### Operator checklist when an ECS app 500s after “unrelated” deploy

1. `pm2 list` — is the process online but flaky?
2. `ls /var/www/nebutra/<app>/releases` — empty while `current` is a dangling symlink?
3. `readlink -f /proc/$(pm2 pid <name>)/cwd` — shows `(deleted)`?
4. Redeploy **that** app:  
   `gh workflow run deploy-ecs.yml -f apps=<app> -f reason="restore wiped release"`
5. Confirm preflight log line: `Preflight will only prune releases for: <app>`  
   (must **not** list healthy siblings).

## 2. Next standalone: webpack for docs on VM

`sailor-docs` uses `build:vm` → `next build --webpack` for ECS bundles. Turbopack
standalone can externalize shiki as `shiki-<hash>` packages that are not present
at runtime → every page Internal Server Error. Do not “simplify” back to default
Turbopack production build for the VM artifact without re-validating standalone
runtime on the target host.

## 3. Explicit `apps=` on workflow_dispatch

Prefer:

```bash
gh workflow run deploy-ecs.yml -f apps=sailor-docs -f reason="…"
```

Empty `apps` falls through path filters and can build many packages. Always name
the intended app set for emergency restores and logo/docs-only ships.

## Related

- Workflow: `.github/workflows/deploy-ecs.yml` (preflight + matrix `condition`)
- Remote helper: `infra/ops/scripts/ecs-deploy-remote.sh`
- Env contract: `docs/ops/ecs-mvp-env.md`
- Brand nav logo decoupling (separate incident class): `packages/design/brand/README.md`
