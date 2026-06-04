# Feature B — Ship generalized governance lints with the create-sailor scaffold

**Date:** 2026-06-04
**Status:** Design (read-only investigation complete)
**Scope:** Scaffolded projects get governance via their own `pnpm lint`, driven by config-driven
(NOT monorepo-hardcoded) generalized lint scripts shipped by `packages/ops/create-sailor`.

---

## 1. How the scaffold builds the output project's `package.json` + `lint` script, and how it copies files

### Clone → mutate, not template-merge

The scaffold does **not** assemble a root `package.json` from fragments. The flow in
`packages/ops/create-sailor/src/steps/scaffold.ts` `runScaffold()` is:

1. **`cloneTemplate(resolvedTarget)`** (`src/utils/git.ts`) — downloads a tarball of the template
   repo (`Nebutra/Sailor-Template` mirror, or `Nebutra/Nebutra-Sailor` main as fallback) and
   extracts it into `resolvedTarget`. The **root `package.json` (and therefore its `"lint"`
   script) comes verbatim from the template repo** — the scaffold inherits whatever the template
   ships.
2. **`updatePackageJson(resolvedTarget, projectName)`** (`src/utils/npm.ts`) — reads the cloned
   root `package.json`, sets `name` + resets `version`, writes it back. It touches nothing else.
3. **`writeNebutraConfig(resolvedTarget, config)`** (`src/utils/config.ts`) — writes
   `nebutra.config.json` from the resolved `NebutraConfig`. **This is the existing pattern for a
   generated, machine-written config file in the output.**
4. **`pruneTemplate` / `pruneWaveFeatures` / per-feature `apply*` steps** — selectively delete or
   rewrite files based on the resolved config (e.g. `applyAuthSelection` removes `packages/auth`
   when `auth=none`). Each `apply*` util uses `fs` directly against `resolvedTarget`.

### Mechanism conclusion

There are two viable injection points, and the **design uses both**:

- **Lint scripts (the `.mjs` files):** they must travel into the output. The template repo
  (`Sailor-Template`) is mirror-synced from this monorepo, so the canonical home for the
  *generalized* lint scripts is **`scripts/governance/` in the monorepo**, mirrored into the
  template's `scripts/governance/`. They arrive in the output via `cloneTemplate` (zero extra
  scaffold code — they are just template files). The monorepo's own `scripts/lint-*.mjs` stay
  where they are (those are NOT mirrored / are stripped at mirror-sync time, same mechanism that
  strips Sleptons).
- **The `"lint"` script + governance config:** rather than depend on the template's root
  `package.json` being hand-maintained, the scaffold gets a small new step
  (`applyGovernanceLints`) that (a) ensures the `package.json` `"lint"` script chains the
  generalized lint runner, and (b) writes the governance config with scaffold-aware defaults.

> Why a scaffold step rather than "just bake it into the template `package.json`": the set of
> enabled lints is **feature-dependent** (see §2 gating). The scaffold already resolves features;
> it is the right place to decide which lints to chain. Baking a static list into the template
> would either over-include (lints for removed layers) or require the template to know the
> resolution logic.

---

## 2. Which monorepo governance lints are PORTABLE vs design-system-specific

| Script | Decision | Reason | gateFeature |
|---|---|---|---|
| `lint-repository-seam.mjs` | **PORTABLE (ship)** | Core-domain shrink-only ratchet. Generic architectural seam — valuable for any SaaS with a data layer. Must be made config-driven (domains/seam/allowlist). | `database` |
| `lint-no-raw-inputs.mjs` | **PORTABLE (ship)** | Form-control primitive rule. The scaffold ALWAYS ships the `@nebutra/ui` design layer (no `ui=none` flag exists), and always has `apps/`, so the rule always applies. Whitelist must be config-driven. | `always` |
| `lint-no-dark-overrides.mjs` | **EXCLUDE** | Design-system-internal: asserts knowledge of which Nebutra tokens auto-flip in `[data-theme="dark"]`. Niche correctness check for the token authors, not consumers of a finished scaffold. Over-inclusion. | — |
| `lint-no-spacing-opacity.mjs` | **EXCLUDE** | Tailwind-v4-quirk micro-lint (spacing util + opacity modifier silently dropped). Real, but extremely narrow; belongs to the design-system maintainers, not every scaffolded SaaS. Over-inclusion. | — |
| `lint-no-arbitrary-breakpoints.mjs` | **EXCLUDE** | Breakpoint-token SSOT ratchet — only meaningful relative to *this monorepo's* named-breakpoint governance and its `styles.css` @theme block. Not portable without dragging that whole policy along. | — |
| `lint-phosphor-marketing-only.mjs` | **EXCLUDE** | Nebutra icon three-tier hierarchy (Geist/Phosphor/lucide zones). Pure Nebutra brand governance; meaningless in a downstream project. | — |

**Disciplined result: exactly TWO lints ship** — `repository-seam` (gated on `database`) and
`no-raw-inputs` (`always`). The four design-system lints are excluded with reasons above. None are
"feature-gated to ship later"; they are simply not portable enough to be worth the maintenance and
the false-positive surface in someone else's codebase.

> Rationale for not gating the four on a UI feature: even when the design layer is present
> (always), these lints encode *internal* invariants of how the tokens were authored, not rules a
> downstream team needs enforced. Shipping them would be over-inclusion per the governance brief.

---

## 3. Config mechanism for the generalized lints

