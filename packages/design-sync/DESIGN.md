# @nebutra/design-sync — DESIGN.md

> Companion: [`README.md`](./README.md) (operator-facing) · cross-reference: [`packages/queue/AGENTS.md`](../queue/AGENTS.md), [`packages/search/AGENTS.md`](../search/AGENTS.md), [`packages/permissions/AGENTS.md`](../permissions/AGENTS.md), [`packages/webhooks/AGENTS.md`](../webhooks/AGENTS.md). Same multi-provider pattern, different domain.

## Why this package exists

Nebutra-Sailor is a SaaS *template*. The customer base is heterogeneous:

| Segment | Tooling reality | Default provider |
|---------|-----------------|------------------|
| North-American / global enterprises with a Figma seat | designers own colour decisions in Figma; engineers consume DTCG | `figma` |
| Indie hackers / solo founders / AI-first dev workflows | no designer, no Figma, "git is the design tool" | `git-only` |
| Chinese compliance teams / privacy-first orgs | Figma is blocked or banned; need self-hostable DTCG-native tool | `penpot` |
| CI / unit tests | hermetic, no network, no filesystem | `memory` |

Hard-wiring the design system to one tool would alienate two of the three customer segments. The same pattern that `@nebutra/queue` uses for queue backends — provider interface + auto-detection + per-customer override — applies cleanly to design tools.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Application code                                               │
│    import { getDesignSync } from "@nebutra/design-sync"          │
│    const sync = await getDesignSync()                            │
│    sync.pull() / sync.push() / sync.healthcheck()                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Factory  (src/factory.ts)                                      │
│    detectProvider() → "figma" | "penpot" | "git-only" | "memory" │
│    createDesignSync(config?) → DesignSyncProvider                │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ FigmaProvider│ │PenpotProvider│ │GitOnlyProvider│ │MemoryProvider│
│              │ │              │ │              │ │              │
│ + Tokens     │ │ DTCG-native  │ │ Local DTCG   │ │ In-memory    │
│ Studio plugin│ │ REST API     │ │ files only   │ │ test fixture │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────────────┘
       │                │                │
       └────────────────┴────────────────┘
                       │
                       ▼
       packages/design-tokens/tokens/*.json
            (W3C DTCG — single source of truth)
```

## Provider interface contract

```ts
interface DesignSyncProvider {
  readonly name: "figma" | "penpot" | "git-only" | "memory";
  pull(options?: PullOptions): Promise<PullResult>;
  push(options?: PushOptions): Promise<PushResult>;
  healthcheck(): Promise<HealthStatus>;
}
```

- **`pull`** — design-tool → repo. Always returns `DesignTokenSet[]`. Live providers fall back to local DTCG when credentials are missing rather than throwing — this lets a half-configured environment still produce useful diagnostics.
- **`push`** — repo → design-tool. **Always defaults to `dryRun: true` on `figma` and `penpot`** until the operator explicitly opts in. The package never silently writes to a remote design tool.
- **`healthcheck`** — returns the provider name, an `ok` boolean, and which env vars were detected/missing. Used by the `design-sync healthcheck` CLI and by CI gates.

## Resolution order

1. Explicit `config.provider` passed to `createDesignSync({ provider: "..." })`.
2. `DESIGN_SYNC_PROVIDER` env var (must match a known provider; junk values are ignored).
3. `FIGMA_PERSONAL_ACCESS_TOKEN` **and** `FIGMA_FILE_ID` → `figma`.
4. `PENPOT_API_URL` **and** `PENPOT_TOKEN` → `penpot`.
5. Fallback → `git-only` (zero config, always works).

`memory` is intentionally absent from auto-detection — it is a test fixture, never a default.

## Why default to `git-only`?

Three reasons:

1. **Zero-config onboarding.** A developer who clones the template and runs the install script gets a working design system immediately. The DTCG files in `packages/design-tokens/tokens` are already the source of truth.
2. **AI-first compatibility.** Tools like Claude Code can read/write DTCG JSON deterministically; round-tripping through Figma adds friction without value when there is no human designer.
3. **Compliance friendly.** No external API calls, no cross-border data flows. Fits a self-hosted Sailor install behind a corporate firewall.

## Why a Figma push is dry-run by default

The Figma Variables REST API (`PATCH /v1/files/:file_key/variables`) is destructive — a bad payload can erase a designer's variable collections. The provider therefore:

- validates DTCG **before** any remote call,
- requires *both* `FIGMA_PERSONAL_ACCESS_TOKEN` and `FIGMA_FILE_ID` (one is not enough),
- still exits as a dry-run if `dryRun: true` is passed explicitly,
- throws a "not yet implemented" error on the live path until the operator wires up the integration.

This matches how `.github/workflows/tokens-sync.yml` handled push gating before the refactor.

## Why Penpot matters

Penpot is the only mainstream design tool that:

- speaks DTCG natively (no translation layer),
- is self-hostable (Docker image, Kubernetes chart),
- is GPL-licensed (no vendor lock-in),
- is reachable from mainland China (Figma is blocked at the network edge for many enterprise CN tenants).

For Nebutra's CN compliance segment this is not an optional alternative; it is the only path. The provider scaffolding is intentionally complete (interface, healthcheck, dry-run) so a CN team can `DESIGN_SYNC_PROVIDER=penpot` from day one and only the live RPC calls remain.

## Migration from `.tokens-studio/`

- `.tokens-studio/config.json` — kept at the repo root because the plugin's discovery path is non-configurable. Mirror committed at `src/figma-config/tokens-studio.config.json` so the `FigmaProvider` ships with its own canonical copy.
- `.tokens-studio/themes.json` and `.tokens-studio/metadata.json` — kept at the root, validated by `FigmaProvider.healthcheck()`.
- `.github/workflows/tokens-sync.yml` — replaced by `.github/workflows/design-sync.yml`, which delegates pull/push/healthcheck to the CLI instead of inlining DTCG validation in shell.

## Cross-reference

| Same pattern | This package | Notes |
|--------------|--------------|-------|
| `@nebutra/queue` | `@nebutra/design-sync` | Auto-detect order, factory pattern, dry-run safety, singleton getter |
| `@nebutra/search` | `@nebutra/design-sync` | Three real providers + memory fallback |
| `@nebutra/permissions` | `@nebutra/design-sync` | `vitest.config.ts`, `src/__tests__/`, `vitest catalog:` dep |
| `@nebutra/webhooks` | `@nebutra/design-sync` | Provider name as discriminated union literal |

## Out of scope (intentional)

- **Generating DTCG.** Owned by `@nebutra/design-tokens` (Style Dictionary).
- **Runtime CSS.** Owned by `@nebutra/tokens` (`styles.css`).
- **Theme switching.** Owned by `@nebutra/theme`.
- **Storybook visualisation.** Owned by `apps/storybook`.

This package is *only* the bridge between the design tool and the DTCG files on disk.
