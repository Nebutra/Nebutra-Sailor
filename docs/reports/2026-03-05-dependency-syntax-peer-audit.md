# Nebutra Monorepo Audit Report

- Date: 2026-03-05
- Repo: `Nebutra-Sailor`
- Goal: Check dependency freshness, syntax/convention currency, and peer dependency health.

## 1) Executive Summary

- Dependency freshness: **not latest**.
  - Checked packages: `84`
  - Outdated: `81`
  - Major: `38`, Minor: `33`, Patch: `10`
  - Deprecated in use: `3`
- Peer dependency health: **currently passing**.
  - `pnpm install --frozen-lockfile --strict-peer-dependencies` passed.
  - `pnpm ls -r --depth 0 --json` => `peerLikeIssues: 0`
- Build/syntax status: **current build passes**, but there are deprecation warnings.
  - `pnpm turbo build --filter=@nebutra/landing-page` passed.
  - Next.js warning: `middleware` convention deprecated, should migrate to `proxy`.

## 2) Reproduction Commands

```bash
pnpm outdated -r --format json
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm ls -r --depth 0 --json
pnpm turbo build --filter=@nebutra/landing-page
```

## 3) Critical Findings (Priority Order)

### P1 - Major upgrades cluster with ecosystem coupling

Main majors (sample):

- `@lobehub/ui`: `2.25.0 -> 5.3.0`
- `@lobehub/icons`: `2.48.0 -> 5.0.1`
- `antd`: `5.29.3 -> 6.3.1`
- `antd-style`: `3.7.1 -> 4.1.0`
- `framer-motion`: `11.18.2 -> 12.35.0`
- `@clerk/nextjs`: `6.35.5 -> 7.0.1`
- Storybook stack: `8.x -> 10.x`

Verified peer constraints (registry):

- `@lobehub/ui@5.3.0` peers:
  - `antd ^6.1.1`
  - `motion ^12.0.0`
  - `@lobehub/icons ^5.0.0`
  - `react/react-dom ^19.0.0`
- `@lobehub/icons@5.0.1` peers:
  - `@lobehub/ui ^5.0.0`
  - `antd ^6.1.1`
  - `react/react-dom ^19.0.0`
- `antd-style@4.1.0` peers:
  - `antd >=6.0.0`

Implication:

- **Lobe chain must be upgraded as a bundle** (`@lobehub/ui` + `@lobehub/icons` + `antd` + `antd-style` + `motion`) to avoid peer breakage.

### P1 - Theme system still has mixed selectors in one package

- Apps currently use class-based dark mode via `@nebutra/tokens`:
  - `attribute="class"` in:
    - `apps/landing-page/src/app/providers.tsx`
    - `apps/web/src/app/providers/theme-provider.tsx`
- But `packages/marketing/src/styles/tokens.css` still defines both:
  - `.dark`
  - `[data-theme="dark"]`

Implication:

- Theme mechanism is not fully unified yet; there is still dual-selector support in package CSS.

### P1 - `@nebutra/ui` facade not fully closed

- Good: package exports include facade entries (`./primitives`, `./lib/utils`).
- Remaining leak: Storybook still imports internal source path directly:
  - `@nebutra/ui/src/primitives/animate-in` in `apps/storybook/src/stories/Motion.stories.tsx`
  - TS path alias to `@nebutra/ui/src/*` in `apps/storybook/tsconfig.json`
  - Ambient workaround in `apps/storybook/src/ui.d.ts`

Implication:

- `@nebutra/ui` is not yet a strict stable boundary for all consumers.

### P2 - Next.js convention drift

Deprecated `middleware` file convention found:

- `apps/landing-page/src/middleware.ts`
- `apps/web/src/middleware.ts`

Should migrate to Next 16 `proxy` convention.

### P2 - Legacy/consistency debt in docs and package surface

- Legacy `ui` paths still appear in docs (not code imports):
  - `apps/landing-page/DESIGN.md`
- `packages/theme` still exists and documents `data-theme` model, while apps use `@nebutra/tokens` + `.dark`.
- `packages/ui/README.md` still references old exports like `@nebutra/ui/theme` and icons paths that no longer match current package surface.

### P3 - Deprecated dependencies in use

