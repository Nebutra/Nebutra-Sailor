# i18n convergence — audit and result

- Date: 2026-10-10
- Branch: `feat/i18n-converge` (base `e34809d07`)
- Goal: optimise i18n state management and architecture until the next change stops paying;
  close the gap where recent copy (pricing redesign, KCQ listing, staff/admin, rail nav,
  ColorPicker) read English in the other locales.
- Living rules that came out of this: [docs/i18n/message-catalogs.md](../i18n/message-catalogs.md)

## 1. What was wrong — numbers at `e34809d07`

### Copies counted as translations

The gate (`verify-i18n-keys`) blocked on a missing key, so every new English string was
copied into 33 locale files to pass it. Copies are indistinguishable from translations, so
every report counted them as done. Counted with the new rules (`isEnglishCopy`: equal to
the English, not a proper noun / identifier / number, not model-confirmed):

| Catalog | Strings | English copies across 33 locales | Typical per locale |
| --- | ---: | ---: | --- |
| landing | 2 514 | 43 762 | ~1 430 of 2 514 (57%) in every non-CJK locale; cs/ro/hu ~1 550 |
| forge | 1 731 | 9 396 | 140–340; **cs, ro, hu ~1 515 (88%)** |
| boot-log | 954 | 4 035 | 2–90; **cs, ro, hu 954 (100%)** |
| web (shared) | 919 | 1 326 | 46–85 |
| router | 86 | 0 | — |
| **total** | | **58 519** | |

The landing hot spots were exactly the reported gap: `packageCatalog` 477, `solutionsCatalog`
212, `site` 85, `aboutPages` 78, `productPricing` 76 (the pricing redesign, KCQ wallet/AI
offers), `sitePages` 67 per locale. zh-Hant had 58 English `productPricing` strings.

The old gate reported `criticalIdentical=0` for every locale of every catalog: its
"identical" check covered a hand-picked namespace list and exempted prose through a
225-entry allowlist that included whole marketing sentences.

**cs, ro, hu were never translated at all**: `scripts/i18n-catalogs.mjs` had its own
30-language list that had lost them, while the routes served 34.

### Broken messages

- 4 English messages were invalid ICU (`Repository<T>`, `/<product>/v1/*`,
  `ContentEntry<T>`, `<path>`) — next-intl renders those as their key path in **every**
  language.
- 173 translations would break or mislead at render time: invalid ICU (Swedish
  `{brandName:s`), a plural with no `other` (Polish `billing.pricing.seat`), an invented
  placeholder (Finnish `{productNamein}`), stale literals (28 locales showed "104 packages"
  after English moved to 111), dropped tags.
- Keys read by code that no catalog defined: web `navigation.orgSwitcher.*`,
  `settings.organization.members.*`, `settings.organization.invite.*` (the org switcher and
  members page rendered key paths), forge `runners.regex.note`.

### Mechanisms

| Mechanism | Where | Count |
| --- | --- | ---: |
| next-intl catalogs | landing, web+auth, forge, router (+ boot-log) | 5 catalogs |
| Inline en/zh pairs, `COPY: Record<"en"\|"zh">` tables, `pick()`/`bi()`, `isZhUiLocale`, branches on bare `"zh"` | landing (glyphs, showcases, about pages, roadmap) | 303 in ~50 files |
| | forge (`pickBilingual`, USCC runner tables) | 102 |
| | web, @nebutra/i18n | 3 |
| EN/ZH copy objects | auth phone sign-in | 1 component (zh-Hant got Simplified, ja got English) |
| Per-component English `labels` defaults nobody overrode | @nebutra/ui | 5 contracts + 68 one-off strings in 47 files |

The landing ratchet (`lint-landing-inline-i18n`) reported **73 in 8 files**: it matched
`{ en: "…"` but not a table keyed by language (`en: { … }`), which is how 40 glyph and
showcase components hid.

A branch on bare `"zh"` never fires — route locales are `zh-Hans`/`zh-Hant`. That took
out the **mandatory ICP filing footer** on Chinese routes, and the `zh-CN` number format
in five showcases.

### Locale lists outside the registry

11 hand-kept lists, every one drifted from `PRODUCT_LANGUAGES` (34):

| List | Drift |
| --- | --- |
| `scripts/i18n-catalogs.mjs` GLOBAL_TARGETS | 30 — missing cs, ro, hu |
| translator GLOBAL_TARGETS + LOCALE_NAMES, seeder TARGETS | 33 each, three more copies |
| `apps/landing/i18n.json` (lingo.dev) | 33, a second translation pipeline |
| `product-locales.generated.ts` | derived from file names, read only by its own test |
| web `PATCH /api/account` | **7** — 27 languages could not be saved |
| web profile language select | labels for **7** of 34; the rest rendered blank |
| auth phone sign-in language → country | 7 |
| `@nebutra/i18n` market resolution language → country | 34, duplicating `defaultRegion` |
| glossary post-processor, orphan report | 4-catalog lists, missing boot-log |

### Loading and resolution

Four request configs, four behaviours: landing deep-merged English underneath; forge
deep-merged; router merged **one level** (a partial namespace lost its untranslated keys);
the shared config behind web and auth loaded the locale file **alone** (an untranslated key
rendered as its path). Cookie apps ignored `Accept-Language` entirely.

