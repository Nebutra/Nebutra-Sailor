# Market × Language i18n (Hirona-style) + dual-track pickers

## Strategy B (marketing)

| Layer | Where it lives | Notes |
|-------|----------------|-------|
| URL language | Path prefix / next-intl routing | e.g. `/ja/...` |
| Market | `NEXT_MARKET` cookie | Region / storefront, not in path |
| Trigger label | `ja-jp · 日本語 · Japan` | Compact code · endonym · market name |

SSOT in `@nebutra/i18n`:

- Languages: `PRODUCT_LANGUAGES` (`src/languages.ts`)
- Markets: `src/markets.ts`
- Composition: `src/market-locale.ts`
- UI factory: `createMarketLocalePicker` (`src/market-locale-picker.tsx`)
- Currency / request helpers: `src/currency.ts`, `src/resolve-market-request.ts`

**Landing** Navbar uses the thin app wrapper around `createMarketLocalePicker`
(`apps/landing/src/components/ui/market-locale-picker.tsx`).

---

## Dual-track locale picker (product + marketing)

Nebutra ships **two business models** on **one presentation shell**. This is
the standard — not a temporary fix.

```
LocalePanel (shared shell)
├── createLocaleSwitcher        → product shells (language only)
└── createMarketLocalePicker    → marketing (market × language)
```

### Why not one component for everything?

| Concern | Marketing | Product (auth, web, forge, router) |
|---------|-----------|--------------------------------------|
| Primary axis | Market + language | Language only |
| URL | Language in path | Usually no locale segment |
| Persistence | Path + `NEXT_MARKET` | `NEXT_LOCALE` cookie + refresh |
| Locale ID space | Message / route keys | Canonical BCP-47 (`CANONICAL_LOCALES`) |
| Router | Locale-aware next-intl nav | App `next/navigation` (or path mode) |

Forcing auth onto the market picker would invent fake markets and break cookie
request config. Forcing landing onto a language-only cookie switcher would
drop market selection. Sharing only the **panel chrome** avoids both mistakes.

### Shared shell: `LocalePanel`

Deliberately **not** the design-system Popover:

- Popover uses translucent `bg-popover/95` + backdrop-blur → hero/form content
  bleeds through a dense language list.
- Popover portals to `<body>` → wrong stacking and scroll context vs the header.
- `LocalePanel` is absolutely positioned under the trigger, solid
  `hsl(var(--background))`, search field, Escape/outside-click close.

Both factories pin the active row and own their own filter/empty-state logic.

### Product track: `createLocaleSwitcher`

- **Locales:** full wheel via `CANONICAL_LOCALES` (not a 2–7 language stub).
- **Labels:** endonyms from `buildCanonicalLocaleLabels`.
- **Mode `"cookie"`:** write canonical BCP-47 to `NEXT_LOCALE`, `router.refresh()`.
- **Mode `"path"`:** `router.replace(pathname, { locale })` for path-locale apps.
- **Active match:** normalizes `useLocale()` across message keys and BCP-47 so
  the pin does not fail when next-intl reports `ja` while the list is `ja-JP`.

Reference wrappers: `apps/web`, `apps/auth`, `apps/forge`, `apps/router`
`src/**/locale-switcher.tsx`.

### Marketing track: `createMarketLocalePicker`

- Language path navigation via app-supplied locale-aware hooks.
- Market list + planned markets from package market tables.
- Copy from next-intl `MarketLocalePicker` namespace.

### Agent / contributor rules

1. New product chrome → `createLocaleSwitcher` + `CANONICAL_LOCALES` + cookie mode.
2. New public market surface → `createMarketLocalePicker`.
3. Do not hand-roll a third menu (Popover list, Select of languages, etc.).
4. Fix shell bugs in `locale-panel.tsx` once; redeploy all product consumers of
   the package when shipping shared UX fixes.
5. Package contract: `packages/platform/i18n/AGENTS.md`.

---

## Related

- Package README: `packages/platform/i18n/README.md`
- Cookie helper: `LOCALE_COOKIE` = `NEXT_LOCALE` in `packages/platform/i18n/src/cookies.ts`
