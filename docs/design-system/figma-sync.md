# Figma ⇄ Git Token Sync

End-to-end workflow for keeping **Figma variables/styles** and **`packages/design-tokens` (W3C DTCG)** in lock-step via the [Tokens Studio for Figma](https://tokens.studio) plugin.

> **Status:** Phase 2 — provider abstraction in place, validation green, Figma **push still disabled by default**. The Figma transport is now one of three providers wired through [`@nebutra/design-sync`](../../packages/design/design-sync/README.md): `figma` (Tokens Studio plugin), `penpot` (China-friendly), `git-only` (zero-config). See [`packages/design/design-sync/DESIGN.md`](../../packages/design/design-sync/DESIGN.md) for the architecture.

> **CI workflow:** `.github/workflows/design-sync.yml` (replaced the legacy `tokens-sync.yml`). The workflow delegates DTCG validation and pull/push semantics to the `design-sync` CLI.

---

## Architecture overview

```
┌────────────────────┐      Tokens Studio plugin      ┌────────────────────┐
│      Figma         │ ───── push to git branch ────► │   GitHub repo      │
│   (designers)      │ ◄──── pull from git ─────────  │  packages/design-  │
└────────────────────┘                                │  tokens/tokens/    │
                                                       │  + .tokens-studio/ │
                                                       └────────┬───────────┘
                                                                │
                                                                ▼
                                              ┌──────────────────────────────┐
                                              │ design-sync.yml workflow     │
                                              │ ─ DTCG validate              │
                                              │ ─ build @nebutra/design-     │
                                              │   tokens (Style Dictionary)  │
                                              │ ─ parity vs packages/design/tokens/ │
                                              │   styles.css                 │
                                              │ ─ PR comment with diff       │
                                              └──────────────┬───────────────┘
                                                             ▼
                                                ┌─────────────────────────┐
                                                │ apps/* consume CSS vars │
                                                │ from @nebutra/tokens    │
                                                └─────────────────────────┘
```

**Source of truth:** `packages/design/design-tokens/tokens/*.json` (W3C DTCG `$value` / `$type`).
**Runtime consumer:** `packages/design/tokens/styles.css` — generated from DTCG, parity-checked in CI.
**Tokens Studio metadata:** `.tokens-studio/{config,themes,metadata}.json` — describes token-set ordering and Figma theme bindings.

---

## Designer flow (Figma → Git)

1. Open the Tokens Studio plugin in Figma → **Settings → Sync**.
2. Make changes in the plugin UI (color, spacing, typography, etc.).
3. Click **Push to Git** → choose branch prefix `tokens-studio/<short-name>`.
4. The plugin opens a pull request automatically (or surfaces a link to create one).
5. CI (`design-sync.yml`) runs:
   - DTCG schema validation
   - `pnpm --filter @nebutra/design-tokens build`
   - parity check against `packages/design/tokens/styles.css`
   - sticky PR comment with the token diff
6. A maintainer reviews and merges. On `main`, the workflow re-runs and (when push is enabled) propagates back to the canonical Figma file.

> _TODO screenshot: Tokens Studio "Push to git" dialog._
> _TODO screenshot: PR comment from `design-sync.yml`._

## Engineer flow (Git → Figma)

1. Edit `packages/design/design-tokens/tokens/<set>.json` directly.
2. Run locally: `pnpm --filter @nebutra/design-tokens build` then `pnpm --filter @nebutra/design-tokens verify:parity`.
3. Open a PR. CI runs the same validations as the designer flow.
4. After merge, the designer pulls in Tokens Studio (**Settings → Sync → Pull**) — Figma variables are updated atomically per theme.

> _TODO screenshot: Tokens Studio "Pull from git" with diff preview._

---

## Workflow behaviour (current phase)

| Trigger                                        | Behaviour                                      |
| ---------------------------------------------- | ---------------------------------------------- |
| Push / PR touching `packages/design/design-tokens/**` | Validate + build + parity + PR comment         |
| Push / PR touching `.tokens-studio/**`         | Validate metadata only                         |
| `packages/design/design-tokens/tokens/` is empty      | `validate` job exits early — no failures, no diff comment |
| `workflow_dispatch` with `pushToFigma=false`   | No-op                                          |
| `workflow_dispatch` with `pushToFigma=true`    | Guarded — requires `FIGMA_PERSONAL_ACCESS_TOKEN` + `FIGMA_FILE_ID` secrets; otherwise warns and exits 0 |

**Early-exit guarantee:** until the design-tokens package emits its first `tokens/**.json`, the workflow stays silent — this phase is purely scaffolding.

---

## Enabling Figma push

The `push-to-figma` job is a placeholder. To turn it on:

1. Generate a [Figma personal access token](https://help.figma.com/hc/en-us/articles/8085703771159) with file write scope.
2. Identify the target Figma file ID (from the file URL: `figma.com/file/<FILE_ID>/...`).
3. Add **repository secrets** (Settings → Secrets and variables → Actions):
   - `FIGMA_PERSONAL_ACCESS_TOKEN`
   - `FIGMA_FILE_ID`
4. Create a **GitHub Environment** named `figma-push` and require manual approval for runs targeting `main`.
5. Wire up the live push inside `packages/design/design-sync/src/providers/figma.ts` (the provider currently throws "live push not yet implemented" so an accidental run cannot wipe a Figma file). The implementation should call:
   - the [Figma Variables REST API](https://www.figma.com/developers/api#variables) (`PATCH /v1/files/:file_key/variables`), **or**
   - the Tokens Studio CLI once it ships a stable Variables-API export path.

6. Run the `Push to design tool` job in `.github/workflows/design-sync.yml` via `workflow_dispatch` with `pushToDesignTool=true`.

Until step 5 is done, runs of the job are intentional no-ops.

---

## Troubleshooting

### "DTCG schema validation failed"

A leaf token is missing `$type` or has invalid JSON. Run locally:

```bash
pnpm --filter @nebutra/design-tokens build
```

Style Dictionary will surface the offending path. Every leaf needs both `$value` and `$type` (DTCG draft-2 spec).

### "Parity check failed"

`packages/design/tokens/styles.css` no longer matches the generated CSS from `packages/design-tokens`. Either:

- regenerate the runtime CSS from DTCG (preferred), or
- backport the manual edit into the appropriate `tokens/**.json` file.

The verifier script lives at `packages/design/design-tokens/scripts/verify-parity.ts`.

### "Tokens Studio cannot pull from git"

- Confirm the plugin's **Sync provider = GitHub** with branch `main`, file path `packages/design/design-tokens/tokens`, and multi-file mode enabled.
- Check `.tokens-studio/config.json` — `git.tokenPath`, `git.themesPath`, `git.metadataPath` must match exactly.
- The plugin needs a token with `repo` scope on this repository.

### "PR comment is not appearing"

- The job runs only when the PR is from the same repository (forks lack `pull-requests: write`).
- Re-run the workflow from the **Actions** tab once the PR is merged into the source branch.

### "Theme matrix in Figma is empty after pull"

- `.tokens-studio/themes.json` must list every theme; missing entries are silently dropped by the plugin.
- The `selectedTokenSets` map values must be one of `source` / `enabled` / `disabled` exactly.

---

## File reference

| Path                                       | Purpose                                          |
| ------------------------------------------ | ------------------------------------------------ |
| `packages/design/design-sync/`                    | Provider-agnostic sync package (figma/penpot/git-only/memory) |
| `packages/design/design-sync/src/cli/index.ts`    | `design-sync` CLI (`detect`, `healthcheck`, `pull`, `push`)   |
| `.tokens-studio/config.json`               | Plugin sync config (provider, branch, paths)     |
| `.tokens-studio/metadata.json`             | Token set load order                             |
| `.tokens-studio/themes.json`               | 8 themes (Base Light/Dark + 6 multi-theme presets) |
| `.github/workflows/design-sync.yml`        | CI: detect → healthcheck → build → parity → PR comment → gated push |
| `packages/design/design-tokens/tokens/`           | DTCG source files (created by sibling agent)     |
| `packages/design/design-tokens/build/`            | Style Dictionary outputs (CSS / TS / JSON)       |
| `packages/design/tokens/styles.css`               | Runtime CSS variables consumed by all apps      |
