# Implement — batch 1

Order: contract → health → router manifest → admin client + pages → verify.

## Step 1 — contract
- [x] `packages/commerce/contracts/src/admin.ts` + export + subpath `./admin`
- [x] tests `src/__tests__/admin.test.ts`

## Step 2 — health completion
- [x] `@nebutra/health`: `nextHealthRoute()` helper (+ test)
- [x] `GET /api/health` in apps: router, admin, forge, web, idp, auth, pebble, design, kuanlan, sailor-docs (skip where a real one exists)
- [x] `apps/admin/src/lib/fleet.ts`: `health` URL per service

## Step 3 — router manifest (supply domain)
- [x] `apps/router/src/lib/admin/service-token.ts` (verify, ladder check)
- [x] `apps/router/src/lib/supply/{engines,accounts,shelf,channel}.ts` (moved from admin, plan→apply, audit)
- [x] routes: `.well-known/nebutra-admin.json`, `api/admin/v1/supply/{engines,accounts,shelf}`, `api/admin/v1/supply/actions/channel.sync`, `api/admin/v1/supply/signals/[id]`
- [x] tests

## Step 4 — admin
- [x] `lib/contract-client.ts`, `lib/inbox.ts`, `lib/probe.ts`
- [x] shell v2 (`console-shell.tsx`: top bar, tabs with counts, ⌘K placeholder)
- [x] pages: `/` Inbox, `/fleet` live, `/supply` from manifest; generic `ResourceTable`, `ActionButton` (plan dialog), `SignalStrip`
- [x] remove `apps/admin/src/lib/supply.ts` sync logic (keep proxy)
- [x] tests

## Step 5 — verify
- [x] typecheck + tests: contracts, health, router, admin
- [x] lint guards (brand literals, seam, raw inputs, template boundary)
- [x] secrets/deploy notes for owner: `SERVICE_SECRET` on router + admin; CLIPROXY_* on router

## Shipped 2026-09-08
- PR #549 merged (squash); deploy run 34225932711: router + admin green.
- Live: `router.nebutra.com/.well-known/nebutra-admin.json` serves nebutra.admin/v1 (supply: 3 resources, 1 action, 3 signals); `router.nebutra.com/api/health` healthy.
- Pending owner: `SERVICE_SECRET` on router+admin, `CLIPROXY_*` + `NEW_API_ROOT_PASSWORD` on router, `NEW_API_ACCESS_TOKEN` on router (from new-api-setup.py). Until then Supply/Inbox show `unauthenticated` / unknown — by design, never green.
- Known nits: manifest `version` reads 0.0.0 on Fly (npm_package_version unset at runtime → read package.json at build); Fleet probe of admin itself sees the Cloudflare Access 302 → renders unknown "HTTP 302" (special-case or probe over 6PN).
- 2026-09-08 13:54 UTC live probe: engine.down ok, channel.drift ok, account.expired ok; engines cliproxyapi 5 ms / new-api 8 ms; shelf = gpt-image-2 (key). PR #550 stops the VM .env import from clobbering router/admin secrets.
