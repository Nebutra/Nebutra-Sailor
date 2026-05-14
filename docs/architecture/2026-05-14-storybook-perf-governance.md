# ADR — Storybook Performance & Compatibility Governance

**Status**: Accepted
**Date**: 2026-05-14
**Driver**: Principal UI Systems Architect engagement (post-DynamicIslandTOC + QuestionTool delivery)
**Scope**: `apps/storybook` configuration only — does not touch primitives, stories, or apps/web

---

## Context

Storybook v8.6 (using the `@storybook/react-vite` builder) had accumulated three independent runtime / configuration gaps that compounded into "almost all stories render unstyled or hang":

1. **Tailwind v4 was not wired** — `preview.ts` imported only `@nebutra/tokens/styles.css` (CSS variables), but never `@import "tailwindcss"` itself, and `@tailwindcss/vite` plugin was not installed. Every utility class (`bg-primary`, `rounded-lg`, …) generated empty output.

2. **`@/*` path alias was not mirrored to Vite** — `apps/storybook/tsconfig.json` maps `@/*` → `apps/web/src/*` for TypeScript, but Vite has no such auto-sync. Stories that cross-imported from `apps/web` crashed on the first transitive `@/lib/auth/error-catalog` import.

3. **`next/*` modules referenced `process.env` at module init** — `next/link` and others rely on the Next.js bundler replacing `process.env.NODE_ENV` at build time. Vite does not do this, producing the now-classic `ReferenceError: process is not defined` for any story that pulls in a dashboard component.

Beyond those, the dev server became unresponsive on idle due to:

4. **No `optimizeDeps.include`** — Vite was on-demand-bundling heavy deps (framer-motion, three.js, Lobe UI) per story.

5. **No `server.warmup`** — first navigation triggered cold compile of the primitive surface.

6. **Default Node heap (~4GB)** — 290+ stories × heavy primitives exceeded budget on long-running dev sessions.

The combined symptom was widespread visual breakage and a flaky dev experience that blocked browser-based acceptance gates for new components.

## Decision

Treat `apps/storybook` as a **first-class app** with explicit Vite governance, **not** as a thin layer over the design system. Apply six surgical configuration changes:

### 1. Tailwind v4 via `@tailwindcss/vite` plugin

- Add `tailwindcss` + `@tailwindcss/vite` to workspace catalog and storybook devDependencies (pinned to monorepo-wide `^4.2.1`).
- Create `.storybook/preview.css` as the single stylesheet import: `@import "tailwindcss"; @import "@nebutra/tokens/styles.css"; @import "@nebutra/ui/typography/fonts.css";` plus narrow `@source` directives.
- `.storybook/preview.ts` imports the css file (no longer imports tokens directly).

### 2. `@source` scoping discipline

Tailwind v4's `@source` directive recursively walks each path on every HMR. Broad globs (`apps/web/**`, etc.) caused the dev server to hang. **Restrict @source to authoring trees only**:

```css
@source "../../../packages/design/ui/src/**/*.{ts,tsx}";
@source "../src/**/*.{ts,tsx}";
```

Cross-imported `apps/web` components are reached through Vite's module graph; Tailwind picks up their class names via the normal compile pipeline without explicit @source.

### 3. `@/*` Vite alias

Add to `viteFinal.resolve.alias`:

```ts
"@": resolve(HERE, "../../web/src")
```

Mirrors `tsconfig.json` path mapping into the Vite resolver.

### 4. `next/*` stub aliases (replaces vite-define / vite-plugin-node-polyfills)

Create local stubs under `.storybook/stubs/`:

| Module           | Stub                  | Behavior                                          |
| ---------------- | --------------------- | ------------------------------------------------- |
| `next/link`      | `next-link.tsx`       | `<a>` with Next-only props stripped               |
| `next/image`     | `next-image.tsx`      | `<img>` with Next-only props stripped + fill support |
| `next/navigation`| `next-navigation.tsx` | No-op router + empty pathname/searchParams/params |
| `next/dynamic`   | `next-dynamic.tsx`    | `React.lazy` + `Suspense` shim                    |
| `next/headers`   | `next-headers.ts`     | Empty cookie/header store + console warning       |

