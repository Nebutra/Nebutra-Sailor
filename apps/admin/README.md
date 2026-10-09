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
- **No second origin.** The control plane ships as the Fly Machine
  `nebutra-admin` behind Cloudflare Access; the Vercel surface was retired on
  2026-09-22. A public origin outside Access is what this avoids.

## Fleet inventory

`src/lib/fleet.ts` is a hand-maintained mirror of the PM2 processes in
`infra/iac/ecs/ecosystem.config.cjs` (that file is rendered on the VM with
envsubst, so it cannot be imported at runtime). `src/lib/__tests__/fleet.test.ts`
fails if the two drift apart — process names and ports must match exactly.

## Staff

`/staff` lists every `PlatformStaff` grant (revoked ones stay, as tombstones) and,
for a `platform_owner`, grants and revokes. The page holds no rules: it calls the
gateway's `/api/v1/platform/staff` endpoints signed as the Access-verified staff
member, the same endpoints `nebutra admin staff` and the `staff_*` MCP tools use.
The gateway enforces owner-only, no self-grant, no removing the last owner, and
writes the audit entry. Set `ADMIN_GATEWAY_URL` to point at another gateway
(default: the brand `api` origin); `SERVICE_SECRET` signs the call.

This app is instance-only (`.templateignore`). The endpoint, repository, CLI and
MCP tools ship in the template, so a customer's SaaS has the same platform-owner
control without this console.
