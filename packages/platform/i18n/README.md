# @nebutra/i18n

> Internationalization layer for Nebutra apps, built on next-intl with preconfigured routing and locale resolution.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/i18n@workspace:*
```

## Usage

### Routing (client components)

```typescript
import { Link, useRouter, usePathname, redirect } from "@nebutra/i18n/routing";

// Locale-aware Link component
<Link href="/about">About</Link>

// Programmatic navigation
const router = useRouter();
router.push("/dashboard");
```

### Request config (server components)

```typescript
// In your Next.js i18n request config
import i18nConfig from "@nebutra/i18n/request";

export default i18nConfig;
```

### Routing definition

```typescript
import { routing } from "@nebutra/i18n";
// routing.locales → ["en", "zh"]
// routing.defaultLocale → "en"
// routing.localePrefix → "as-needed"
```

## API

| Export | Subpath | Description |
|--------|---------|-------------|
| `routing` | `.` | Routing configuration object (locales, defaultLocale, localePrefix) |
| `Link` | `./routing` | Locale-aware Next.js Link component |
| `useRouter` | `./routing` | Locale-aware router hook |
| `usePathname` | `./routing` | Locale-aware pathname hook |
| `redirect` | `./routing` | Locale-aware redirect function |
| `getRequestConfig` | `./request` | Server-side locale resolution for next-intl |

## Supported Locales

- `en` (English) -- default
- `zh` (Chinese)

## Peer Dependencies

- `next` >= 16.0.7
- `react` >= 18.0.0
