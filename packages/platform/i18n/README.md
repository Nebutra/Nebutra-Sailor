# @nebutra/i18n

Internationalization layer for Nebutra apps: next-intl routing, full product
language wheel, market × language for marketing, and a dual-track locale picker.

## Installation

```bash
pnpm add @nebutra/i18n@workspace:*
```

## Locale picker standard (dual-track)

Both tracks share one solid, header-anchored **`LocalePanel`** shell. Apps never
hand-roll a third language menu.

| Surface | Factory | Locale IDs | Persistence |
|---------|---------|------------|-------------|
| Product (web, auth, forge, router) | `createLocaleSwitcher` | `CANONICAL_LOCALES` (BCP-47) | `NEXT_LOCALE` cookie + `router.refresh()` |
| Marketing (landing) | `createMarketLocalePicker` | Route languages + markets | Language in URL path; market in `NEXT_MARKET` |

See [AGENTS.md](./AGENTS.md) for the full contract (forbidden patterns, deploy
notes, active-locale pinning). Architecture: [docs/i18n/market-locale-architecture.md](../../../docs/i18n/market-locale-architecture.md).

### Product switcher (cookie mode)

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

export const LocaleSwitcher = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    mode: "cookie",
    labels,
    displayLocale: (locale) => defaultCompactTrigger(locale),
  },
);
```

### Marketing picker (market × language)

```tsx
import { createMarketLocalePicker } from "@nebutra/i18n/market-locale-picker";
import { usePathname, useRouter } from "@/i18n/navigation"; // locale-aware

export const MarketLocalePicker = createMarketLocalePicker(
  { useRouter, usePathname },
  { copy: usePickerCopy }, // next-intl "MarketLocalePicker" namespace
);
```

## Routing (client)

```typescript
import { Link, useRouter, usePathname, redirect } from "@nebutra/i18n/routing";

<Link href="/about">About</Link>

const router = useRouter();
router.push("/dashboard");
```

## Request config (server)

```typescript
import i18nConfig from "@nebutra/i18n/request";

export default i18nConfig;
```

Cookie-driven product apps read `NEXT_LOCALE` in request config; the switcher
always writes **canonical BCP-47** so server resolution matches the active pin.

## Locale model

| Concept | Export | Example |
|---------|--------|---------|
| Product language wheel | `PRODUCT_LANGUAGES` | `en`, `ja`, `zh-Hans`, `zh-Hant`, … (~30+) |
| Message / route keys | `SHIPPED_MESSAGE_LOCALES`, `ROUTE_LOCALES` | same as wheel when fully shipped |
| Canonical BCP-47 | `CANONICAL_LOCALES` | `en-US`, `ja-JP`, `zh-Hans-CN`, `zh-Hant-TW` |
| Locale cookie | `LOCALE_COOKIE` / `NEXT_LOCALE` | `en-US` |
| Market cookie | market helpers / `NEXT_MARKET` | marketing only |

Chinese is script-split (`zh-Hans` / `zh-Hant`). Bare `zh` aliases to Hans for
legacy callers via `canonicalizeLocale`.

```typescript
import { routing } from "@nebutra/i18n";
// routing.locales → route/message keys from the product wheel
// routing.defaultLocale → typically "en"
// routing.localePrefix → "as-needed" (see src/routing.ts)
```

## API (selected)

| Export | Subpath | Description |
|--------|---------|-------------|
| `routing` | `.` / `./routing` | Routing config + locale-aware navigation |
| `getRequestConfig` | `./request` | Server locale + message loading |
| `PRODUCT_LANGUAGES` | `./languages` | Global language wheel |
| `CANONICAL_LOCALES` | `./locales` | BCP-47 tags for product cookie apps |
| `createLocaleSwitcher` | `./locale-switcher` | Product language UI factory |
| `createMarketLocalePicker` | `./market-locale-picker` | Marketing market×language factory |
| Market / currency | `./markets`, `./currency`, `./market-locale` | Market resolution SSOT |
| Cookies | `./cookies` | `NEXT_LOCALE` helpers |

`LocalePanel` is an internal module used by both factories — not a public
subpath. Prefer the factories so presentation stays consistent.

## Scripts

```bash
pnpm --filter @nebutra/i18n typecheck
pnpm --filter @nebutra/i18n test
pnpm --filter @nebutra/i18n check:markets
pnpm --filter @nebutra/i18n sync:product-locales
```

## Peer Dependencies

- `next` >= 16.0.7
- `react` / `react-dom` >= 19.0.0
- `@nebutra/icons`, `@nebutra/ui` (workspace)
