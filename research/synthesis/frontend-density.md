# Frontend density — persistent panels, primary buttons, tabs, chrome ratio

Sources: each `research/competitors/<slug>/ux/density.yaml` (approximate area ratios at the captured viewport; Seko,
Flowith, LibTV, fal at 1440×900 — O; TapNow and Lovart measured at 1040×797 — O for pixel widths, I2 for ratios).
PARA target from `.trellis/tasks/09-08-para-frontend-shell/prd.md` AC-01: chrome ≤ ~25 % on first paint.

## Evidence

### Production surface (canvas / flow / playground)

| | Persistent panels at rest | Chrome % (default state) | Chrome % (agent/side closed) | Primary buttons visible, idle | Primary after select | Tabs on the surface | Tier · evidence |
|---|---|---|---|---|---|---|---|
| **Seko** | header · left rail (4) · bottom toolbar (8) · minimap · **agent aside 33 %** | **0.42** | 0.12 | 3 (+ rail, agent send, share) | 2 (inspector send; toolbar has no highlighted primary; 12 toolbar items) | 画布 · 编辑器 (2); inspector 4 mode tabs | O · `seko/evidence/canvas.blank.webp`, `canvas.node.image-completed.webp` |
| **TapNow** | header-left ~230 px · header-centre · dock rail 48 px · bottom-left controls · **agent panel ~33 %** | **0.42** (I2) | ≈0.10 (I2) | 1 (Send) | +1 (Generate) | 0 | O/I2 · `tapnow/evidence/canvas.default.webp`, `canvas.node.image.generated-selected.webp` |
| **Flowith** | title bar 60 px · left dock pill 60 px · **bottom composer 60 px collapsed** (~180 with tokens) · credit badge | **0.12** | 0.05 (minimized) | 1 (Send) | +Run inside Vary | 0 | O · `flowith/evidence/canvas.welcome.default.webp`, `canvas.welcome.minimized.webp` |
| **Lovart** | promo banner 48 px · top bar 48 px · bottom dock (10, 44 px) · bottom-left cluster (4 + zoom) · minimap 200×120 · **agent panel 400 px ≈ 38 %** | **0.45** | 0.22 | 1 (send/mic) | +10-control toolbar, 快捷编辑 first | 0 | O · `lovart/evidence/canvas.reset.webp`, `canvas.agent-collapsed.webp` |
| **LibTV** | top bar 48 px · floating dock ~56 px · bottom-left status row · (agent drawer ~420 px optional · 资产管理 optional) | **0.08** | 0.35 with agent drawer | ▶ per node (always) | none (implicit selection) | 工作流 · 故事板 toggle (2) | O · `libtv/evidence/libtv.canvas.workflow-mode.webp`, `libtv.canvas.agent-drawer.webp` |
| **fal** | announcement bar · app nav · model header · tab strip | **0.30** (I2) | – | 1 (Run) | – | Playground · API · Examples · Requests · Analytics (5) | I2 · `fal/evidence/model.schnell.webp` |

### Secondary surfaces

| | Home | List (projects / flows / workspace) | Library-type page | Tier |
|---|---|---|---|---|
| Seko | explore 0.15 (hero 2 modes, 3 feed tabs, 8 category tabs) | my-space 0.15 (3 tabs, 5 filters) | avatar form 0.15 | O |
| TapNow | app-home 0.10 (3 nav tabs) | workspace 0.15 (Private / Team) | – | O (I2 ratios) |
| Flowith | home 0.20 (sidebar 250 px) | flows page | gallery | O |
| Lovart | home 0.12 (rail 60 px, composer 730 px) | projects grid | brand-kit (list col 260 px) | O |
| LibTV | tv-home 0.18 (banner + rail 64/220 + header) | – | art-generator 0.25; read-only viewer 0.05 | O |
| fal | explore hero 0.55 | – | sandbox 0.20 (dock 0.25) | I2 |

### Overlay widths (for calibration)