A single generated config file: **`governance.config.json`** at the scaffolded project root,
written by the new scaffold step (same write pattern as `nebutra.config.json`).

Generalized lint scripts read it via a tiny shared loader (`scripts/governance/_config.mjs`,
also mirrored into the output) and **fall back to sensible scaffold-layout defaults** if absent —
so the lints never hardcode monorepo paths.

```jsonc
// governance.config.json (generated; defaults shown for a standard scaffold layout)
{
  "repositorySeam": {
    "coreDomains": [
      "^packages/.*/(billing|license|metering|auth|audit|permissions|identity|tenant)/",
      "^backends/gateway/src/routes/(billing|ai|admin|legal|integrations|webhooks)/",
      "^apps/web/src/app/api/"
    ],
    "seamPaths": [
      "^packages/platform/repositories/",
      "^packages/platform/db/"
    ],
    "dbAccessors": ["getTenantDb", "getSystemDb"],
    "allowlist": []          // fresh scaffold has ZERO bypasses → empty ratchet baseline
  },
  "rawInputs": {
    "scanRoots": ["apps"],
    "primitivesImport": "@nebutra/ui/primitives",
    "whitelist": [
      "/storybook/src/stories/",
      "\\.test\\.tsx?$",
      "/__tests__/"
    ]
  }
}
```

Key design points:

- **No monorepo-absolute paths.** Defaults are *relative-pattern* regexes against the project
  root, matching the scaffold's own layout (`apps/web`, `packages/platform/db`, etc.). The seam
  domains are derived from the generic structure, not copied with this repo's exact bypass list.
- **Empty `allowlist`.** A fresh scaffold has no existing bypasses, so the shrink-only ratchet
  starts clean. As the downstream team accrues intentional bypasses they add them here — and the
  ratchet enforces shrink-only against *their own* baseline.
- **`dbAccessors` configurable** so a project that renames its tenant-db helper still works.
- **`primitivesImport` configurable** in case a downstream renames the UI package.
- The scaffold step writes only the keys for lints it actually enabled (e.g. omits
  `repositorySeam` when `database=none`).

---

## 4. Exact files to create and modify

### Create — generalized lint scripts + config loader (live in monorepo `scripts/governance/`, mirror-synced into template, arrive in output via `cloneTemplate`)

- `scripts/governance/_config.mjs` — shared loader: reads `governance.config.json` from project
  root (via `process.cwd()`), returns parsed config merged over built-in scaffold-layout defaults.
  No monorepo paths.
- `scripts/governance/lint-repository-seam.mjs` — generalized port of
  `scripts/lint-repository-seam.mjs`. Same `execSync` grep + per-file `OP_RE` check + shrink-only
  ratchet + `// @seam-exempt:` escape hatch + `exit 1` style. Reads `coreDomains` / `seamPaths` /
  `dbAccessors` / `allowlist` from config instead of hardcoded constants.
- `scripts/governance/lint-no-raw-inputs.mjs` — generalized port of
  `scripts/lint-no-raw-inputs.mjs`. Same grep + `ATTR_BODY_RE` + `data-allow-native` opt-out +
  comment-stripping + `exit 1` style. Reads `scanRoots` / `whitelist` / `primitivesImport` from
  config.

### Create — fixture tests (in the scaffold package, vitest — matches existing `src/steps/__tests__` + `*.test.ts` style)

- `packages/ops/create-sailor/src/steps/__tests__/governance-lints.test.ts` — fixture tests that
  run each generalized lint against a tmp fixture tree: (a) clean tree → exit 0; (b) a core-domain
  file with direct Prisma access → exit 1; (c) a raw `<input>` in `apps/` → exit 1; (d) a bypass
  present in `allowlist` → exit 0; (e) a listed-but-fixed bypass → exit 1 (shrink-only). Asserts
  the lints read `governance.config.json` and honor defaults when it is absent.

### Modify — scaffold wiring

- `packages/ops/create-sailor/src/utils/governance-lints.ts` — **new util** `applyGovernanceLints`:
  1. writes `governance.config.json` with only the keys for enabled lints (rawInputs always;
     repositorySeam only when `config.database !== "none"`), using scaffold-layout defaults;
  2. patches the cloned root `package.json` `"lint"` script to chain
     `node scripts/governance/lint-no-raw-inputs.mjs` (always) and
     `node scripts/governance/lint-repository-seam.mjs` (when `database` enabled), preserving the
     existing `biome check .` head of the chain.
- `packages/ops/create-sailor/src/steps/scaffold.ts` — call `applyGovernanceLints(resolvedTarget,
  config)` as a new step (after `updatePackageJson` / `writeNebutraConfig`, before `prune`), with
  the standard `emitJson(... step: "governance-lints" ...)` start/ok events.
- `packages/ops/create-sailor/src/index.ts` (`printDryRunPlan`) — add a plan line
  (`governance-lints → wire pnpm lint (no-raw-inputs${db ? " + repository-seam" : ""})`).
- Template repo (`Sailor-Template`) sync config — ensure `scripts/governance/**` is mirrored (NOT
  stripped) at mirror-sync time, alongside whatever it already carries. The monorepo's own
  `scripts/lint-*.mjs` remain non-mirrored.

### Note on the monorepo's own lints

The generalized scripts are **new files under `scripts/governance/`**; the existing
`scripts/lint-*.mjs` are left untouched (the monorepo keeps using its own, path-hardcoded versions
which have its real bypass list and design-system lints). No behavior change to this repo's
`pnpm lint`.
