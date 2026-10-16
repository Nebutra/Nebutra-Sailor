# Wording audit — licence and positioning (口径)

- **Date**: 2026-10-16
- **Owner**: Tseka Luk
- **Trigger**: owner decisions 2026-10-16 — “全部改成 Apache 2.0 吧 FSL太小气了 不符合我们的远景” and
  “审计全仓口径并更新”.
- **Decision record**: [ADR 2026-10-16 Apache-2.0 relicense](../architecture/2026-10-16-apache-2-relicense.md)

## Method

Every tracked text file (`git ls-files`, excluding `pnpm-lock.yaml` and binaries) was scanned with
the same set of patterns before and after the change. Matches are split three ways:

- **locales** — `apps/landing/messages/*.json` other than `en.json` (refilled by the translation
  workflow, never hand-edited);
- **history** — dated records that are not rewritten: `docs/architecture`, `docs/reports`,
  `docs/plans`, `docs/ops`, `research/`, `CHANGELOG.md`, `.changeset/`, `docs/legal/license-history.md`;
- **live** — everything else: READMEs, the site, the docs site, package metadata, CLI output, code.

A live match is not automatically wrong. After the change the remaining live FSL / `LICENSE-COMMERCIAL`
matches are all of one kind: a sentence saying the licence *used to be* FSL, or a guard that rejects
the old files.

## Licence statements

| Category | Before: all / live | After: all / live | Remaining live matches are |
| --- | --- | --- | --- |
| `FSL` / “Functional Source” / fair source | 552 / 156 | 50 / 25 | “previously FSL-1.1-ALv2” history lines (READMEs, legal docs, ADR), guards that reject FSL text, i18n protected-term lists |
| `LICENSE-COMMERCIAL` references | 53 / 51 | 12 / 7 | the ADR, `commercial-support.md` history note, create-sailor removing the legacy file, the test asserting it is gone |
| “source-available” / 源码公开 | 15 / 11 | 4 / 2 | the ADR explaining the retirement; one unrelated boot-log story |
| `MIT` (as a word) | 1,220 / 590 | 805 / 326 | third-party licences, the forge licence-chooser tool, boot-log stories (MIT the institute), history lines |
| `AGPL` | 244 / 81 | 161 / 59 | dependency deny-lists, AGPL history, the historical licence text |
| “open source” / 开源 | 435 / 320 | 457 / 347 | now true for Sailor itself; additions are the new Apache-2.0 statements |
| `Apache-2.0` / Apache License | 398 / 164 | 893 / 836 | the new licence (81 package LICENSE files account for most) |
| `package.json` `license` fields | 83 MIT · 46 FSL-1.1-ALv2 · 2 `SEE LICENSE IN` · 2 missing | 133 Apache-2.0 | — |
| Package `LICENSE` files | 81 MIT · 1 FSL (root) | 82 Apache-2.0 (root + 81 packages) | `docs/legal/LICENSE-AGPL-3.0-historical.txt` kept as history |
| Root licence files | `LICENSE` (FSL) + `LICENSE-COMMERCIAL.md` | `LICENSE` (Apache-2.0, canonical text) + `NOTICE` | — |
| Non-en landing locales | 386 FSL matches across 33 files | 0 | 1,215 license-bearing keys deleted so the workflow refills them |

### Surfaces changed

- **Repository**: `LICENSE` is the verbatim Apache-2.0 text (md5 `3b83ef96…`, what GitHub's licence
  detector matches), `NOTICE` names 无锡云毓智能科技有限公司 and reserves the trademarks.
  `LICENSE-COMMERCIAL.md` is gone; its paid plans live in
  [`docs/legal/commercial-support.md`](../legal/commercial-support.md) without the competing-use
  waiver.
- **Packages**: all 133 workspace manifests (published or private) say `"license": "Apache-2.0"`;
  all 81 publishable packages ship the Apache-2.0 text. `tests/architecture/release-surface.test.ts`
  now enforces both, plus the root `LICENSE`/`NOTICE`, for every manifest.
- **Scaffold output**: `create-sailor` writes the Apache-2.0 `LICENSE` and a project `NOTICE`, removes
  `LICENSE-COMMERCIAL.md` / `NOTICE.md` / `LICENSE-UPSTREAM-REFERENCE.md` left by older mirrors, marks
  the scaffold as `apache-2.0`, and prints `License: Apache-2.0 — commercial use, closed source, no fee.`
- **Sailor-Template mirror**: `scripts/template-build.ts` no longer synthesises an AGPL/FSL `NOTICE.md`;
  it ships the source repo's `LICENSE` + `NOTICE` and refuses to push if either is missing or the
  licence is not Apache-2.0. Per-package mirrors (`sync-subrepo-mirrors.mjs`) copy the same two files
  instead of an inlined MIT text.
- **Policy and CI**: `license-policy.json` project licence is Apache-2.0; `ci.yml` licence check now
  also fails on AGPL-3.0, and `dependency-review.yml` no longer allows GPL/AGPL (both were already
  forbidden by the policy).
- **Copy**: README ×3 + templates ×3, CONTRIBUTING, SECURITY, TRADEMARK, WHITELABEL, BRAND_GUIDELINES,
  DESIGN, AGENTS, `docs/legal/*`, 20 package READMEs, the landing site (licensing page, support-plan
  wizard, pricing, FAQ, terms, about, investors, llms.txt), the docs site (new `licensing` page in
  en/zh; the retired “OPC Free License” callout removed), the `nebutra license` command help.

## Positioning