Left drawers: TapNow ~330 px, Lovart 280 px, Flowith Media History 350 px, LibTV 资产管理 resizable. Right agent
panels: Seko 33 % (~475 px at 1440), TapNow ~470 px, Lovart 400 px, LibTV ~420 px. Modals: Seko 860–960 px, Flowith
search 820×680, knowledge near full-screen. (O)

### Reading the numbers

- With the **agent panel open**, every product that has one sits at **0.35–0.45** chrome (Seko 0.42, TapNow 0.42,
  Lovart 0.45, LibTV 0.35). Three of them open it by default.
- With the agent **closed**, the same products drop to **0.08–0.22** (LibTV 0.08, TapNow ≈0.10, Seko 0.12, Lovart
  0.22); Flowith, which has no panel, is 0.12 / 0.05.
- **Primary buttons at rest**: one (Send/Run) in TapNow, Flowith, Lovart, fal; Seko shows three; LibTV shows one per
  node. After selection, one more (Generate / Run / send) appears — never a row of primaries.
- **Tabs on the work surface**: 0 in TapNow, Flowith, Lovart; 2 in Seko and LibTV (both are view switches over the same
  document); fal's 5 are page tabs of a model entity, not a work surface.
- **Commerce chrome** is persistent in Seko, LibTV, Lovart, Flowith (credits, 开通会员 / 限时折扣 banner, 0 %-credit
  toast) — 4 O; TapNow shows only the Tapies balance; fal a credit pill.

## Pattern

1. The work surface is ≥ 78 % of the viewport in every product **until the agent panel opens**, at which point the
   canvas loses a third of its width. The industry has not solved agent-panel cost; it accepts 0.42.
2. Rest state shows **one** primary action (the composer send). Selection adds exactly one more.
3. Tabs on the work surface are only ever **views of the same document**.
4. Persistent left rails are icon-only (48–64 px) and their panels are drawers that replace or overlay the rail.

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Chrome ≤ ~25 % at first paint | B (+PRD) | achieved by Flowith 0.12, LibTV 0.08, TapNow ≈0.10, Seko 0.12 — **only with the agent closed**; no product achieves it with a right panel open | **B — keep the target**; it is achievable only if the agent is not a persistent right panel. This is the density argument for the bottom-composer placement recorded in `agent-patterns.md`. |
| One primary button at rest (composer send) | A | TapNow, Flowith, Lovart, fal (O) | **A — adopt**: "Ask PARA…" in the dock is the single primary; top-bar `+` is secondary. |
| Selection adds exactly one primary (Generate) | A | TapNow, Seko, Flowith (Vary Run), Lovart (快捷编辑) (O) | **A — adopt.** |
| Zero tabs on the work surface unless they are views of one document | A | TapNow, Flowith, Lovart 0 tabs; Seko, LibTV view tabs (O) | **A — adopt**: the `view=` selector is the only tab-like control (AC-07). |
| Icon-only rail 48–64 px with drawers, or no rail | A | TapNow 48, Flowith 60 pill, Seko 4-icon rail, LibTV floating dock (O) | **A — adopt** the bottom dock form (PRD) — dock vs left rail is EXPERIMENTAL in *position* (Lovart, LibTV bottom; TapNow, Seko, Flowith left), A in *form* (icon-only + drawer). |
| Left drawer 280–330 px | A | TapNow ~330, Lovart 280, Flowith 350 (O) | **A — adopt** 280–320 px (PRD). |
| Right agent panel 400–475 px when open | A | Seko, TapNow, Lovart, LibTV (O) | **A for the width if a panel is ever shown**; PARA's expandable bottom panel should reserve the same area budget (~33 %) so real runs are comparable. |
| Persistent commerce chrome (credits, upsell banner) | A | Seko, LibTV, Lovart, Flowith (O) | **Not adopted** — A-supported pattern, but it is the largest single contributor to chrome in three products and contradicts the PARA thesis; credits belong in the profile menu and the job/cost line (`job-patterns.md`). Recorded as a deliberate departure. |
| Minimap always on | A | Seko, TapNow, Lovart, LibTV (O) | **A — adopt** post-M1, toggleable (Lovart). |
