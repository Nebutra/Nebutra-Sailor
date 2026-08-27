# @nebutra/admin

Internal control plane for the Nebutra ecosystem — `admin.nebutra.com`.

Staff-only. Not a tenant surface, not a customer portal. Design and scope:
[docs/plans/2026-07-28-nebutra-admin-control-plane-design.md](../../docs/plans/2026-07-28-nebutra-admin-control-plane-design.md).

```bash
pnpm --filter @nebutra/admin dev        # http://localhost:3108
pnpm --filter @nebutra/admin typecheck
pnpm --filter @nebutra/admin test
```

## Status — Phase 1 (scaffold)

Shipped: the app, its host in the domain SSOT, a PM2 slot on the ECS origin, the
`PlatformStaff` model, `platformAbilityFor()` in `@nebutra/permissions`, and a
read-only **Fleet** page.

**Not shipped, on purpose:**

- **No authentication.** OIDC against `sso.nebutra.com` and the staff-role gate
  are Phase 2. Nothing here is safe to expose yet.
- **No deploy wiring.** `admin` is absent from `.github/workflows/deploy-ecs.yml`
  and has no nginx vhost, so it cannot reach the public host by accident. Wiring
  lands with the Cloudflare Access policy, not before.
- **No live health.** The Fleet page renders *configuration* state — what the
  ecosystem is supposed to be. Probing is Phase 2; a health column that shows
  green without making a request is worse than no column.
- **No `vercel.json`.** A Vercel project would give this app a second, public
  origin that Cloudflare Access does not cover. The control plane ships to the
  ECS origin only (`DEPLOY_TARGET_ADMIN=standalone`).

## Fleet inventory

`src/lib/fleet.ts` is a hand-maintained mirror of the PM2 processes in
`infra/iac/ecs/ecosystem.config.cjs` (that file is rendered on the VM with
envsubst, so it cannot be imported at runtime). `src/lib/__tests__/fleet.test.ts`
fails if the two drift apart — process names and ports must match exactly.