**Canonical line:** **Skip to production.** — subtitle: “The production layer for agent-built
software: auth, billing for global and China rails, multi-tenancy and an AI gateway in one command,
running locally with zero keys. You own the code.” CN: “给 AI 写出来的产品铺好上线的路：认证、全球 +
中国支付、多租户、AI 网关，一条命令，零密钥本地就能跑。代码归你。” Short form: “Skip to production. The
open-source (Apache-2.0) production layer for agent-built software — auth, global + China billing,
multi-tenancy and an AI gateway in one command.”

Source: the 2026-09-28 owner-approved slogan and subtitle, already shipping as
`aboutProducts.layers.sailor` in `apps/landing/messages/en.json`. The live `/sailor` hero said
“Run your startup on Sailor.” and was replaced.

| Surface | Before | After |
| --- | --- | --- |
| README (×3 + templates) | “Open-Source AI-Native SaaS Platform Baseline” + “enterprise-grade … monorepo architecture” | slogan + subtitle; intro rewritten to the same claim |
| `create-sailor` banner | “The open-source platform for AI-native companies” | “Skip to production.” |
| `create-sailor` npm description / README | “Governed AI-native SaaS scaffolder …” | short form |
| Root `package.json` description | “Enterprise-grade SaaS monorepo for AI-native, multi-tenant platforms” | short form |
| `/sailor` hero, meta, site map | “Run your startup on Sailor.” / “The Startup OS for AI products, source-available” | slogan + subtitle / short form |
| Home, about, investors copy | “source-available Startup OS” | “open-source (Apache-2.0) production layer for agent-built software” |
| Docs site intro + `<meta>` | “governed AI-native SaaS platform baseline”, OPC licence callout | slogan + subtitle |
| Agent instruction files (`AGENTS.md`, `.github/copilot-instructions.md`, `.windsurfrules`, `.kiro`) | “enterprise-grade SaaS monorepo …”, Clerk as auth, a non-existent `packages/ai-sdk` | short form, Better Auth, `packages/ai/agents` |
| GitHub description | “Skip to production. Open-source (Apache-2.0) SaaS starter …” (set earlier today) | short form |

Alternatives seen and not chosen: “Run your startup on Sailor.” (old `/sailor` hero), “The Startup OS
for AI products” (site map, investors), “The open-source SaaS starter for agent-built software …” (the
GitHub description and the growth branch README draft). The last one is the closest; it says
“starter” where the approved subtitle says “production layer”, which is the job the positioning
decision chose to own.

## Other drift

| Category | Before (all / live) | After (all / live) | Notes |
| --- | --- | --- | --- |
| Clerk | 386 / 230 | 376 / 220 | Fixed in agent instruction files. The rest is history, the `apps/sleptons` app (still on Clerk), and docs for code being removed. |
| Stripe | 744 / 645 | 742 / 643 | Mostly code. Creem became the auto-detected card rail in 9ced744cb; the `/api/license` STARTUP checkout still uses Stripe. |
| Supabase | 288 / 241 | 286 / 239 | Mostly code paths and history; GitHub topic `supabase` already removed. |
| Polar / LemonSqueezy | 12 / 6 · 16 / 11 | unchanged | Dated changelog entries and billing code. |
| Vercel as host | 68 / 44 | unchanged | Docs frame Vercel as one optional target; no surface claims it is the host. |
| `--preset=minimal` / `nebutra add` | 34 / 32 | fewer | The README quickstart was rewritten in c4d5c2452; remaining hits are docs and history. |
| Discord badge `000000000000000000` | 18 / 17 | fewer | Removed from the READMEs in c4d5c2452; other hits are package READMEs and history. |
| `541` icons | 105 / 90 | unchanged | True: `packages/design/icons/src/components` holds 541 files. |
| Package counts | 23 / 16 | 23 / 16 | Workspace has 111 `packages/*/*` manifests and 19 apps. The landing FAQ's “104 shared packages” is now 111; changelog entries keep their historical counts. |
| Entity name | EN 110 / CN 47 | EN 28 / CN 54 | The EN name mostly sat in the 81 MIT LICENSE files; NOTICE and copyright lines now lead with 无锡云毓智能科技有限公司. |
| Contact | `sales@`, `licensing@` on licence surfaces | the founder mailbox (`tseka@`) for plans and partnerships | `legal@` kept for legal notices. |
| Microcopy bans | 0 new | 0 new | `lint-microcopy`, `lint-site-claims` pass. |

## Contributors (relicensing authority)

GitHub lists one human contributor to this repository (TsekaLuk, 607 commits) plus
`dependabot[bot]` (9) and `github-actions[bot]` (8). `git shortlog` agrees: two addresses, both the
owner. Sailor-Template is a generated mirror. There are no external human contributors, so the
relicense needs no third-party consent.

## Left for the owner or other branches

- **Stripe in `/api/license`.** The STARTUP support plan still checks out through Stripe
  (`STRIPE_PRICE_ID_STARTUP_LICENSE`). The wizard copy now says “support plan”, but the payment rail
  contradicts the Creem-only ADR.
- **Refund window.** The pricing FAQ keeps a “14-day refund window” for Team support. `commercial-support.md` does not state one.
- **`NEBUTRA_LOCALE=cn`** and Creem-first checkout detection landed in 9ced744cb, so the `create-sailor` README claim is now true.
- **Geist icons upstream licence.** `@nebutra/icons` is now labelled Apache-2.0. The upstream licence
  of the Vercel Geist icon set should be confirmed and recorded in a package NOTICE.
- **Launch drafts** in `~/workspace/notes/nebutra/sailor-launch-2026-10/` still carry FSL/MIT lines
  (about 20); the facts table there is updated.
- **Already published npm versions** stay MIT until the next release; the `.changeset/apache-2-relicense.md`
  changeset bumps all 81 publishable packages.
