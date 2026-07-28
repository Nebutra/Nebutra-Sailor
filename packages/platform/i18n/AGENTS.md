# AGENTS.md — packages/i18n

Execution contract for Nebutra's shared internationalization package.

## Scope

Applies to everything under `packages/platform/i18n/`.

This package owns:

- Shared locale routing and request-time message loading for apps using `next-intl`
- The global language wheel (`PRODUCT_LANGUAGES`) and canonical BCP-47 tags
- Market × language resolution for marketing surfaces
- The **dual-track locale picker UX** (shared panel shell + two business factories)

## Source Of Truth

| Concern | File / export |
|---------|----------------|
| Public package surface | `package.json`, `src/index.ts` |
| Product language wheel | `src/languages.ts` → `PRODUCT_LANGUAGES` |
| Canonical BCP-47 tags | `src/locales.ts` → `CANONICAL_LOCALES` |
| Locale cookie name | `src/cookies.ts` → `NEXT_LOCALE` (`LOCALE_COOKIE`) |
| Routing helpers | `src/routing.ts` |
| Request-time locale + messages | `src/request.ts` |
| Message catalogs | `locales/*.json` |
| Shared panel shell (internal) | `src/locale-panel.tsx` → `LocalePanel` |
| Product language switcher | `./locale-switcher` → `createLocaleSwitcher` |
| Marketing market×language picker | `./market-locale-picker` → `createMarketLocalePicker` |
| Market / currency / negotiate | `src/markets.ts`, `src/currency.ts`, `src/market-locale.ts` |

## Locale Picker UX Standard (dual-track)

**Do not hand-roll a third language menu.** Apps wrap one of the two factories
and share presentation via `LocalePanel`.

```
┌─────────────────────────────────────────────────────────────┐
│  LocalePanel  (shared shell — solid bg, header-anchored,     │
│               search, no DS Popover portal / glass bleed)    │
└──────────────────────┬──────────────────────┬───────────────┘
                       │                      │
         ┌─────────────▼──────────┐  ┌────────▼────────────────┐
         │ createLocaleSwitcher   │  │ createMarketLocalePicker │
         │ Product shells         │  │ Marketing (landing)      │
         │ Language only          │  │ Market × language        │
         └────────────────────────┘  └─────────────────────────┘
```

### Track A — Product shells → `createLocaleSwitcher`

**Use for:** `apps/web`, `apps/auth`, `apps/forge`, `apps/router`, and any
authenticated / cookie-driven product chrome.

| Rule | Detail |
|------|--------|
| Import | `@nebutra/i18n/locale-switcher` + `@nebutra/i18n/locales` |
| Locale list | **`CANONICAL_LOCALES`** (BCP-47: `en-US`, `zh-Hans-CN`, …) — never a 7-locale stub |
| Labels | `buildCanonicalLocaleLabels(CANONICAL_LOCALES)` endonyms |
| Mode | **`mode: "cookie"`** — writes `NEXT_LOCALE`, then `router.refresh()` |
| Active pin | Factory normalizes `useLocale()` into the same ID space as `locales` (message key ↔ BCP-47). Do not compare raw strings across spaces. |
| Trigger | Compact code via `defaultCompactTrigger` (e.g. `EN`, `JA`) |

Canonical app pattern (auth / web):

```tsx
import {
  buildCanonicalLocaleLabels,
  createLocaleSwitcher,
  defaultCompactTrigger,
} from "@nebutra/i18n/locale-switcher";
import { CANONICAL_LOCALES, type CanonicalLocale } from "@nebutra/i18n/locales";
import { usePathname, useRouter } from "next/navigation";

const labels = buildCanonicalLocaleLabels(CANONICAL_LOCALES) as Record<
  CanonicalLocale,
  string
>;

const Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    mode: "cookie",
    labels,
    displayLocale: (locale) => defaultCompactTrigger(locale),
  },
);
```

`mode: "path"` is reserved for path-locale product shells that already own
`router.replace(pathname, { locale })` — still use this factory, not a custom menu.

