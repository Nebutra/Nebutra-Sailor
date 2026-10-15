# Web dashboard redesign: from boxed cards to one surface

- **Date**: 2026-10-15
- **Trigger**: owner on `/usage` (zh): "整个页面都是2020审美" — the black icon tile in the empty state.
- **References** (captured under `scratch-verify/benchmark/` in the review worktree, git-ignored): Vercel usage and Observability docs, Linear settings docs, Resend, Clerk dashboard docs, Supabase usage docs, Railway, PlanetScale Insights, Cursor.

## What reads 2026 in the references, and 2020 in ours

| Dimension | References | Ours, before |
| --- | --- | --- |
| Surface | One surface for the working area; sections separated by space and hairlines; a card only where a thing is a thing (a chart panel, a table). | Gray canvas (`bg-muted/40`) with a white card per section and per number. |
| Page header | 30–40px title, tight tracking, lead in a readable secondary ink. | 24px title, 14px muted lead. |
| Metrics | A row of numbers in one hairline panel divided into cells; tabular numerals; mono only for deltas/percentages. | A card per number, `font-bold`, no tabular figures. |
| Empty states | Show the shape of the real content — a ghost chart (Vercel Observability), skeleton rows (PlanetScale, Linear) — with an inline next action. | A filled black icon tile and two centred lines; no action. |
| Sidebar | 14px items, sentence-case group labels, enough destinations that the rail reads as an app. | 13px items, 10px uppercase tracked `PRODUCT`, three items and a tall blank. |
| Settings / billing | Hairline sections, sentence-case labels, no shadows on flat panels. | `radius-3xl` cards with shadows, uppercase eyebrows (`ACTIVE PLAN`, `FOREVER`). |

## What changed

- **AppShell** (`@nebutra/ui/layout`): new `surface="card"` — header and content on the card surface beside the canvas sidebar. The web shell uses it and drops the tinted main; content padding grows to 40px at `md`.
- **SidebarNav**: group labels sentence-case 12px; items 14px. The web nav gains a Workspace group (Usage, Billing, Settings), all through `Sidebar.nav.*`.
- **PageHeader**: 30px title, 8px lead gap, `neutral-11` lead, bottom-aligned actions.
- **EmptyState**: new `preview` prop (`chart | table | list | metrics` or a node) draws `GhostPreview` behind the message with an action slot; the icon tile is a quiet bordered glyph instead of a filled block; the implicit BrandMark for `tone="branded"` is gone (the tile is the subject only when a caller passes one). API unchanged otherwise. New `GhostPreview` primitive with a story.
- **Usage**: Credits / This period / Usage breakdown as sections; metrics in one divided strip with tabular numerals; ghost chart + "Create an API key" action, ghost table, ghost list for credit activity.
- **Billing, settings**: section panels flattened to `rounded-xl border bg-card` (58 files, 94 panels), uppercase eyebrows and shadows removed from the plan cards.

## Second pass (owner approved the direction)

- **Settings.** New `SettingsSection` + `SettingsSectionFooter` in `@nebutra/ui/layout` (story, catalog demo): full-width groups separated by hairline rules, title and description at the top, an action bar at the bottom with a hint on the left. Every settings group in account, general, security, team and the billing plan uses it; `tone="danger"` for delete account / delete organization. The General page's "Delete Organization" button had no handler; it is now the real owner-gated flow (moved from Team).
- **Billing.** The plan is a settings section with a footer action bar; plan names, descriptions, cadences and features come from `copy.billingPlans`; orders use a ghost table when empty.
- **Notifications.** The settings page lost its operator diagnostics (runtime banner, a second English preference matrix, a "settings-side preview" of the inbox): one status line, a channel strip, the real preference matrix. The inbox empty state is a ghost list.
- **Cofounder, integrations, Startup OS, referrals.** Glow blobs and gradient-clipped titles replaced by `PageHeader`; step and capability tiles are hairline strips; empty states use previews; the integrations spinner (which spun through ~7s of retries on a 401) is a skeleton grid with one retry.
- **zh.** No English left in zh views except names (Startup OS, Webhooks, Shopify, OAuth providers) and user data. Data strings moved to keys: usage subtitles, plan names, referral levels, webhook event labels, shortcut list, notification channels, select-workspace journeys, security capability reasons (they used to tell customers to set `NEXT_PUBLIC_AUTH_PASSKEYS=1`), active-session strings (an "inline-bundled" English copy of the catalog). A runtime check flags English text nodes on every zh capture.
- **Bug found on the way.** Cofounder and Startup OS links were built as `/${pathname segment}/…`, which produced `/cofounder/cofounder/discover`; they are plain paths now.
- **EmptyState consumers.** Only the landing VC directory passes an icon (now the quieter bordered tile); para and router pass none. The design site's EmptyState page documents the new `preview` mode (`scratch-verify/captures/consumers/` in the review worktree).

## Left open

- Other EmptyState consumers (landing, router, para, design) inherit the quieter icon tile; they were checked by tests and type only, not captured.
- Admin console pages (`/admin/platform/*`) belong to the admin review and were not restyled here.
