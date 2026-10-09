# Design foundation consumable without React or Next

- **Status**: Proposed
- **Date**: 2026-10-09
- **Owner**: Tseka Luk
- **Related**: ADR 2026-09-10 frontend constitution, ADR 2026-09-27 Sailor Studio,
  `packages/design/{design-tokens,tokens,fonts,ui}`, `packages/platform/{i18n,analytics}`,
  `apps/kcq/vite.config.mjs`

## Context

KCQ is the first non-React product on Sailor, with Electron and mobile planned. Adopting the
foundation from Vue currently needs:

- `@nebutra/tokens` declares a `react ^19` peer even for CSS-only consumers. Its `styles.css`
  mixes plain variables with Tailwind v4 `@theme inline` and `@layer base`.
- `@nebutra/fonts`, `@nebutra/i18n` and `@nebutra/analytics` peer on Next/React even though their
  core logic is plain TS.
- `@nebutra/ui` is React-only, so `apps/kcq` mounts React islands (`header-surface.vue`,
  `source-connections.tsx`, `profile-page.tsx`) and ships React next to Vue.
- `apps/kcq/vite.config.mjs` resolves `ui/src/primitives/canonical.ts`, `icons/src`,
  `auth/src/browser.ts`, `tokens/styles.css` and a Geist woff2 by filesystem path because no
  export exists.

These are platform gaps, not KCQ bugs. Fixing them in KCQ would fork the foundation.

## Decision

Every foundation layer gets a framework-free entry; React/Next become optional adapters.

| Layer | Framework-free entry | Adapter |
|---|---|---|
| Tokens | `@nebutra/tokens/css` — `:root`/`.dark` variables only; `tokens/tailwind.css` (the `@theme inline` block) and `tokens/base.css` split out; DTCG JSON + ESM values. React peer optional. One build source (Style Dictionary); `styles.css` becomes generated. | `theme-provider.tsx` |
| Fonts | `@nebutra/fonts/css` — plain `@font-face` | `next/font` wrapper |
| i18n | `@nebutra/i18n/core` — negotiation, BCP47, JSON catalogs | React pickers |
| Analytics | `@nebutra/analytics/track` | React hooks |
| Primitives | Zag.js state machines via Ark UI (`@ark-ui/vue` now, `@ark-ui/react` where React apps opt in), styled by one shared CSS file on `[data-scope][data-part]` using the same tokens | `@nebutra/ui` (React) unchanged |
| Shaders | framework-free canvas/WebGPU modules with Canvas2D/static fallback | thin React wrappers |

Ark UI/Zag over Web Components (Lit): one behaviour layer with official Vue and React adapters,
no shadow-DOM theming/SSR/form friction; Lit is the runner-up. Over Reka UI: Reka is Vue-only.
Pin Ark UI (v6 is imminent). Evidence: KLineChartQuant task research `tooling.md` (2026-10-09).

`packages/*` must export every path a product imports; `apps/kcq` filesystem aliases into
`packages/` become a lint failure once the exports exist.

## Consequences

- KCQ drops React (~108 KB br on the live site) once the shared primitives cover header, menu, dialog.
- Existing React apps are unaffected: their entry points stay.
- Order: tokens/css → fonts/css → i18n/core + analytics/track → shared primitives (Ark UI) → shaders.