### Track B — Marketing → `createMarketLocalePicker` / `MarketLocalePicker`

**Use for:** `apps/landing` (and future public market-aware surfaces).

| Rule | Detail |
|------|--------|
| Import | `@nebutra/i18n/market-locale-picker` |
| Business model | URL = language path; market = `NEXT_MARKET` cookie |
| Trigger shape | `ja-jp · 日本語 · Japan` (Hirona-style) |
| Copy | next-intl namespace `MarketLocalePicker` via factory `copy` hook |
| Navigation | App passes `useRouter` / `usePathname` from **locale-aware** navigation |

Landing thin wrapper:

```tsx
import { createMarketLocalePicker } from "@nebutra/i18n/market-locale-picker";
import { usePathname, useRouter } from "@/i18n/navigation";

export const MarketLocalePicker = createMarketLocalePicker(
  { useRouter, usePathname },
  { copy: usePickerCopy },
);
```

### Shared shell rules (`LocalePanel`)

- **Solid background** (`hsl(var(--background))` with opaque fallback) — never
  translucent `bg-popover/95` + blur over hero / form chrome.
- **Header-anchored** (`position: absolute` under the trigger) — do not portal
  to `<body>` (DS Popover did; that caused stacking and scroll bleed).
- **Search** owned by the panel; **row filtering and empty state** owned by the
  business factory (language-only vs market×language have different shapes).
- Active language is **pinned** at the top of the list when present.
- Apps must not reimplement this shell. If UX is wrong, fix `locale-panel.tsx`
  once so all consumers benefit.

### Forbidden

```tsx
// ❌ Hand-rolled Popover / Dropdown language list
// ❌ PRODUCT_LANGUAGES as active-id without canonicalize when locales are BCP-47
// ❌ Hardcoded 2–7 locale maps when the product ships the full wheel
// ❌ Glass / portal menus that bleed the page behind the list
// ❌ Copying landing's MarketLocalePicker into auth "because it looks better"
//    — use createLocaleSwitcher + cookie mode instead
```

### Deploy note

Shared shell changes (`locale-panel`, `locale-switcher`, cookies, `CANONICAL_*`)
affect every product app that imports the factory. When shipping UX fixes for
auth/forge/router, **redeploy those apps together** (ECS multi-app or Vercel
consumers of the same package version). Landing is independent for market
picker business logic but shares `LocalePanel`.

## Contract Boundaries

- Treat `src/routing.ts` as the canonical source for supported route locales,
  `defaultLocale`, locale-prefix behavior, and generated navigation helpers. Do
  not redefine locale lists in consumers.
- Treat `src/request.ts` as the canonical request-side fallback and dynamic
  message-loading behavior. Cookie mode depends on `NEXT_LOCALE` matching
  canonicalized BCP-47 values written by the switcher.
- Treat `locales/*.json` as the checked-in source for shared messages. Do not
  hand-edit compiled message output or duplicate messages into app code when the
  package catalog should change instead.
- Keep product-specific marketing copy in next-intl message catalogs (app or
  package), not in new TypeScript branching.
- Preserve export compatibility for `./request`, `./routing`,
  `./locale-switcher`, and `./market-locale-picker`.
- `LocalePanel` is intentionally **not** a public subpath export; both factories
  own the presentation contract.

## Generated And Derived Files

- `src/product-locales.generated.ts` — from `pnpm --filter @nebutra/i18n sync:product-locales`
- Compiled app bundles that inline locale messages are derived from
  `locales/*.json`, `src/request.ts`, and `src/routing.ts`.
- Compiler caches and temporary build artifacts are derived files.

## Validation

- Routing, request, switcher, or export changes:
  `pnpm --filter @nebutra/i18n typecheck`
  `pnpm --filter @nebutra/i18n test`
- If package linting matters for touched files:
  `pnpm --filter @nebutra/i18n lint`
- Market table integrity:
  `pnpm --filter @nebutra/i18n check:markets`

## Related docs

- Architecture narrative: `docs/i18n/market-locale-architecture.md`
- Package overview / usage: `packages/platform/i18n/README.md`