- `@types/recharts@2.0.1` (deprecated)
- `conventional-changelog-cli@5.0.0` (deprecated)
- `svg-dotted-map@2.1.0` (deprecated)

## 4) Owner Constraints (Must Keep)

These constraints should be treated as hard requirements in migration:

1. Keep a **single** theme token system (do not mix `@nebutra/theme` and another token stack in runtime).
2. Keep **single switching mechanism** (choose one; currently class `.dark` is already in use).
3. Keep **light theme support** (do not remove light mode).
4. Do **not** do “reverse upgrade” shortcuts (`cacheComponents: false`, indiscriminate `"use client"` spread, etc.).
5. `@nebutra/ui` must be a stable facade; avoid `@nebutra/ui/src/*` in consumers.
6. Do not remove lobe/antd stack without a complete equivalent replacement plan and validation.

## 5) Recommended Execution Plan (for Claude Code + Context7)

### Wave 0 - Baseline lock

- Freeze baseline with reproducible logs:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`
  - `pnpm turbo build --filter=@nebutra/landing-page --filter=@nebutra/web --filter=@nebutra/design-docs`

### Wave 1 - Facade hardening (no risky majors)

- Replace all `@nebutra/ui/src/*` imports with public exports.
- Remove Storybook path alias hacks to source internals.
- Ensure required exports exist in `packages/ui/package.json` and `packages/ui/src/index.ts`.

### Wave 2 - Theme unification completion

- Keep `@nebutra/tokens` as runtime source of truth.
- Normalize package CSS selectors to chosen mechanism (class-based currently).
- Remove stale `data-theme` dual-mode fragments where not intentionally needed.
- Keep both dark/light token values.

### Wave 3 - Safe upgrades first (patch/minor)

- Apply patch/minor updates monorepo-wide.
- Rebuild and run typecheck/test after each batch.

### Wave 4 - Major upgrades by coupled sets

Run with Context7 docs verification before touching code:

1. Lobe set: `@lobehub/ui`, `@lobehub/icons`, `antd`, `antd-style`, `motion`.
2. Auth set: `@clerk/nextjs` (+ any middleware/api integration changes).
3. Tooling set: Storybook `8 -> 10`, ESLint `9 -> 10`.

### Wave 5 - Next.js convention cleanup

- Migrate middleware to proxy convention in both apps.
- Keep `cacheComponents: true` (already aligned with Next 16 direction).

## 6) Acceptance Criteria

- `pnpm install --frozen-lockfile --strict-peer-dependencies` passes.
- No `@nebutra/ui/src/*` imports in apps.
- No mixed runtime theme switching mechanism in active app paths.
- `pnpm turbo build --filter=@nebutra/landing-page --filter=@nebutra/web --filter=@nebutra/design-docs` passes.
- No Next deprecation warning for `middleware` convention.

## 7) Copy-Paste Prompt for Claude Code

```text
You are fixing Nebutra-Sailor dependency and architecture debt.

Hard constraints:
- Keep light theme support.
- Do not introduce reverse-upgrade shortcuts (do not disable cacheComponents, do not overuse "use client" as workaround).
- Use one runtime theme mechanism only (current target is class-based .dark via @nebutra/tokens).
- @nebutra/ui must be a stable facade; remove all @nebutra/ui/src/* imports from consumers.
- Do not remove lobe/antd stack unless full equivalent migration is implemented and validated.

Tasks:
1) Harden @nebutra/ui facade and remove Storybook internal source-path imports.
2) Unify theme selectors across packages (remove mixed .dark + [data-theme] runtime usage where unnecessary).
3) Upgrade dependencies in waves:
   - First patch/minor.
   - Then major coupled sets with docs-verified migrations using Context7:
     a) @lobehub/ui + @lobehub/icons + antd + antd-style + motion
     b) @clerk/nextjs
     c) Storybook 8->10 and ESLint 9->10
4) Migrate Next middleware convention to proxy for apps/web and apps/landing-page.

Validation gates:
- pnpm install --frozen-lockfile --strict-peer-dependencies
- pnpm turbo build --filter=@nebutra/landing-page --filter=@nebutra/web --filter=@nebutra/design-docs
- Ensure no @nebutra/ui/src/* imports remain.
```
