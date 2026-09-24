> **Status: Foundation** — provider interface, detection, git-only path, and CLI are complete. See `DESIGN.md` for the design rationale.

# @nebutra/design-sync

Provider-agnostic design-tool sync. The application code never imports a specific design tool — it imports `getDesignSync()` and the runtime resolves the right backend.

## Provider matrix

| Provider | Customer profile | Cost | China-friendly | Status |
|----------|------------------|------|----------------|--------|
| `git-only` | Indie hackers, AI-driven dev workflows, "no designer" teams | Free | Yes | full |
| `design-md` | AI-native workflows — DESIGN.md as the design surface | Free | Yes | full |
| `memory` | CI / unit tests | Free | n/a | full (test fixture) |

## Quick start

```ts
import { getDesignSync } from "@nebutra/design-sync";

// Auto-detects the provider from environment variables (defaults to git-only).
const sync = await getDesignSync();

// Pull design-tool → repo (DTCG JSON files under packages/design/design-tokens/tokens).
const result = await sync.pull();
console.log(result.summary);

// Push repo → design-tool. Defaults to dry-run on design-md
// until you opt in by providing credentials.
await sync.push({ dryRun: true });

// Diagnose configuration.
const status = await sync.healthcheck();
```

## Provider auto-detection

| Priority | Condition | Provider |
|----------|-----------|----------|
| 1 | `DESIGN_SYNC_PROVIDER` set to `git-only` / `design-md` / `memory` | as specified |
| 2 | fallback | `git-only` |

`memory` is never auto-detected; it must be requested explicitly (used in tests).

## Environment variables

```env
# Optional — force a specific provider
DESIGN_SYNC_PROVIDER=""              # git-only | design-md | memory

# design-md
DESIGN_MD_PATH=""                    # defaults to <cwd>/DESIGN.md
```

## CLI

The package ships a `design-sync` binary (mirrors the `getDesignSync()` API):

```bash
# Print which provider was resolved + which env vars were detected.
pnpm --filter @nebutra/design-sync exec design-sync detect

# Run the provider's healthcheck.
pnpm --filter @nebutra/design-sync exec design-sync healthcheck

# Pull design-tool → repo.
pnpm --filter @nebutra/design-sync exec design-sync pull

# Push repo → design-tool (defaults to dry-run on design-md).
pnpm --filter @nebutra/design-sync exec design-sync push --dry-run

# Restrict to specific token sets.
pnpm --filter @nebutra/design-sync exec design-sync pull --themes core,semantic

# Override provider for one invocation.
pnpm --filter @nebutra/design-sync exec design-sync detect --provider git-only

# JSON output for CI scripts.
pnpm --filter @nebutra/design-sync exec design-sync detect --json
```

## Choosing a provider

- **You ship without a design tool (indie hacker, AI-first dev)** → use `git-only`. Zero config. The DTCG files under `packages/design/design-tokens/tokens` *are* the source of truth.
- **You want an AI-native design surface** → use `design-md`. Push/pull a `DESIGN.md` file (markdown + YAML front matter) that models and humans can both read and edit directly, with an official lint gate before writes.
- **You write tests** → inject `MemoryProvider` directly via `setDesignSync(...)`.

## How DTCG flows through the package

```
packages/design/design-tokens/tokens/*.json   ← single source of truth (W3C DTCG)
                  ▲
                  │ pull()  /  push()
                  ▼
       DesignSyncProvider (git-only | design-md | memory)
                  │
                  ▼
       DESIGN.md or local files (git-only)
```

Every provider goes through the same DTCG validator (`validateDtcgTree`) before sending data anywhere; bad token files fail closed before they reach a remote API.