### Client payload (per page, serialised into the RSC payload)

| Surface | en | ja | hi |
| --- | ---: | ---: | ---: |
| landing, every page | 66.8 KB | 78.9 KB | 126.4 KB |
| forge, every page (whole catalog) | 74.2 KB | 92.8 KB | 131.8 KB |

`legalPages` (34 KB) was in landing's global client set for one reader, the contact form;
`runners` (71 KB) was in Forge's for one route, `/t/[slug]`.

### Translation tooling

SenseNova Token Plan (third-party key) in `i18n-translate-sensenova.mjs` and the workflow,
plus `lingo.dev` via `npx` in landing — two pipelines, neither through Router. The English
seeder ran first in both and wrote the copies above. No stale detection: an edited English
string kept its old translation forever.

## 2. What changed

| Area | Now |
| --- | --- |
| Catalog contract | `en.json` is the source; targets hold translations only; absent = English at runtime. `i18n:sync` enforces it, `i18n:check` gates it. 58 519 copies and 173 broken translations removed. |
| Registry | `PRODUCT_LANGUAGES` everywhere; scripts read it via `scripts/lib/i18n-registry.mjs`; `lint-locale-lists` fails new hand lists. Account route, profile select, phone sign-in and market resolution read the registry. Legacy `zh.json` catalogs and `product-locales.generated.ts` deleted. |
| Loading | `@nebutra/i18n/messages` (`loadMessages`, `pickMessages`) and `createCookieRequestConfig`; every app's request config is one call. |
| Resolution | cookie → `Accept-Language` → English for product apps (`resolveRequestLocale`); URL-only for landing. One cookie, `NEXT_LOCALE`, on the brand domain. |
| Client payload | landing 66.8 → 32.5 KB (en), 126.4 → 52.6 KB (hi); forge non-tool pages 74.2 → 2.7 KB (en), 131.8 → 4.4 KB (hi). |
| Translation | `scripts/i18n-translate.mjs` through **Router**: a 5-minute service token minted from `SERVICE_SECRET` against Router's internal relay (or a Router consume key). Absent + stale keys only; `i18n.lock.json` tracks the English each translation came from. Every leaf ICU-validated before it is written. Workflow: sync → translate → gate → PR, on any `en.json` reaching main. SenseNova, lingo.dev, the seeder, the post-processor and the orphan report are gone. |
| UI library | `UiLabelsProvider` / `useUiLabels` / `DEFAULT_UI_LABELS` in `@nebutra/ui`; a `ui` catalog (`packages/platform/i18n/ui-labels`, zh-Hans hand-written) loaded by `loadUiLabels`, mounted in all five next-intl apps. ColorPicker, DataTable, PromptInputBox, ThemeToggle, GithubInlineDiff and the shared Dialog/Carousel/Breadcrumb/Avatar strings read it. |
| Fixes found on the way | ICP footer, org switcher / members keys, account route, profile labels, phone sign-in copy, 4 invalid English messages, DataTable `{{count}}`. |

### Guards (each probed against a planted violation)

| Guard | Fails on |
| --- | --- |
| `pnpm i18n:check` | invalid ICU in English; English copies; translations that break (ICU, placeholder/tag set, plural without `other`, stale literal, translated brand term); dead keys; stray or missing locale files. `tests/architecture/i18n-contract.test.ts` runs each rule on a bad fixture catalog. |
| `lint-i18n-keys` | a static `t("key")` its catalog does not define |
| `lint-inline-i18n` | new inline two-language copy, in 7 surfaces, including keyed tables and bare-`"zh"` branches |
| `lint-locale-lists` | a language list outside `@nebutra/i18n` |
| `lint-ui-hardcoded-labels` | new hard-coded English in `@nebutra/ui` |

## 3. Coverage after (translated / translatable strings, average over 33 locales)

Before the first Router run. This is the honest number the copies used to hide.

| Catalog | Average | Lowest |
| --- | ---: | --- |
| landing | 47% | cs, ro, hu 39% |
| web | 91% | pt, it, nl 90% |
| forge | 84% | cs, ro, hu 14% |
| boot-log | 87% | cs, ro, hu 0% |
| router | 100% | — |
| ui | 3% | zh-Hans only |

Everything absent renders English today, exactly as the copies did — minus the broken ones.
The first workflow run fills it.

## 4. Left on purpose

| Item | Why |
| --- | --- |
| KCQ (Vue fork) en/zh public pages; Chinese-only Para and Kuanlan | Product scope decided in their own ADRs; not next-intl surfaces. |
| sailor-docs (Fumadocs, en/zh content), blog post UI | Content is authored in two languages; UI follows the content language. |
| Forge tool registry bilingual fields (`pickBilingual`, USCC code tables) | Registry design (§6.10); the USCC tables are the GB 32100 categories, authoritative in Chinese. Counted by the ratchet, not migrated. |
| 68 one-off English defaults in @nebutra/ui | Ratcheted; each needs a section in `DEFAULT_UI_LABELS`. Migrate on touch. |
| apps/web client payload (whole 40 KB shared catalog) | Authenticated, cached, and five components read the root namespace; the pruning risk outweighs the bytes. |
| CJK font subset manifest still lists the deleted `zh.json` | Regenerate with `pnpm --filter @nebutra/fonts subset:cjk` after the first translation run adds new Chinese text. |
