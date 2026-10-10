# Web frontend review: app.nebutra.com and the sign-in surfaces

- **Date**: 2026-10-10
- **Scope**: `apps/web` (Next app router, 46 routes; plus the Vite preview app's 7 routes), `apps/auth`, `apps/idp`
- **Method**: same as `2026-10-10-design-site-benchmark.md` — benchmarks first (Vercel, Linear, Resend, Clerk, Raycast, Supabase sign-in at 1440/390 light/dark; dashboard docs screenshots), then every reachable route captured at 1440 and 390 in light and dark (184 Next captures, 28 Vite), then a Playwright pass for document overflow, clipped text, contrast and unlabeled buttons, then a source audit.
- **How it rendered**: `next dev` on the PGlite preview database (`preview-db.mjs`), signed in as the seeded preview admin. Two local-only workarounds were needed and are **not** committed (see "Blockers found while rendering").

## Numbers (before)

| Check | apps/web | apps/auth | apps/idp |
| --- | --- | --- | --- |
| Routes with horizontal scroll at 390 | 0 / 46 | — | — |
| Routes whose content collapsed at 390 (side rail kept beside content) | **14** (every `/settings/*`) | 0 | — |
| Muted text below 4.5:1 | `text-muted-foreground` on the gray-50 canvas measures **4.32:1** on every route that sets secondary copy on the canvas (sidebar badge, page leads, table headers, 50 strings on `/settings/notifications`) | sign-in banner lead + footer, 4.32:1 | — |
| Hardcoded English UI strings (JSX text / label / placeholder heuristic) | **343** in 104 files; 84 of 240 files use translations | 26 in 10 files (incl. idp) | |
| `text-[Npx]` | 90 (43× 11px, 37× 10px, 3× 9px) — allowlisted | 7 | 0 |
| `uppercase` labels | 63 | 2 | 2 |
| `font-mono` | 95 | 5 | 1 |
| `dark:` overrides of semantic tokens | 69 (`dark:text-primary` ×12, `dark:bg-primary/15` ×11, `dark:text-cyan-9` ×7) | 0 | 0 |
| `rounded-[var(--radius-*)]` long form | 349 | 15 | 11 |
| raw `<button>` | 83 (allowlisted 83) | 5 | 3 |
| Raw hex | 20 — all third-party logos except `layout.tsx` themeColor `#0a0a0a` | 13 (logos) | 0 |
| `"use client"` | 168 / 270 tsx (62%); 6 pages are client at the page level | 14 / 27 | 3 / 9 |
| Console errors on load | `/settings/security` 6, `/workspace` 5, `/integrations` 4 | | |

Static counts come from a scratch audit script; the per-guard baselines in `governance.config.json` already hold most of them (arbitraryTypography 116 in web, primitiveReuse 83, titleTooltips 18, hoverMotion 15).

## Ranked defects

1. **Settings collapses on a phone (fixed).** `settings/layout.tsx` put the 176px rail beside the content with `flex gap-8` at every width, leaving ~120px for forms: the account email clipped, descriptions wrapped one word per line, inputs 100px wide. Fourteen routes. Now the rail is a horizontally scrolling strip below `md` (responsive mode: Scroll) and a rail from `md` up; active row uses `neutral-3` so it differs from hover.
2. **Muted secondary ink fails AA on the canvas (route: tokens).** `--muted-foreground` (#717377) is 4.75:1 on white but 4.32:1 on `--background` (#f9fafb). Every lead, table header and helper line that sits on the canvas rather than a card fails. Benchmarks set secondary copy at 7–8:1 (Vercel `#4d4d4d`). Proposed fix in `packages/design/design-tokens/tokens/themes/light.json`: darken muted-foreground one step (~`#63666b`, ≥5.3:1 on gray-50), or move leads to `neutral-11`.
3. **Organization endpoints broken on the Node auth path (route: iam/auth).** `organization()` in `packages/iam/auth/src/providers/better-auth.ts` is mounted with no `schema`; the Prisma adapter looks up `prisma.member`, but the delegate is `bAMember` (and `invitation` → `bAInvitation`). `/api/auth/organization/list` answers 500 ("Model member does not exist"), `getUserOrganizations` returns `[]`, and client code redirects members to `/select-org`. Note `organization` silently resolves to the **legacy** `Organization` model (`public.organizations`), not `better_auth.organization`, so the fix is not just a mapping — decide which org table BA owns first. Only the edge (Kysely) path maps these (`edge-organization-config.ts`).
4. **Hardcoded English across the product (343 strings).** Settings rail, `PageHeader` "Settings / Manage your organization…", sidebar groups and badges (`dashboard-nav.ts`: Product, Admin, Connectors, Match your cofounder, Alpha, Owner), breadcrumbs built from URL segments, `/usage` (23), cofounder deck (16), startup-os chat (14). The owner works in Chinese; these never translate.
5. **Two sign-in implementations.** `apps/web/src/components/auth/*` and `apps/auth/src/components/*` duplicate oauth buttons, WeChat button, split layout, banner, forgot/reset forms (≈2.3k lines each side). Production redirects `app/sign-in` to `auth.nebutra.com`, so the web copy only serves the template — but it drifts (web: "Log in to Nebutra"; auth: its own copy) and violates one-implementation-per-domain.
6. **Sign-in surface vs benchmark.** Form column and ink primary match Vercel. Gaps: "Home" link (top 50) and locale switcher (top 62) misaligned; subtitle "Choose how you want to sign in." when only one method is offered; banner footer is mono uppercase tracked (`© 2026 NEBUTRA`), the cheap-label pattern; banner lead at 4.32:1; the home link carries a component focus outline (`focus-visible:outline-primary`) against the global-ring rule.
7. **Small type and mono labels.** 83 sub-12px sizes and 63 uppercase labels, concentrated in startup-os canvas/chat, referral panel, shortcuts page, webhook deliveries. Same failure the design site had.
8. **`dark:` overrides of semantic tokens (69).** `dark:text-primary`, `dark:bg-primary/15`, `dark:text-cyan-9` re-decide colour per component instead of trusting the token pair; they will be wrong under any Brand Package.
9. **Dead/odd states.** `/admin` silently redirects a non-owner to `/` (no 403 page); `/choose-plan` redirects to `/onboarding`; `/workspace` renders Startup OS with 5 console errors (401/404 from unconfigured services) and no degraded state.
10. **Vite preview app.** `/sign-in` stays reachable while signed in (header shows "Preview Admin · Sign out" above a sign-in form); the card is gray on a white page (inverted surface ladder).
11. **Dockerfile drift.** `apps/web/Dockerfile` runs `pnpm --filter @nebutra/web build` (now Vite) but copies `.next/standalone`; deploys use `build:next` via the workflow, so the Dockerfile is stale.

## Blockers found while rendering (local workarounds, not committed)

- `@nebutra/gateway/app` resolves to `dist/`, which `pnpm dev`'s prebuild does not emit — every embedded-gateway route 500s in `next dev` until `backends/gateway` is built with `tsc`.
- The stale generated Prisma client needed `db:generate`; then defect 3 required a local mapping patch to render settings at all.

## Fixed in this change

- Defect 1 (settings responsive layout). Before/after: `review-web/compare-settings_security-390.png`, `compare-settings_team-390.png`, `compare-settings-390.png` (scratchpad).

## Left open / next

Defects 2 and 3 need routing (tokens, iam/auth). A shrink-only `lint-hardcoded-copy` guard over `apps/{web,auth,idp}` with the 369-string baseline is the next mechanical ratchet; then migrate settings/sidebar copy to `settings.*` / `Sidebar.*` keys. Then sign-in polish (6), the `dark:` overrides (8) and the label/type pass (7).
