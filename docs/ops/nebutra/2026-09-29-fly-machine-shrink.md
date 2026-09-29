# Fly machine shrink: free slots under the 20-machine org cap

Date: 2026-09-29 · Status: Accepted · Owner: platform · Related: [2026-06-04 production runtime closure](../../architecture/2026-06-04-production-runtime-closure.md), [2026-09-24 Sailor convergence](../../architecture/2026-09-24-sailor-convergence.md), [DOMAINS.md](../../DOMAINS.md)

Filed under `docs/ops/nebutra/` rather than `docs/architecture/` because it
names Nebutra's own hostnames and Fly app IDs throughout — the
template-boundary test (`tests/architecture/template-boundary.test.ts`) keeps
`docs/architecture/` free of instance identifiers so the ADR folder stays
portable to `create-sailor` scaffolds. It otherwise reads and cites like any
other dated ADR.

## Context

The Fly org is capped at 20 machines (self-imposed budget cap, not raised — see
`fly-machine-limit-2026-09-28` in project memory) and sat at 19. Every new Fly
app or process group needs a free slot; `nebutra-acme` was blocked on this.
Three candidates were evaluated for consolidation:

1. **`nebutra-docs`** (`apps/sailor-docs`, origin only, reached via the landing
   proxy's `/docs` rewrite — never a public hostname of its own)
2. **`nebutra-design`** (`apps/design`, bound to `design.nebutra.com`)
3. **`nebutra-dns-leak`** (`packages/ai/forge-dns-leak`, authoritative UDP/TCP
   53 for `leak.nebutra.com` plus a localhost control API)

## Decision

**sailor-docs and forge-dns-leak move off Fly; design stays.**

### sailor-docs → Cloudflare Workers only

`apps/sailor-docs` already shipped a complete, working OpenNext-on-Workers
path (`deploy-sailor-docs.yml`, `wrangler.jsonc`, same pattern as
`apps/typelens`), gated behind `vars.DEPLOY_TARGET_SAILOR_DOCS` with Fly
documented as the production owner and Cloudflare as the "alternate." The
Fly side added nothing the Worker didn't already do — it was leftover
infrastructure from before the Worker path was proven out. Verified the
OpenNext build locally (`pnpm turbo build --filter="@nebutra/sailor-docs^..."`
then `pnpm exec opennextjs-cloudflare build`, both unchanged) before deleting
`infra/fly/sailor-docs.toml` and removing `sailor-docs` from `deploy-fly.yml`'s
app matrix. The Cloudflare job in `deploy-sailor-docs.yml` now runs
unconditionally instead of behind the now-moot deploy-target variable.

**Update, same day:** the OpenNext-on-Workers path above shipped and passed
CI, but the deployed Worker intermittently 503'd in production — Cloudflare
error 1102, "Worker exceeded resource limits" — flaking between 200/404/503
on the identical URL from request to request. A first fix (wiring the
incremental cache that had silently been a no-op, commit 21efbab9e) helped
but did not close it: the ~53 MB handler still paid a real per-request cost
evaluating and cache-checking on every hit. `apps/sailor-docs` was converted
the same day to a pure `next build` (`output: "export"`) static site —
`wrangler.jsonc` now has no `main`, no Worker script, just Workers static
assets (`dist/docs/**`, produced by `scripts/postbuild-static-export.mjs`).
See that script and `next.config.ts` for the shape, and the current
`deploy-sailor-docs.yml` for the (5x-per-path) hard smoke gate this failure
mode is now guarded by. Chat and the GitHub-App feedback widget were dropped
(both needed a server: an AI SDK route and a `"use server"` action); search
moved to a client-side static Orama index (`src/app/api/search/route.ts`).

### forge-dns-leak → embedded in `nebutra-forge`

`apps/forge`'s own route handlers already defaulted `FORGE_DNS_LEAK_URL` to
`http://127.0.0.1:3953` — the code expected co-location with the DNS
authority, but the Fly deploy ran it as a separate app
(`nebutra-dns-leak`) reached over 6PN instead. `infra/runtime/docker/
Dockerfile.standalone` now backgrounds `node .../forge-dns-leak/src/cli.ts`
before exec'ing the Next server when `ENABLE_FORGE_DNS_LEAK=true` (set only
in `infra/fly/forge.toml`), with a build-arg-gated `setcap
cap_net_bind_service` so the non-root `node` user can still bind UDP/TCP
:53. `infra/fly/forge.toml` gained the `:53` `[[services]]` blocks (a
dedicated IPv4 is still required for the `ns1.leak.nebutra.com` glue — Fly
shared IPv4s cannot answer arbitrary UDP:53). `infra/fly/dns-leak.toml`,
`infra/fly/Dockerfile.dns-leak` and `deploy-dns-leak-fly.yml` are deleted;
`deploy-fly.yml`'s standalone `deploy-dns-leak` job and `want_dns_leak`
wiring go with them.

**Not deployed or tested against real Fly infrastructure** — no Fly
credentials were used from this environment. The owner should validate the
embedded process (control API answers on `127.0.0.1:3953` inside the
Machine, `:53` answers externally once the glue is cut over) before
destroying `nebutra-dns-leak`.

### design stays on Fly

`apps/design` was built out identically to the other two (wrangler.jsonc,
`open-next.config.ts`, a `deploy-design-cloudflare.yml` workflow) and run
locally with `wrangler dev` against the real OpenNext build output. Every
route touching `apps/design/src/lib/tokens/model.ts` or
`src/lib/components/ui-source.ts` 500s: both modules read the monorepo
source tree — `packages/design/design-tokens/tokens/*.json` and
`packages/design/ui/src` — over `node:fs` at request time, by deliberate
design (their own comments reject any hardcoded/stale fallback list; that
policy is the entire point of the app). Even with `nodejs_compat`, Workers
has no such filesystem, and prerendering isn't enough on its own: OpenNext
still round-trips these routes through the Worker's incremental-cache path
on a cold isolate, re-executing the same module-level `fs` calls.

This is a real "needs a server" case, not a build-target gap. Fixing it
means changing what the app derives at request time vs. bakes at build time
— e.g. extending the app's own `switchability.json` prebuild-codegen pattern
(`scripts/lint-inert-dimensions.mjs --write`, already used for one of its
three dynamic-derivation modules) to the other two. That is an application
change to a labs/verifier tool (`nebutra.status: wip`,
`productionReady: false`), not an infra migration, and is out of scope here.
Every design-specific Cloudflare file was reverted; `infra/fly/design.toml`,
`deploy-fly.yml` app=`design` and its `issue-fly-certs.yml` entry are
unchanged.

## Consequences

- Two Fly machine slots freed (`nebutra-docs`, `nebutra-dns-leak`), not
  three. `nebutra-design` stays until someone does the prebuild-codegen
  refactor above (or accepts a different consolidation for it — e.g.
  co-locating it inside another Fly Machine the way forge-dns-leak was
  merged into forge, which was not attempted here since it was outside this
  task's scope).
- `leak.nebutra.com`'s NS glue now points at a dedicated IPv4 on
  `nebutra-forge` rather than a standalone app — see the owner cutover
  commands in the handoff notes for this branch.
- `DEPLOY_TARGET_SAILOR_DOCS` is no longer read by any workflow; it can be
  unset.
