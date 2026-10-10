# Message catalogs — how copy reaches 34 languages

Last reviewed: 2026-10-10

One path, end to end. The decision record and the numbers behind it are in
[docs/reports/2026-10-10-i18n-convergence-audit.md](../reports/2026-10-10-i18n-convergence-audit.md).

## The contract

| File | Holds |
| --- | --- |
| `<catalog>/en.json` | The only source. Every UI string is written here first. |
| `<catalog>/<locale>.json` | Translations **only**. A key that is not translated is **absent**. |
| `i18n.lock.json` | md5 of each English string as of the last translation pass, and which translations went stale since. Generated. |
| `i18n-confirmed-identical.json` | Keys whose correct translation equals the English (a model said so). Generated. |

An absent key renders the English: every app loads messages through
`loadMessages` in `@nebutra/i18n/messages`, which puts the locale's translations
on top of `en.json`. **Never copy English into another locale file** — the gate
rejects it, because a copy is indistinguishable from a translation and hid
58 000 untranslated strings until 2026-10-10.

Catalogs (registry: `scripts/i18n-catalogs.mjs`):

| id | directory | read by |
| --- | --- | --- |
| landing | `apps/landing/messages` | apps/landing |
| web | `packages/platform/i18n/locales` | apps/web, apps/auth |
| forge | `apps/forge/messages` | apps/forge |
| router | `apps/router/messages` | apps/router |
| boot-log | `packages/platform/i18n/boot-log` | auth sign-in archive (zh-Hans hand-authored) |
| ui | `packages/platform/i18n/ui-labels` | `@nebutra/ui` components, via `<UiLabelsProvider>` |

Languages: `PRODUCT_LANGUAGES` in `packages/platform/i18n/src/languages.ts`, and
nowhere else. Scripts read it through `scripts/lib/i18n-registry.mjs`.

## Adding or changing a string

1. Add or edit it in the catalog's `en.json`. Valid ICU: `{name}`,
   `{count, plural, one {…} other {…}}`, `<link>…</link>`; quote literal
   brackets — `Repository'<T>'`.
2. Read it with `getTranslations` / `useTranslations`. `pnpm lint` checks the key
   exists (`lint-i18n-keys`).
3. Do nothing else. On merge to main the **i18n Translate (Router)** workflow
   runs `i18n:sync` (marks translations of edited English stale), translates
   what is absent or stale through Router, gates the result with
   `i18n:check`, and opens `chore/i18n-auto-translate`.

A component in `@nebutra/ui` adds its English to `DEFAULT_UI_LABELS`
(`packages/design/ui/src/primitives/ui-labels.tsx`) and to
`packages/platform/i18n/ui-labels/en.json` (a test keeps them equal), and reads
it with `useUiLabels(section, props.labels)`.

## Commands

| Command | Does |
| --- | --- |
| `pnpm i18n:check` | Gate (CI, pre-push): invalid ICU, English copies, translations that break at render time, dead keys, stray locale files. Prints coverage. `--strict` also blocks untranslated keys. |
| `pnpm i18n:sync` | Fixes everything the gate can fix mechanically and advances `i18n.lock.json`. Offline. |
| `pnpm i18n:translate` | sync + translate via Router. Needs `SERVICE_SECRET` (service token against Router's internal relay) or `ROUTER_API_KEY` (a Router consume key against `/v1`). `--catalog`, `--locale`, `--max-batches`, `--dry-run`. |

Every machine translation is validated before it is written: same ICU
arguments and tags as the English, `other` in every plural, glossary terms
kept, no CJK punctuation outside CJK locales. A leaf that fails stays absent.

## Locale resolution

| Surface | Locale comes from | Persisted in |
| --- | --- | --- |
| landing | URL path (`/ja/pricing`); never a cookie | the URL |
| web, auth, forge, router | `NEXT_LOCALE` cookie → `Accept-Language` → English (`resolveRequestLocale`) | `NEXT_LOCALE` on the brand cookie domain, written by the switcher |

Both go through `createCookieRequestConfig` / `loadMessages`; an app's
`src/i18n/request.ts` is one call.

## Client payload

`NextIntlClientProvider` serialises its messages into every page. Pass it only
what client components read — `pickMessages(messages, [...])` — and give a
large, page-specific namespace its own provider on that page (landing's
contact form, Forge's tool workspace).

## Guards

| Guard | Fails on |
| --- | --- |
| `pnpm i18n:check` | the contract above |
| `lint-i18n-keys` | a static `t("key")` the catalog does not define |
| `lint-inline-i18n` | new inline two-language copy (`{ en, zh }`, `en: {…}` tables, `pick()`, branches on bare `"zh"`, `pickBilingual`) — shrink-only per file |
| `lint-locale-lists` | four or more language tags hand-listed outside `@nebutra/i18n` |
| `lint-ui-hardcoded-labels` | new hard-coded English labels in `@nebutra/ui` — shrink-only per file |
| `tests/architecture/i18n-contract.test.ts` | each gate rule against a known-bad fixture catalog; registry, loader and provider wiring |

## Out of scope, deliberately

- **KCQ** (Vue, fork product): its own en/zh public locale table per its fork
  ADRs; the authenticated app is Chinese.
- **Para, Kuanlan**: Chinese-only products (`lang="zh-CN"`).
- **sailor-docs**: content authored in en and zh (Fumadocs), static export.
- **Blog**: posts are authored in en or zh; post UI follows the post's language.
- **Forge tool registry** (`packages/ai/forge-runtime`): titles and
  descriptions are bilingual fields by design (§6.10); counted by
  `lint-inline-i18n` through `pickBilingual`, not migrated.
