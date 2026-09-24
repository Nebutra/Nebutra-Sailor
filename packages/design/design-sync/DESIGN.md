# @nebutra/design-sync — DESIGN.md

> Companion: [`README.md`](./README.md) (operator-facing). See
> [ADR 2026-09-24 — Sailor Convergence](../../../docs/architecture/2026-09-24-sailor-convergence.md)
> for why Figma and Penpot were deleted outright rather than kept as stubs.

## Why this package exists

Nebutra-Sailor is a SaaS *template*. Design tokens are the canonical W3C DTCG JSON files
committed to the repo (`packages/design/design-tokens/tokens`). This package is the bridge
between those files and whatever else needs to read or write them:

| Segment | Tooling reality | Provider |
|---------|-----------------|----------|
| Indie hackers / solo founders / AI-first dev workflows | no designer, "git is the design tool" | `git-only` |
| AI-native workflows | DESIGN.md as a human- and model-readable design surface, official lint gate | `design-md` |
| CI / unit tests | hermetic, no network, no filesystem | `memory` |

Per the convergence ADR, a domain keeps at most one production-used provider plus a
China/legal hard-constraint pair where the law forces a second adapter. Design sync has no
such constraint — Figma and Penpot were dev-tool integrations that nothing in production ever
configured, so both were deleted rather than demoted to `stub`.

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
│    detectProvider() → "git-only" | "design-md" | "memory"        │
│    createDesignSync(config?) → DesignSyncProvider                │
└──────┬──────────────────────┬──────────────────┬─────────────────┘
       │                      │                  │
       ▼                      ▼                  ▼
┌──────────────┐    ┌──────────────────┐   ┌──────────────┐
│GitOnlyProvider│    │ DesignMdProvider │   │MemoryProvider│
│               │    │                  │   │              │
│ Local DTCG    │    │ DESIGN.md ↔ DTCG │   │ In-memory    │
│ files only    │    │ + lint gate      │   │ test fixture │
└──────┬────────┘    └────────┬─────────┘   └──────────────┘
       │                      │
       └──────────────────────┘
                  │
                  ▼
       packages/design/design-tokens/tokens/*.json
            (W3C DTCG — single source of truth)
```

## Provider interface contract

```ts
interface DesignSyncProvider {
  readonly name: "git-only" | "design-md" | "memory";
  pull(options?: PullOptions): Promise<PullResult>;
  push(options?: PushOptions): Promise<PushResult>;
  healthcheck(): Promise<HealthStatus>;
}
```

- **`pull`** — design-tool → repo. Always returns `DesignTokenSet[]`.
- **`push`** — repo → design-tool. `design-md` always runs the official
  `@google/design.md` lint gate before writing, and fails closed on any error-severity
  finding.
- **`healthcheck`** — returns the provider name, an `ok` boolean, and which env vars were
  detected/missing. Used by the `design-sync healthcheck` CLI and by CI gates.

## Resolution order

1. Explicit `config.provider` passed to `createDesignSync({ provider: "..." })`.
2. `DESIGN_SYNC_PROVIDER` env var (must match a known provider; junk values are ignored).
3. Fallback → `git-only` (zero config, always works).

`memory` is intentionally absent from auto-detection — it is a test fixture, never a default.
`design-md` is also never auto-selected; it must be requested explicitly, matching its
dry-run-by-default push semantics.

## Why default to `git-only`?

Three reasons:

1. **Zero-config onboarding.** A developer who clones the template and runs the install script
   gets a working design system immediately. The DTCG files in
   `packages/design/design-tokens/tokens` are already the source of truth.
2. **AI-first compatibility.** Tools like Claude Code can read/write DTCG JSON deterministically
   without round-tripping through an external design tool.
3. **Compliance friendly.** No external API calls, no cross-border data flows. Fits a self-hosted
   Sailor install behind a corporate firewall.

## Why `design-md` exists

`@google/design.md` is an AI-native format: markdown + YAML front matter that both humans and
models can read and edit directly, with an official lint gate (broken-ref, contrast) run before
every write. It gives indie/AI-first teams a design surface without depending on an external
design tool's API or credentials — the "design tool" is a file in the repo.

## Why Figma and Penpot were removed

Both were figma/penpot-specific adapters (Tokens Studio plugin sync, Penpot REST API) that
nothing in Nebutra's production deployment ever configured — no `FIGMA_*` or `PENPOT_*`
credentials existed in any deploy workflow. Per the convergence ADR's rule ("one provider per
domain; production usage is the tiebreak, and non-kept adapters are deleted, not demoted"), they
were deleted outright: `src/providers/figma.ts`, `src/providers/penpot.ts`,
`src/figma-config/`, their tests, factory branches, CLI provider names, and package.json
subpath exports. The repo-root `.tokens-studio/{config,metadata,themes}.json` snapshot was left
in place (out of this package's scope) but nothing in this package reads it anymore.

## Cross-reference

| Same pattern | This package | Notes |
|--------------|--------------|-------|
| `@nebutra/queue` | `@nebutra/design-sync` | Auto-detect order, factory pattern, dry-run safety, singleton getter |
| `@nebutra/permissions` | `@nebutra/design-sync` | `vitest.config.ts`, `src/__tests__/`, `vitest catalog:` dep |
| `@nebutra/webhooks` | `@nebutra/design-sync` | Provider name as discriminated union literal |

## Out of scope (intentional)

- **Generating DTCG.** Owned by `@nebutra/design-tokens` (Style Dictionary).
- **Runtime CSS.** Owned by `@nebutra/tokens` (`styles.css`).
- **Theme switching.** Owned by `@nebutra/theme`.
- **Storybook visualisation.** Owned by `apps/storybook`.

This package is *only* the bridge between the design tool and the DTCG files on disk.
