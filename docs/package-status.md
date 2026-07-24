# Nebutra Package Status

This page tracks the production-readiness of each `@nebutra/*` package
exposed by `create-sailor`. It is the human-readable companion to the
machine-readable `nebutra` block in every `package.json`.

## Status values

| Status          | Meaning                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `stable`        | Production-ready. Full implementation. Default assumption for packages not listed below.         |
| `foundation`    | Core contract is production-usable, while optional provider adapters or UI surfaces still need credentials/wiring. |
| `wip`           | Actively under development. Do not use in production until the notice is removed from its README.|
| `deprecated`    | Scheduled for removal. Do not use.                                                               |

## How to read the CLI

When you run `create-sailor` and select a provider whose underlying
package is not `stable`, the CLI will:

1. Print a yellow `⚠` warning after the dry-run plan and again right
   before the done card.
2. In `--json` mode, emit an `event: "warn"` with `packageStatus`,
   `provider`, and `step`.
3. Add the selection to a `⚠  Preview features selected` section of the
   post-install "done card".

You are never blocked from selecting a preview provider — the guarantee
is transparency, not restriction.

## Foundation packages (16)

These packages ship a real factory, type definitions, and provider
registration. Their core path is usable, but the happy path usually
needs: (a) external credentials, (b) additional adapter code you
contribute, or (c) a managed SaaS that the provider wraps.

| Package                  | CLI flag(s)            | Ready out-of-the-box?                 | Main gaps                                                           |
| ------------------------ | ---------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `@nebutra/metering`      | (enabled via payment)  | No — needs ClickHouse or local dev    | Gateway/billing ingestion and enforcement wiring pending             |
| `@nebutra/legal`         | (consumed directly)    | Partial — package seams exist         | Consent persistence API, DB-backed store, and publishing workflow pending |
| `@nebutra/permissions`   | (consumed directly)    | Partial — CASL works in-process       | OpenFGA adapter stub                                                |
| `@nebutra/queue`         | `--queue`              | No — QStash or Redis credentials      | QStash DLQ retrieval TODO; worker auto-scaling TODO                 |
| `@nebutra/search`        | `--search`             | No — provider creds required          | Provider adapters are stubs; pgvector not implemented               |
| `@nebutra/tenant`        | (enabled by middleware)| Partial — AsyncLocalStorage works     | Subdomain/JWT resolvers scaffolded; schema migration flow pending   |
| `@nebutra/uploads`       | (consumed directly)    | No — S3/R2 creds required             | Tus flow not end-to-end; validation stubs                           |
| `@nebutra/vault`         | (consumed directly)    | Partial — local HKDF works for dev    | KMS rotation flow TODO; tenant isolation scaffolded                 |
| `@nebutra/feature-flags` | `--feature-flags`      | Partial — Redis/env runtime works     | Managed Vercel/GrowthBook/ConfigCat SDK adapters and rollout UI pending |
| `@nebutra/knowledge-rag` | (consumed directly)    | Partial — zero-config RAG path works  | pgvector store interface-only; provider-grade reranker adapter pending |
| `@nebutra/design-sync`   | (auto-detect)          | git-only works zero-config            | Figma push (Variables REST API) is dry-run; Penpot push scaffolded  |
| `@nebutra/china-compliance` | (env-driven)         | ICP footer + region detection ready   | WeChat OAuth callback route TODO; Aliyun SMS adapter scaffold       |
| `@nebutra/access-gate`  | `--access-gate`        | Core + Prisma adapter + admin issue/list/revoke/email/Dub links + Better Auth signup gate/redeem work | OAuth callback gating and DB-backed integration tests are app-owned |
| `@nebutra/waitlist`      | `--waitlist`           | In-memory store works                 | Prisma adapter TODO; email confirmation + analytics endpoint pending |
| `@nebutra/admin-tooling` | (consumed directly)    | Contract surface stable               | No concrete Retool/Forest/Appsmith adapter examples wired yet        |
| `@nebutra/onboarding`    | (consumed directly)    | Client-side localStorage flow works   | Server-side completion sync pending; analytics hook for step transitions |

## WIP packages (38)

These packages have code skeletons, README intent, and types, but no
production integrations. Their READMEs carry a `Status: WIP — Not yet
integrated into any production app` banner. Expect breaking changes
and missing functionality.

| Package                  | CLI flag(s)             | Why WIP                                                          |
| ------------------------ | ----------------------- | ---------------------------------------------------------------- |
| `@nebutra/audit`         | (consumed directly)     | Event schema not finalized; retention/export workflow pending    |
| `@nebutra/captcha`       | `--captcha`             | hCaptcha & Aliyun adapters scaffolded only                       |
| `@nebutra/event-bus`     | (consumed by saga)      | Cross-service pub/sub guarantees not verified                    |
| `@nebutra/code-index`    | (consumed directly)     | Provider-agnostic contracts and indexing core only; concrete embedder/vector-store adapters are injected |
| `@nebutra/mcp`           | `--mcp`                 | Context server binary is a placeholder stub                      |
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
| `@nebutra/forge-runtime` | (consumed directly) | Tool-station registry + invoke pipeline; forge.nebutra.com surface, metering defaults, and host provider bindings pending |
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
   - `packages/ops/create-sailor/src/utils/package-status.ts` → remove the
     entry (defaults to `stable`).
   - This doc.

## Machine-readable source of truth

Every package carries its status in its own `package.json`:

```json
{
  "name": "@nebutra/queue",
  "nebutra": {
    "status": "foundation",
    "productionReady": false,
    "requires": ["QSTASH_TOKEN or REDIS_URL"],
    "gaps": [
      "QStash provider dead letter retrieval not implemented",
      "Worker auto-scaling TODO"
    ]
  }
}
```

Tooling should prefer reading these blocks over scraping this document.
