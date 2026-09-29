# Fly machine shrink: free slots under the 20-machine org cap

Date: 2026-09-29 · Status: Accepted · Owner: platform · Related: [2026-06-04 production runtime closure](./2026-06-04-production-runtime-closure.md), [2026-09-24 Sailor convergence](./2026-09-24-sailor-convergence.md), [DOMAINS.md](../DOMAINS.md)

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