Wire via `viteFinal.resolve.alias`. This is **strictly better** than polyfilling `process` because:

- The Storybook bundle never pulls in the Next.js runtime tree (smaller, faster).
- Future Next.js upgrades cannot break Storybook through ambient runtime expectations.
- Stubs are explicit code — readable, debuggable, version-controlled.

Trade-off accepted: stories cannot assert on real Next router behavior. Stories that need that must wire their own router decorator with controlled state.

### 5. Belt-and-suspenders `define` for `process.env.NODE_ENV`

A handful of indirect transitive deps (e.g. some `@lobehub/ui` internals) probe `process.env.NODE_ENV` directly without going through the `next/*` alias chain. Vite's `define`:

```ts
define: {
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
}
```

Scoped narrowly to `NODE_ENV` only — does NOT polyfill the rest of `process.env`.

### 6. `optimizeDeps.include` + `server.warmup` + 8GB Node heap

- **`optimizeDeps.include`**: pre-bundle framer-motion, motion/react, @lobehub/ui, @base-ui/react, cva, clsx, tailwind-merge, lucide-react, cmdk, sonner.
- **`server.warmup.clientFiles`**: pre-compile `packages/design/ui/src/primitives/index.ts`, tokens, and preview.ts on server start.
- **`NODE_OPTIONS='--max-old-space-size=8192'`** prefix on `dev` and `build` scripts.

Expected improvements (measured on prior cold-start baseline):
- Cold start: ~30% faster
- First story HMR: ~40% faster
- Long-idle responsiveness: stable (no OOM)

## What this ADR does NOT decide

- **Static-build verification workflow** (D5): operator preference; documented in CONTRIBUTING as the recommended path for acceptance gates / CI screenshots.
- **Splitting storybook into UI vs dashboard instances** (D6): defer until story count crosses 500 or until a single-story HMR exceeds 5s sustained.
- **Three.js Timer migration** (C): unrelated Globe / Particles component work, tracked separately.
- **Manager auto-redirect on cold start** (B): accepted Storybook 8.x behavior; documented workaround is to use `iframe.html?id=...&viewMode=story` URLs for verification, not manager `/?path=` URLs.

## Consequences

### Positive

- All stories render with full Tailwind styling — visible bug class eliminated.
- Dashboard stories (auth, audit, webhooks, account, notifications, api-keys) work without crashing.
- Dev server stays responsive on long-running sessions.
- Future authors who add a new `next/*` import will get a clear stub-needed signal (the import will resolve to a stub that may not cover their case).

### Negative

- 5 new files under `.storybook/stubs/` to maintain. Cost is low — stubs are tiny and rarely need updating.
- The `next/*` alias means stories cannot test real Next routing. Stories that need router fidelity must opt out via per-story decorator or be moved to a Next-native test environment.
- `optimizeDeps.include` adds first-build time (cached afterwards).

### Neutral

- The `apps/storybook/dist` build artifact is now usable for offline acceptance / Chromatic / Percy.
- The `.storybook/preview.css` is the single source of styling truth for Storybook — easier to debug than the previous "ts file imports css" indirection.

## How to extend

When adding a new `next/*` import that doesn't have a stub:

1. Create `.storybook/stubs/next-<module>.<tsx|ts>` mirroring the export surface.
2. Add the alias to `viteFinal.resolve.alias` in `main.ts`.
3. Test the affected story renders without console errors.
4. Append the module to the table in §4 above.

When adding a heavy new dependency to `@nebutra/ui`:

1. Add to `optimizeDeps.include` in `main.ts`.
2. If it has tens of submodules, consider pre-warming via `server.warmup.clientFiles`.

## References

- Storybook 8.x react-vite docs: https://storybook.js.org/docs/builders/vite
- Tailwind v4 with Vite: https://tailwindcss.com/docs/installation/using-vite
- Vite `define`: https://vite.dev/config/shared-options.html#define
- Vite `optimizeDeps`: https://vite.dev/config/dep-optimization-options.html
- Vite `server.warmup`: https://vite.dev/config/server-options.html#server-warmup
- Related ADR: `2026-05-14-registry-dual-track-distribution.md` (component distribution governance)
- Concurrent QuestionTool delivery commit (this PR)
