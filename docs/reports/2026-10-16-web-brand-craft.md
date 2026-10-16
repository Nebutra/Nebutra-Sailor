# Web brand-craft pass: from clean to funded

- **Date**: 2026-10-16
- **Trigger**: owner on the redesigned dashboard style (as applied to Router): "美术细节还是不行 还是没有a16z被投企业的感觉". The 2026-10-15 redesign fixed structure (one surface, hairlines, metric strips, ghost empty states, `SettingsSection`) and over-corrected into austerity. Rule on record: polish, not austerity — keep the structure, restore craft with real visuals.
- **Scope**: `apps/web` (app.nebutra.com) and the shared sign-in (`@nebutra/auth/sign-in`, used by `apps/auth` and `apps/web`).
- **References** (captured 2x under `scratch-verify/benchmark/`, git-ignored): Linear (app frame, sidebar, issue rows, Insights), Resend (sidebar, metric cards, chart, log header, sign-in), Vercel (usage chart, bar tables), ElevenLabs (sidebar switcher, page header, create cards), Supabase (breadcrumb bar, sign-in), Clerk (sign-in), Raycast (⌘K footer), Cursor (agent list). Perplexity and logged-in Cursor/Vercel sidebars could not be captured.

## The moves, as measured in the references

| Area | What the references do | Ours, before |
| --- | --- | --- |
| Sidebar head | A workspace plate: the mark on a ~20–24px lit plate (hairline + tiny shadow), the name in 500 weight, a plan pill (Resend "Pro"), an up/down chevron; search or compose beside it (Linear). | The full Nebutra wordmark; no workspace, no plan, no search. |
| Sidebar rhythm | Grey 12px group labels ~20px above each group; 28–32px rows; 16px icons a step dimmer than labels; tree guides on nested rows (Linear). | Three groups, six rows, a tall blank rail. |
| Active row | A raised pill one tone above the rail (Linear #1c1d1f on #121415; Resend #1a1a1a; ElevenLabs #f4f3f1), radius 6–8px, no accent bar. | A grey fill the same family as hover. |
| Sidebar foot | Account row with avatar and overflow (Resend). | Account row only. |
| Layered surfaces | The working area is a panel inside the canvas: 1px border, a lighter top edge (Linear #262829 over #121314), a radial floor glow; Resend's cards are lit from above (top edge brighter than sides). | One flat card surface edge to edge, the sidebar ruled off by a border. |
| Metrics | The number is the hero (Resend 36px "29,486", Vercel dot + 24px), unit and delta quieter, tabular figures. | Already a divided strip; no elevation, no trend slot. |
| Charts | One 1.5px line over a low-alpha gradient fill to the floor; one highlighted reference line (Resend, Vercel). | Ghost chart: flat fill, no interaction hinted. |
| Tables / lists | One panel, rows divided by hairlines, a leading glyph or plate, quiet metadata on one line, status dots (Linear, Vercel). | Sessions and linked accounts as a stack of separately bordered boxes; raw user agent and `0000:0000:…` IPs as body text; five ink "Connect" buttons. |
| Empty states | A product glimpse that can be seen (ElevenLabs create cards), one action. | Ghost metrics behind a centred line on Cofounder. |
| Command bar | Search / ⌘K is present in the chrome (Linear, Raycast footer key caps). | ⌘K worked but nothing on screen said so. |
| Sign-in | Split layout as a brand moment (Supabase, Resend): brand line plus something real. | Cyan/blue blob gradients over a dot grid. |

## What changed

### Shared (`@nebutra/ui`, stories for every piece)

- **AppShell** — `surface="inset"`: the working area is a raised panel inside the canvas (hairline, `shadow-glass-sm` = ambient step plus lit top edge), the sidebar border goes away. `ambientLight`: a 7% House-blue radial from the panel's top edge. `mobileBar`: content beside the phone hamburger. Existing `canvas`/`card` unchanged.
- **SidebarNav** — the current row is a raised chip (`bg-card shadow-xs ring-1 ring-inset ring-sidebar-border`) with the ink icon; inactive icons one step dimmer than labels; group labels quieter with a fixed 24px rhythm; nested rows joined by a 1px tree guide.
- **Sidebar chrome** (new, `patterns/sidebar-chrome`) — `SidebarWorkspacePlate` (lit logo plate, name, plan pill, chevron; a menu trigger), `SidebarSearchButton` (field-shaped ⌘K presence with key cap), `SidebarUsageMeter` (plan, one meter that counts used or remaining, one action; warns near the limit), `SidebarLogoPlate`.
- **PageHeader** — `breadcrumbs`, `meta`, `size="section"` (24px, for sub-pages), `divider`; `description` accepts rich text. Old call sites unchanged.
- **MetricStrip / Metric / Sparkline** (new, `layout/metric-strip`) — the strip `/usage` had inline, lifted into the library with an xs shadow, a delta badge, an ink sparkline over a gradient wash, and hairlines drawn as grid gaps so they hold at 2/3/4 columns.
- **EmptyState** — `previewPlacement="beside"`: the preview in its own unmasked column with the message and one action beside it.
- **GhostPreview chart** — gradient area, a dashed crosshair, the dot and the tooltip card it would open.
- **Chart tooltip** — popover surface, `shadow-glass-sm`.
- **Select** — a bare `<SelectValue />` now shows the selected item's label. It rendered the raw value (`owner`, `org:member`, `zh-Hans-CN`) in seven product triggers, in every locale. Test added.

### apps/web

- **Shell** — inset panel with top light; the sidebar head is the workspace plate (org name, plan from the credit ledger, tenant logo or the Nebutra mark) whose menu holds workspace settings, invitations, billing and — with more than one organization — the switcher; a ⌘K search field under it. Groups are Build / Developers / Workspace: API keys, Webhooks and Provider keys are promoted out of Settings (real routes), so the rail reads as an app; the longest-prefix rule keeps exactly one row current. The foot is a plan meter (credits left of the monthly allowance, "Upgrade" on Free) above the account row. Pages enter with one `AnimateIn` fade-up.
- **Settings** — the layout no longer repeats a 30px "Settings" over every child: each page names itself at section size (`SettingsPageHeader`, or `PageHeader size="section"` for pages that had their own header). Sessions and linked accounts are single hairline panels with device plates, status dots, metadata on one line, outline actions.
- **Usage** — `Metric`/`MetricStrip` from the library; the credit balance carries a meter of the allowance; "Manage plan and limits" is the header action; the empty chart's action is the primary.
- **Startup OS home** — the ink blur cloud and the fake gradient-clipped (single-colour) title are gone; House-blue light from above, a lit composer (`shadow-glass-md`, ring-tinted focus edge), hairline chips, the compile outputs as a lit strip with plated icons (Governed runs in House blue). Centring no longer clips the heading on phones.
- **Cofounder** — the card is one lit card with hairline chips (no ink band, no 11px uppercase); the empty state shows the Discover deck (a ghost card on two more) beside the message, with "Compile your company" as the one primary.
- **Connectors** — titled as the sidebar names it; neutral logo plates with the mark's colour, status dot, outline Connect.
- **Billing** — the active plan is a lit card (plated icon, price as a hero, features on a sunken footer row).

### Sign-in (`@nebutra/auth/sign-in`, both apps)

- One `AuthBrandPanel` for both surfaces: the brand line, then the archive story — the rotating boot-log entry (`BootLogCard`) — as the panel's body, then the footer, all inside one viewport-high column so a 1440×900 screen shows the whole story. The cyan blob gradients and dot grid are replaced by a faint House-blue light from the top corner.
- The archive (structure, rotation, card, tests) moved from `apps/auth` into `@nebutra/auth/sign-in/boot-log` and `/boot-log-card` so `apps/web`'s sign-in tells the same story; `scripts/boot-log-add.mjs` points at the new path. A product-glimpse window was tried in the panel and dropped: it crowded the story, which the owner values as the brand moment.

### Bugs fixed on the way

- **Credit balance unavailable everywhere.** `@nebutra/billing` held its tenant-DB getter in a module-level `let`. Next compiles `instrumentation.ts` (which sets it) and each route into separate module graphs, so `/api/billing/credits/summary` always answered 500 and `/usage` said "credit balance is unavailable". The getter lives on `globalThis` now.
- **English in zh on Team** — role names, joined dates (formatter pinned to `"en"`), "1 member", the role-change notice and the select aria label.
- **Card rings clipped** at the content edge by `contain: paint` on `.content-area` (Connectors' right column lost its border); a 4px gutter keeps them inside the paint box.
- Invalid classes `hover:bg-warning/10/70` on the integration actions; three raw buttons there replaced by `Button`.

## Left open

- Final captures are on the type foundation (1c33b3d70); heading-weight overrides were dropped from every file this pass touched.
- `/billing` orders and `/integrations` read the embedded gateway, which answers 401 in the local preview.
- The boot-log card left the scope of the `apps/**`-only guards (arbitrary typography, hover motion) when it moved into `packages/iam/auth`; its allowlist entries were dropped with it.
- The Projects rail section still shows a disabled "No threads" row (`Sidebar.noThreads`, 暂无对话) — a microcopy 禁七 string that predates this pass.
