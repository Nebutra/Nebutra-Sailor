# Nebutra Package Status

This page tracks the production-readiness of each `@nebutra/*` package
shipped by `create-sailor`'s single converged scaffold (ADR 2026-09-24
Sailor convergence — one stack, no provider flags). Every workspace package
now declares `nebutra.status` and `nebutra.graph` in its `package.json`. The
tables below are the subset of packages worth calling out for maturity —
not the full workspace, and not a CLI flag surface (there isn't one).

## Status values

| Status          | Meaning                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `stable`        | Production-ready. Full implementation. Default assumption for packages not listed below.         |
| `foundation`    | Core contract is production-usable, while optional provider adapters or UI surfaces still need credentials/wiring. |
| `wip`           | Actively under development. Do not use in production until the notice is removed from its README.|
| `deprecated`    | Scheduled for removal. Do not use.                                                               |

Do not mark a new package `stable` without a real integration, empty `gaps`,
and `productionReady: true`. Undeclared packages are classified as
`foundation` (core graph) or `wip` (runtime / labs).

## Graphs

| Graph     | Meaning | External promise | Included in `pnpm build:release` / `pnpm test:release` |
| --------- | ------- | ---------------- | -------------------------------------------------------- |
| `core`    | Product, platform, and create-sailor infrastructure | Install, types, tests, and build must pass; compatibility is protected | Yes |
| `runtime` | Agent / MCP / sandbox execution kernel | Real integration tests pass; runtime and failure behavior are documented | Yes |
| `labs`    | Experimental apps and plays (forge, sleptons, cinema, …) | Usable; API may change; README must say experimental | No |

Labs stay in `pnpm-workspace.yaml` so workspace imports keep resolving.
`pnpm build` still builds the full workspace. The release graph is
`core` + `runtime`:

```bash
pnpm maturity:verify
node scripts/print-graph-filters.mjs release
pnpm build:release
pnpm test:release
```

`node scripts/print-release-filters.mjs` remains the **npm publish**
surface (every non-private package), which is a different cut from the
build/test graph.

## How to read the CLI

`create-sailor` asks for nothing but the target directory (ADR 2026-09-24
Sailor convergence) — there is no provider selection at scaffold time, so
there is nothing to warn about during scaffolding. Every scaffold writes the
same `nebutra.config.json`, naming **capabilities**, never providers:

```json
{ "stack": "sailor-2026-09", "capabilities": ["auth", "billing", "email", "storage", "queue", "cache", "notifications", "webhooks", "ai", "mcp"] }
```

Which vendor actually runs for a capability is decided at runtime by which
env keys are present — see `packages/ops/cli/src/utils/capabilities.ts`, the
single source of truth shared by `nebutra status` and `nebutra sync`. Run
`nebutra status` in a scaffolded project to see each declared capability's
state:

- `live` — a real provider's keys are set.
- `local-fallback` — no keys set, but the capability degrades to a working
  local implementation (console email, in-memory queue/cache, local storage,
  dev auth).
- `missing-key` — no keys set and there is no local fallback; the capability
  does not run until you set one.

Capabilities not in the default list above (`sms`, `monitoring`, `analytics`,
`captcha`) are opt-in: add them to `nebutra.config.json`'s `capabilities`
array, then `nebutra sync` will add the right keys to `.env.example`.

Most packages below are **not** part of this capability model at all — they
are consumed directly in app/gateway code, with no scaffold-time or
`nebutra status` surfacing. Their maturity is still tracked by
`nebutra.status` in their own `package.json`, which is what the tables below
reflect.

## Foundation packages (18)

These packages ship a real factory, type definitions, and provider
registration. Their core path is usable, but the happy path usually
needs: (a) external credentials, (b) additional adapter code you
contribute, or (c) a managed SaaS that the provider wraps.

| Package                  | Enabled via                                    | Ready out-of-the-box?                 | Main gaps                                                           |
| ------------------------ | ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `@nebutra/metering`      | (consumed directly; billing ingestion)          | No — needs ClickHouse or local dev    | Gateway/billing ingestion and enforcement wiring pending             |
| `@nebutra/billing`       | `nebutra.config.json` capability `billing` (default) | No — provider credentials required    | Persistence and UI are host-owned; each adapter needs its own keys (Creem, or WeChat Pay/Alipay for mainland China) |
| `@nebutra/legal`         | (consumed directly)    | Partial — package seams exist         | Consent persistence API, DB-backed store, and publishing workflow pending |
| `@nebutra/license`       | (consumed directly)    | Partial — contract usable             | Host injects LicenseDb; delivery needs an email provider; no UI      |
| `@nebutra/permissions`   | (consumed directly — not a scaffold capability) | Partial — CASL works in-process | CASL is the only supported provider (OpenFGA adapter removed, ADR 2026-09-24) |
| `@nebutra/queue`         | `nebutra.config.json` capability `queue` (default) | No — QStash credentials, else memory fallback | QStash DLQ retrieval TODO; worker auto-scaling TODO (BullMQ removed, ADR 2026-09-24) |
| `@nebutra/search`        | (consumed directly — not a scaffold capability) | Yes — pgvector runs against `DATABASE_URL` | pgvector is the sole provider (Meilisearch/Typesense/Algolia removed, ADR 2026-09-24); see inline TODOs |
| `@nebutra/tenant`        | (enabled by middleware)| Partial — AsyncLocalStorage works     | Subdomain/JWT resolvers scaffolded; schema migration flow pending   |
| `@nebutra/uploads`       | (consumed directly)    | No — S3/R2 creds required             | Tus flow not end-to-end; validation stubs                           |
| `@nebutra/vault`         | (consumed directly)    | Partial — local HKDF works for dev    | KMS rotation flow TODO; tenant isolation scaffolded                 |
| `@nebutra/feature-flags` | (consumed directly — not a scaffold capability; removed from `create-sailor`, ADR 2026-09-24) | Partial — Redis/env runtime works | Managed Vercel/GrowthBook/ConfigCat SDK adapters and rollout UI pending |
| `@nebutra/knowledge-rag` | (consumed directly)    | Partial — zero-config RAG path works  | pgvector store interface-only; provider-grade reranker adapter pending |
| `@nebutra/design-sync`   | (auto-detect, dev tool — not a scaffold capability) | git-only works zero-config      | `design-md` and `memory` are the other supported providers; Figma and Penpot providers removed (ADR 2026-09-24) |
| `@nebutra/china-compliance` | (env-driven, `NEBUTRA_LOCALE`)               | ICP footer + region detection ready   | WeChat OAuth callback route TODO; Aliyun SMS adapter scaffold       |
| `@nebutra/access-gate`  | (consumed directly — not a scaffold capability) | Core + Prisma adapter + admin issue/list/revoke/email/Dub links + Better Auth signup gate/redeem work | OAuth callback gating and DB-backed integration tests are app-owned |
| `@nebutra/waitlist`      | (consumed directly — not a scaffold capability) | In-memory store works                 | Prisma adapter TODO; email confirmation + analytics endpoint pending |
| `@nebutra/admin-tooling` | (consumed directly)    | Contract surface stable               | No concrete Retool/Forest/Appsmith adapter examples wired yet        |
| `@nebutra/onboarding`    | (consumed directly)    | Client-side localStorage flow works   | Server-side completion sync pending; analytics hook for step transitions |

## WIP packages (40)

These packages have code skeletons, README intent, and types, but no
production integrations. Their READMEs carry a `Status: WIP — Not yet
integrated into any production app` banner. Expect breaking changes
and missing functionality.

| Package                  | Enabled via              | Why WIP                                                          |
| ------------------------ | ------------------------- | ---------------------------------------------------------------- |
| `@nebutra/fonts`         | (consumed directly)     | Self-hosted font registry present; first intentional public publish and app-wide adoption pending |
| `@nebutra/audit`         | (consumed directly)     | Event schema not finalized; retention/export workflow pending    |
| `@nebutra/captcha`       | `nebutra.config.json` capability `captcha` (opt-in) | hCaptcha & Aliyun adapters scaffolded only                       |
| `@nebutra/event-bus`     | (consumed by saga)      | Cross-service pub/sub guarantees not verified                    |
| `@nebutra/code-index`    | (consumed directly)     | Provider-agnostic contracts and indexing core only; concrete embedder/vector-store adapters are injected |
| `@nebutra/mcp`           | `nebutra.config.json` capability `mcp` (default) | Capability is "always live" (built-in, no keys needed); the package's own context-server binary is still a placeholder stub |
| `@nebutra/saga`          | (consumed directly)     | No durable journal; compensation logic scaffolded only           |
| `@nebutra/agent-runtime` | (consumed directly)     | Track-B kernel transport + durable-turn queue binding interface-only; adapters live under subpath exports |
| `@nebutra/3d-pipeline` | (consumed directly)     | Generation capability only; model-backed mesh generation, retopology, and export sidecars are adapter-gated |
| `@nebutra/audio-pipeline` | (consumed directly)  | Generation capability only; music model adapters and production LUFS measurement are sidecar-gated |
| `@nebutra/browser-control` | (consumed directly)   | Execution capability only; mutating browser actions require a configured browser sidecar and injected explorer |
| `@nebutra/code-execution` | (consumed directly)    | Execution capability only; notebook kernels, remote providers, and approval UI handoff are adapter-gated |
| `@nebutra/document-pipeline` | (consumed directly) | Execution capability only; complex parsing/OCR sidecars and durable async ingestion are not production-backed |
| `@nebutra/generation-context` | (consumed directly) | Shared BrandContext contract; app editor, reference validation, and media license policy are not production-backed |
| `@nebutra/image-pipeline` | (consumed directly)  | Generation capability only; model-backed workflows and remote image providers are adapter-gated |
| `@nebutra/play-loader`   | (consumed directly)     | Declarative play loader; runner delegates, remote install, and migration APIs are interface-only |
| `@nebutra/startup-os`    | (consumed directly)     | Startup OS orchestration contracts; hosted execution, persistence wiring, auth/billing/tenant lifecycle, and UI delivery are app-owned |
| `@nebutra/workflow-runtime` | (consumed directly) | Tenant-authored workflow JS runtime; gateway runner, SSE streaming, and agent-callable tool wiring are deferred |
| `@nebutra/video-pipeline` | (consumed directly)  | Generation capability only; model-backed clips, ffmpeg composition, and remote quotas are adapter-gated |
| `@nebutra/voice-realtime` | (consumed directly) | Generation capability only; realtime transport, enrollment storage, and provider sidecars are adapter-gated |
| `@nebutra/brand-genesis` | (consumed directly)  | Play package distilling idea → BrandContext; asset generation delegated to media capabilities (still adapter-gated) |
| `@nebutra/cofounder-match` | (consumed directly) | Layer-7 ecosystem product; matching heuristics + persistence layer pending |
| `@nebutra/founder-cemetery` | (consumed directly) | Layer-7 ecosystem product; postmortem ingestion + curation flow pending |
| `@nebutra/idea-plaza` | (consumed directly)   | Layer-7 ecosystem product; idea marketplace primitives pending |
| `@nebutra/landing-builder` | (consumed directly) | Layer-6 play product; landing generator + capability map pending |
| `@nebutra/outreach-engine` | (consumed directly) | Layer-6 play product; outreach campaign primitives + sidecars pending |
| `@nebutra/play-marketplace` | (consumed directly) | Layer-7 ecosystem product; play discovery + install flow pending |
| `@nebutra/support-deflector` | (consumed directly) | Layer-6 play product; deflection ranking + KB integration pending |
| `@nebutra/time-machine` | (consumed directly)   | Layer-7 ecosystem product; snapshot/restore semantics + storage pending |
| `@nebutra/knowledge-graph` | (consumed directly) | Graph-shaped knowledge primitives; production graph-store adapter sidecar-gated |
| `@nebutra/ecosystem-safety` | (consumed directly) | Cross-package safety primitives; policy engine + audit hooks pending |
| `@nebutra/execution-policy` | (consumed directly) | Policy enforcement contracts for agent tool calls; concrete sidecar enforcement is adapter-gated |
| `@nebutra/local-embedding` | (consumed directly) | Local embedding provider for code-index and retrieval; model adapters and persistence are interface-only |
| `@nebutra/knowledge-base` | (consumed directly) | Product cognition layer over existing retrieval and ingestion; production wiring + persistence pending |
| `@nebutra/ai-primitives` | (consumed directly) | Shared low-level utilities for the AI package family (scopedKey, sha256, cosineSimilarity, clamp, estimateTokens); interfaces still settling |
| `@nebutra/forge-runtime` | (consumed directly) | Registry + dual-surface invoke live on forge host; hard-correct gate delists lab/shell blades; production wallet = CreditLedger (memory forbidden); metering host-injected |
| `@nebutra/forge-dns-leak` | (consumed directly) | Authoritative zone must be delegated at the registrar; six FORGE_DNS_LEAK_* vars configure the listeners; probe sessions are an in-process Map |
| `@nebutra/prepaid-wallet` | (consumed directly) | Prepaid + API key contracts; Prisma/CreditBalance adapter and billing UI are host-owned |
| `@nebutra/router-supply` | (consumed directly) | Router supply alias/engine resolution; production sidecar health and multi-tenant credentials pending |
| `@nebutra/typelens-catalog` | (consumed directly) | Type Lens catalog data model; product surface and seed licensing incomplete |

## Contributing

If you want to take one of these packages to `stable`:

1. Open an issue describing which provider adapter you want to flesh out.
2. Read the inline TODOs in `packages/<name>/src/providers/*`.
3. Add end-to-end tests — a `stable` package must have at least one
   real-world integration covered.
4. Once the adapter is complete, update:
   - `packages/<name>/package.json` → set `nebutra.status = "stable"` and
     drop the `gaps` array (or leave it empty).
   - `packages/<name>/README.md` → remove the `Status:` banner.
   - Run `pnpm maturity:verify` (`scripts/verify-package-maturity.mjs`) to
     confirm `nebutra.status`/`nebutra.graph` and the README banner agree.
   - This doc.

## Machine-readable source of truth

Every package carries its status in its own `package.json`:

```json
{
  "name": "@nebutra/queue",
  "nebutra": {
    "status": "foundation",
    "graph": "core",
    "productionReady": false,
    "requires": ["QSTASH_TOKEN (+ signing keys) for serverless"],
    "gaps": [
      "Worker auto-scaling TODO"
    ]
  }
}
```

Tooling should prefer reading these blocks over scraping this document.
