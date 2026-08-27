> **Status: Foundation** — provider interface, detection, git-only path, and CLI are complete. Figma + Penpot live pushes are intentionally guarded behind `dryRun` until the operator opts in. See `DESIGN.md` for the rollout plan.

# @nebutra/design-sync

Provider-agnostic design-tool sync. The application code never imports a specific design tool — it imports `getDesignSync()` and the runtime resolves the right backend.

## Provider matrix

| Provider | Customer profile | Cost | China-friendly | Status |
|----------|------------------|------|----------------|--------|
| `figma` | North-American / global teams with a Figma seat (Tokens Studio plugin) | Figma + Tokens Studio | No (Figma blocked) | dry-run, pull works |
| `penpot` | Self-hosted / privacy-first / China compliance | Free / self-host | Yes (self-hostable) | dry-run scaffold |
| `git-only` | Indie hackers, AI-driven dev workflows, "no designer" teams | Free | Yes | full |
| `memory` | CI / unit tests | Free | n/a | full (test fixture) |

## Quick start

```ts
import { getDesignSync } from "@nebutra/design-sync";

// Auto-detects the provider from environment variables.
const sync = await getDesignSync();

// Pull design-tool → repo (DTCG JSON files under packages/design/design-tokens/tokens).
const result = await sync.pull();
console.log(result.summary);

// Push repo → design-tool. Defaults to dry-run on figma/penpot
// until you opt in by providing credentials.
await sync.push({ dryRun: true });

// Diagnose configuration.
const status = await sync.healthcheck();
```

## Provider auto-detection

| Priority | Condition | Provider |
|----------|-----------|----------|
| 1 | `DESIGN_SYNC_PROVIDER` set to `figma` / `penpot` / `git-only` / `memory` | as specified |
| 2 | `FIGMA_PERSONAL_ACCESS_TOKEN` **and** `FIGMA_FILE_ID` present | `figma` |
| 3 | `PENPOT_API_URL` **and** `PENPOT_TOKEN` present | `penpot` |
| 4 | fallback | `git-only` |

`memory` is never auto-detected; it must be requested explicitly (used in tests).

## Environment variables

```env
# Optional — force a specific provider
DESIGN_SYNC_PROVIDER=""              # figma | penpot | git-only | memory

# Figma
FIGMA_PERSONAL_ACCESS_TOKEN=""       # https://help.figma.com/hc/en-us/articles/8085703771159
FIGMA_FILE_ID=""                     # the :file_key segment of the Figma URL
FIGMA_GITHUB_REPO="Nebutra/Nebutra-Sailor"
FIGMA_GITHUB_BRANCH="main"

# Penpot
PENPOT_API_URL="https://design.penpot.app/api"  # or your self-host URL
PENPOT_TOKEN=""
PENPOT_FILE_ID=""
PENPOT_TEAM_ID=""
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

# Push repo → design-tool (defaults to dry-run on figma/penpot).
pnpm --filter @nebutra/design-sync exec design-sync push --dry-run

# Restrict to specific token sets.
pnpm --filter @nebutra/design-sync exec design-sync pull --themes core,semantic

# Override provider for one invocation.
pnpm --filter @nebutra/design-sync exec design-sync detect --provider git-only

# JSON output for CI scripts.
pnpm --filter @nebutra/design-sync exec design-sync detect --json
```

## Choosing a provider

- **You have a Figma file + designers** → use `figma`. The Tokens Studio plugin owns the git transport (push/pull DTCG to a GitHub branch). The provider validates `.tokens-studio/` metadata and re-reads the DTCG mirror written by the plugin.
- **You self-host or operate inside mainland China** → use `penpot`. It speaks DTCG natively and can be self-hosted; the provider exposes the same `pull/push/healthcheck` surface so you migrate by flipping one env var.
- **You ship without a design tool (indie hacker, AI-first dev)** → use `git-only`. Zero config. The DTCG files under `packages/design/design-tokens/tokens` *are* the source of truth.
- **You write tests** → inject `MemoryProvider` directly via `setDesignSync(...)`.

## How DTCG flows through the package

```
packages/design/design-tokens/tokens/*.json   ← single source of truth (W3C DTCG)
                  ▲
                  │ pull()  /  push()
                  ▼
       DesignSyncProvider (figma | penpot | git-only | memory)
                  │
                  ▼
       remote design tool (or local files for git-only)
```

Every provider goes through the same DTCG validator (`validateDtcgTree`) before sending data anywhere; bad token files fail closed before they reach a remote API.

## Migration from `.tokens-studio/`

The legacy Tokens Studio config (`.tokens-studio/{config,metadata,themes}.json`) is preserved at the repo root for the plugin to discover, **and** mirrored into `src/figma-config/tokens-studio.config.json` so the figma provider self-documents. Update both files in lock-step if the plugin schema changes.
