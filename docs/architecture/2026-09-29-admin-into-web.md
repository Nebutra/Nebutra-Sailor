# 2026-09-29 — Folding the platform control plane into @nebutra/web

- **Date**: 2026-09-29
- **Status**: In progress — Phase 1 slice landed (Fleet), rest of the surface not yet ported
- **Related**: [Admin of Admins model](../plans/2026-09-08-admin-of-admins-model.md),
  [Admin control-plane design](../plans/2026-07-28-nebutra-admin-control-plane-design.md),
  Fly org's 20-machine cap (`fly-machine-limit-2026-09-28`)

## Why

The Fly org is capped at 20 machines and the standalone `@nebutra/admin` app
(Fly Machine `nebutra-admin`, host `admin.nebutra.com`) is a whole Machine for
a low-traffic, staff-only surface. Folding it into `@nebutra/web` frees a
machine and gives every Sailor-scaffolded product the same pattern: platform
staff pages live at a path inside the authenticated app, not as a second
deployable.

`@nebutra/web` already ships this pattern for **tenant** admin —
`apps/web/src/app/(app)/admin` is gated by the tenant session's `admin:access`
permission (`hasPermission(role, "admin:access")` in
`apps/web/src/app/(app)/admin/layout.tsx`). That is the "existing admin
permission model" the productization goal refers to, and it needed no new
work.

## The part that is not a lift-and-shift

`@nebutra/admin`'s guard is a **different, tenant-independent** grant
(`PlatformStaff`), and its isolation was deliberately built around being a
**separate host**:

- `apps/admin/src/lib/auth.ts` sets no cookie `domain`, on purpose — the
  production tenant session cookie is `Domain=.nebutra.com` (shared across
  every subdomain by design, for SSO), and a host-only admin cookie is what
  keeps a signed-in tenant user's cookie from being read as an admin session.
- `apps/admin/src/lib/access-assertion.ts` verifies a Cloudflare Access JWT
  whose **audience is per-Access-application**, i.e. scoped to
  `admin.nebutra.com` today.

Moving the surface to `app.nebutra.com/admin/platform` puts it on the same
origin as every tenant session. Cloudflare Access can still gate it — Access
policies are scoped by **hostname *and* path**, so a policy on
`app.nebutra.com/admin/platform*` protects only that path — but the app-level
check must not lean on the tenant's better-auth session at all, because that
session cookie is present on every request to this origin.

`apps/admin/src/lib/staff.ts` already does not use the better-auth/OIDC
session for authorisation (`auth.ts`'s `betterAuth()` config is effectively
unused dead weight — the SSO login interaction was never finished, see the
comment in `staff.ts`). `getStaffContext()` resolves off the verified Access
assertion + a `PlatformStaff` DB row only. That is exactly the check safe to
reuse at the new path, and is what `apps/web/src/lib/admin-platform/staff.ts`
+ `access-assertion.ts` are (byte-identical ports of the two files that do
that work).

**Action needed from the owner, not done here**: point a Cloudflare Access
policy at `app.nebutra.com` (or the real production host) path
`/admin/platform*` with the same audience tag `ACCESS_AUD`, and drop it (or
narrow it) on `admin.nebutra.com`, per the cutover commands below.

## What moved (this pass)

| From (`apps/admin/src/lib`) | To (`apps/web/src/lib/admin-platform`) | Change |
|---|---|---|
| `access-assertion.ts` | `access-assertion.ts` | none — copied verbatim |
| `staff.ts` | `staff.ts` | none — copied verbatim |
| `fleet.ts` | `fleet.ts` | none — pure config, no `server-only` needed |

New route: `apps/web/src/app/(app)/admin/platform/{layout,page}.tsx` — layout
gates on `getStaffContext()` (not the tenant `admin:access` permission it sits
under in the URL tree) and redirects to `/admin` when absent; page renders the
Fleet table (read-only, config-only, matching the original's Phase 1 scope).

Guard test: `apps/web/src/app/(app)/admin/platform/__tests__/page.governance.test.ts`
(source-assertion style, matching the sibling `/admin` page's existing test —
this repo does not mock a `PlatformStaff` DB row for these, it checks the
guard calls the right function and nothing lower-privilege).

## What has NOT moved yet

`console-tabs.tsx`, `command-palette.tsx`, `supply-sync-button.tsx`,
`add-account-dialog.tsx`, `resource-table.tsx`, `signal-strip.tsx`,
`fleet-strip.tsx` (the live-probe strip, as opposed to the Fleet table itself)
and their backing libs (`supply.ts`, `supply-route.ts`, `contract-client.ts`,
`contract-action.ts`, `contract-resource.ts`, `console-data.ts`, `inbox.ts`,
`probe.ts`, `format.ts`, `login-flow.ts`) — i.e. everything except the
read-only Fleet table. `apps/admin` therefore **stays deployed** until this is
done; see "Cutover" below for why.

## Cutover (do not run any of this yet — full parity is not landed)

Ordered, once the rest of the surface above has moved and been verified in
`apps/web` in production:

```bash
# 1. Deploy web with the new /admin/platform route live
#    (already covered by the existing deploy-fly.yml `web` target)

# 2. Point a Cloudflare Access policy at the production web host,
#    path /admin/platform*, same ACCESS_AUD as admin.nebutra.com uses today.
#    (Cloudflare dashboard or `cloudflare` Terraform/API — owner action,
#    this pass does not touch Cloudflare Access policies.)

# 3. Verify /admin/platform in production as a PlatformStaff user AND as a
#    plain signed-in tenant user (must redirect to /admin, i.e. 403-equivalent).

# 4. Redirect the old hostname once web's surface has full parity:
#    add a DNS/host redirect admin.nebutra.com -> app.nebutra.com/admin/platform
#    (owner action — Cloudflare Page Rule or a redirect origin; not done here).

# 5. Only after 1-4 are verified in production, stop deploying the standalone app:
#    - remove "apps/admin/**" from the push-trigger paths in
#      .github/workflows/deploy-fly.yml (left untouched in this pass — apps/admin
#      is still the live surface for everything in "What has NOT moved yet")
#    - remove the {"app":"admin",...} entry from that workflow's matrix
#    - delete infra/fly/admin.toml

# 6. Only after DNS has been cut over and the workflow no longer deploys it,
#    decommission the Fly Machine (owner must run this — never run by an agent):
fly apps destroy nebutra-admin -y
```
