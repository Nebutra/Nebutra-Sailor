# Visual language — PARA decision

Last synthesized: 2026-09-09 · Source: `research/visual/synthesis.md`, which cites
`research/visual/{seko,tapnow,flowith,lovart,libtv,fal}.md` — pass-2 reads of the same 310 captures.
Decision rule and evidence tiers: [ADR 2026-09-08 competitive product
cartography](../architecture/2026-09-08-competitive-product-cartography.md).

Scope: **appearance only** — ground, elevation, chrome shape, accent, node and selection rendering, overlay
material, type, density, theme, and which token layer each lands on. Pass 1 settled structure; nothing here
may contradict a tier-A decision in `workspace.md`, `canvas.md` or `selection.md`, and where one is touched
it is named. fal has no canvas: canvas claims count /5.

## Evidence — all from `research/visual/synthesis.md` §1–9, which cites the reports and captures

| Claim | Tier | Supporters |
|---|---|---|
| Compressed ladder ≤7 L\*/step; shadow only on things that float; one hairline, at the persistent-panel seam | A | 6/6 · Flowith, Seko, TapNow, LibTV, fal · Seko, TapNow, Lovart, LibTV |
| No filled bordered top bar; rail/dock a detached inset island; persistent panels dock | A | 5/5 canvas |
| Primary action is a neutral fill | A | Flowith, Seko, TapNow, Lovart, LibTV — fal's purple Run is the principled exception: the accent is the action that costs money |
| Saturated colour = commerce, status or selection, never craft; selection colour ≠ brand colour | A | all 6 · Flowith, Lovart, TapNow. Commerce-free resting budget 0–4, median 2 |
| Node: media bleeds to the edge, no title bar (6/6); no shadow, radius 8–14 (5/6, Lovart excepted); identity outside above the frame (4/5). Node border is **B** (Seko, TapNow, LibTV, fal vs Flowith, Lovart) | A | all six reports |
| 1px on-bounds selection stroke; selection summons chrome rather than restyling | A | 5/5 canvas (corner handles **EXPERIMENTAL**, Lovart only) |
| Overlays opaque paper, shadowed, radius ~12 (border **B**, 4–2); `backdrop-filter` on resting chrome **0/6, O-negative**. 4–5 sizes / 2 weights · small type = machine facts · heights ~28/~36/~44 · outline icons 1.5px | A | all 6 |
| No spinner or progress bar on an in-flight node (5/5); dot grid A-weak (3/5); dark *canvas* A (Seko, TapNow, LibTV) — but a dark-*only* product is **B**: dark-only 2/6 · light 2/6 · both 2/6 | A | Seko, TapNow, LibTV, Lovart, Flowith |

## Pattern

Five of the six are the same product visually. The shared machine: **a near-monochrome low-contrast ground;
content that is nothing but its own media; chrome that floats above the work surface and never frames it;
one hairline where a panel genuinely docks; opaque paper overlays; colour spent only on money, status and
selection.** Two knobs differ — theme, and which mechanism carries elevation.

## PARA decision

### 1. Ground and surface ladder — **A**

Separation is **luminance**, with exactly one hairline and shadow only on floating things — no blur. PARA's
dark tokens already express the converged ladder, so no values change:

| Level | Token | Value (dark) | Δ | Use |
|---|---|---|---|---|
| Canvas ground | `--background` | `222 14% 9%` | — | canvas, page ground |
| Node / card / overlay | `--card` / `--popover` | `222 12% 13%` | +4 | node fills, menus, toolbars, dock |
| Input well | `--muted` | `222 10% 17%` | +4 | textarea, search field, chip fills |

Δ4 sits inside the field's 2–7 band (Flowith 3–4, Seko 2–3, LibTV 4–7). **One hairline** — `--border`, `220
8% 22%` — spent on one seam only, the Library drawer ↔ canvas edge; everywhere else separation is spacing or
luminance. `shadow-ambient-md|lg` appears only on the dock, context toolbar, NodeConfig, agent composer and
popovers, and **`backdrop-filter` is removed from all of them.** Dropping the ground to the field median
(L\*≈4, `222 14% 5%`) is a one-line `--para-ground` override,
**B** (Flowith, Seko, TapNow) — not taken now: it widens ground→node past the observed band unless
`--card` moves too, a token change.

### 2. Docked or floating — **floating, A (5/5)**

PARA renders a 46px `<header>` with `border-b`. That has **zero supporters**: Seko's header has no border
and no shadow, TapNow has no top bar at all, LibTV uses pills, Lovart's has no fill and no border, Flowith's
is transparent; a bordered strip exists only in fal, which has no canvas. **The top row keeps its 44–48px
height and its contents (`workspace.md` §6, tier A — not contradicted) and loses its border and fill.** It
sits on the canvas ground, which renders full-bleed beneath it. That resolves the PRD contradiction
directly: chrome that floats does not subtract from the work surface, so ≤25% is met by a layout that still
shows every control. The dock is already a centred `min(640px,80%)` pill inset 16px from the bottom — the
A-supported form (44–60px inset islands, 5/5) — and stays, minus blur. The Library drawer stays **docked
with one hairline**, pushing the canvas — **A** (all four panel products dock).

### 3. Accent budget — **≤2 at rest; Generate owns the accent**

**The primary action is a neutral fill** — `bg-foreground text-background`, a white circle with a
dark arrow — **A** (Flowith, Seko, TapNow, Lovart, LibTV); this covers the agent composer's send.
**Exactly one action owns `--primary`: `Generate` in NodeConfig, the action that spends credits** —
**B**, on fal's rule read against the other five; no other workspace control carries a saturated
fill, and **selection is not the accent** (**A**, §4). **Status colour lives at 11px only**: the failed node
keeps `--destructive` as text, never a fill or border — **A** (colour confined to small type in all six;
Flowith draws no error colour at all). With no commerce chrome (`workspace.md` §12) PARA rests at **0
saturated elements unselected, 1 with a node selected** — below the field median.

### 4. Node at rest and selection — **A**

At rest **the node is its media**: radius **10px** (`--para-node-radius`, inside the 8–14 band, A 5/6),
media bleeding edge to edge with no inner padding (A 6/6), **no shadow** (A 5/6), **no border** (**B** —
with Flowith and Lovart, the two products whose ladders are most confident; PARA separates by luminance, and
a border on a full-bleed image is redundant), **no title bar** (A 6/6). Node kind and model render as a
~11px grey label **outside, above the frame** — **A** (Seko, TapNow, LibTV, Lovart); Flowith's overlaid
caption strip is not adopted. Selection is **a 1px stroke on the node's own bounds — no offset, no glow, no
scale, no fill tint** — **A** (5/5), coloured `hsl(var(--ring))` (near-white `0 0% 88%`) — **B** (LibTV
near-white, Seko luminance swap), chosen so the accent stays free for Generate. Corner handles and
drag-resize: **EXPERIMENTAL** (Lovart only); a size readout above the top-right corner: **B** (Lovart,
LibTV), M2. Everything else on select is summoned chrome, settled at tier A by `selection.md` §1 and §3.
In-flight: **no progress bar, no spinner** — **A** (5/5); the node holds a placeholder fill, a text pill
(`Generating…` / `Queued · 3`) and the cost readout. An explicit ETA is **EXPERIMENTAL** (Lovart alone), and
the one differentiator on offer.

### 5. Overlays — **opaque paper, A (6/6)**

Popovers, menus, context toolbar, NodeConfig, dock and agent composer are one material: **opaque
`--popover`, radius 12, `shadow-ambient-md` (`-lg` for the composer), one hairline `--border`** — border
tagged **B** (Seko-dark, LibTV, Lovart, fal draw one; Flowith and TapNow do not; a dark opaque panel on a
dark ground needs it). **No translucency, no blur** — 0/6 on resting chrome; blur is permitted on a **modal
scrim only** — **B** (Seko, fal), a rule for later since M1 has no modal. Seko's two-system overlay split
(light pickers, dark menus in one app) is not adopted.

### 6. Type and density — **A**

Four sizes, two weights: **display 20** (modals and empty-state headlines only) · **body 14** ·
**label 12** · **meta 11**; regular + medium, no bold, no caps. Below 11px is removed — **A** (nobody
in the set goes under 9–10, and only for a provenance strip). Meta at 11px is machine facts only:
dimensions, credit cost, zoom %, queue position, timestamps, keyboard hints — **A** (6/6). Three control
heights: **chip 28 · control 36 · target 44** — **A**. Icons outline only, 1.5px, 16px beside a 14px label,
monochrome at rest — **A** (6/6); filled glyphs only for logo, status dots and send. A faint dot grid at ~6%
white on a 20px pitch — **A-weak** (Seko, TapNow, LibTV). Hover is **U** in all six, so PARA's hover ring is
kept but tagged **EXPERIMENTAL**, not claimed as evidence.

### 7. Theme — **dark canvas A (3/5); hardcoded dark-only B, and it is a bet**

`layout.tsx` puts `className="dark"` on `<html>`. **A dark canvas is defensible** (Seko, TapNow, LibTV); **a
dark-only product with no light path is not** — fal and Lovart are light, Flowith follows the OS (`Theme =
System`, both themes shipped in its captures), LibLib runs a light site beside its dark canvas; 4/6 are
either light or ship both. **Keep dark as the default, stop hardcoding it**: replace the literal class with
`ThemeProvider` from `@nebutra/tokens` at `defaultTheme="dark"`, `forcedTheme="dark"` — one reversible line.
Following the system is **EXPERIMENTAL** and needs every `--para-*` value defined for both themes, a light
ladder following Lovart's inversion (ground `#F5F5F4` *darker* than white content, elevation by shadow not
luminance), and a re-picked stroke, since near-white vanishes on a light ground.

### 8. Where this lands on tokens — **shell.css only**

- **`apps/para/src/styles/shell.css` — everything above.** The ladder is a *mapping* onto existing
  tokens, not new values; the rest is geometry (`--para-node-radius: 10px`, `--para-select-w: 1px`,
  `--para-select-color: hsl(var(--ring))`, dot-grid vars, three control heights) beside the existing
  `--para-topbar-h` / `--para-dock-h` / `--para-drawer-w`. Which utility a button reaches for, and
  removing `backdrop-blur`, are code changes, not token changes.
- **Brand Package in `packages/design/theme` — not needed.** A Brand Package is roles + chrome recipe
  + elevation + zones + fonts applied whole; nothing here changes what a role *means* — "the primary
  action is neutral" chooses a utility, it does not redefine `--primary` — and one would export
  PARA's canvas geometry to every app that has no canvas.
- **DTCG source — not touched, deliberately.** No decision needs a new or changed token value; the
  only candidate is a global L\*≈4 ground (§1), which would change `themes/light.json` and
  `themes/dark.json` as a pair and darken every Nebutra app to serve one canvas. Declined — the
  PARA-local override exists if a measurement says otherwise. `styles.css` is generated and never
  edited; `recipe.css` holds cross-brand recipes, not app geometry.

## What this changes in the current shell

**Keep** — the 44–48px top row and its contents (`workspace.md` §6); the dock's floating-pill form,
centred `min(640px,80%)` at `bottom-4` (§9); the Library drawer docked left with one hairline; NodeConfig
under the node and the context toolbar above it (`selection.md` §1, §3); `bg-neutral-3` placeholder fills;
media `object-cover` bleeding to the node edge; `para-rise` / `para-drawer-enter` and their reduced-motion
guard.

**Change**

1. `workspace-top-bar.tsx` — drop `border-border/60 border-b`; the header sits transparent on the
   canvas ground, which renders beneath it. Wordmark `font-semibold` → `font-medium`.
2. `bottom-dock.tsx`, `context-toolbar.tsx`, `node-config.tsx`, `agent-panel.tsx` — remove
   `backdrop-blur-md` and every `/85`, `/90`, `/95` alpha; use opaque `bg-popover`.
3. `selection-frame.tsx` — `ring-2 ring-primary ring-offset-1 ring-offset-background` →
   `ring-1 ring-[hsl(var(--ring))]`, on-bounds, no offset.
4. `media-node.tsx` — delete the `bg-primary` progress bar in `TaskOverlay` (keep status text and
   cost readout); `rounded-md` → `rounded-[var(--para-node-radius)]`; add the ~11px grey identity
   label **outside, above** the frame; the failed node loses `border-destructive/60`, keeping
   destructive as text only.
5. `agent-panel.tsx` — send `bg-primary text-primary-foreground` → `bg-foreground text-background`;
   NodeConfig's Generate keeps `bg-primary`, the only saturated fill in the workspace.
6. Sweeps across `apps/para/src` — `text-[10px]` and the 10px `font-mono` error type go to 11px,
   settling on 20 / 14 / 12 / 11 in regular + medium; `h-6 / h-7 / h-8 / h-9 / h-11` onto 28/36/44.
   `layout.tsx` — `className="dark"` → `ThemeProvider … forcedTheme="dark"`. `shell.css` — add
   `--para-node-radius`, `--para-select-w`, `--para-select-color`, dot-grid vars, control heights.

**Remove** — `backdrop-filter` from all resting chrome (0/6); the determinate progress bar on nodes,
the top-bar bottom border, and `ring-offset` on selection (5/5 against each); sub-11px type.

**Defer** — a darker `--para-ground` (B, needs a measurement); corner handles and drag-resize
(EXPERIMENTAL); the size readout on select (B, M2); an ETA on running nodes (EXPERIMENTAL); system-following
theme (EXPERIMENTAL, needs a full light ladder); modal scrim blur (B, no M1 modal).

## Open questions

- **U · Does the accent belong to Generate or to nothing at all?** Five products reach *zero* accent
  on the work surface; only fal spends hue on an action. Closing: ship Generate neutral to one M2
  cohort and accented to the other; measure misfires and time-to-first-generation.
- **U · Border or no border on a node** — 4–2 in the field, and PARA has chosen with the minority.
  Closing: render both over a light-heavy poster and a dark-heavy render at 25% zoom; if the
  borderless node loses its bounds, adopt the 1px form. The same test settles the overlay hairline.
- **U · Whether the field's L\*≈4 ground matters or is incidental** — PARA's is ~L\*11. Closing: a
  side-by-side at the same node fill; if contrast on generated media is materially better, the
  `--para-ground` override is cheap.
- **U · Everything about motion** — hover, transition, easing, whether an in-flight placeholder
  animates: `U` in all six. Closing: a screen recording of one generation in Seko and Lovart.

## Summary

The single most consequential decision: **PARA's chrome stops framing the work surface.** The top bar loses
its border and its fill and floats on the canvas ground — the one shape all five canvas competitors share,
and the thing that turns a dashboard into a workspace. Second: **`--primary` is demoted to a single job** —
the Generate button, the one action that spends credits. Send becomes white, selection near-white, the
progress bar disappears; PARA drops from three saturated elements at rest to zero, and one on selection.
Third: **glass is removed** — six of six use opaque paper overlays, and `backdrop-filter` on resting chrome
has no supporters anywhere in the set. Concrete changes in `apps/para`: top-bar border removed · blur and
alpha removed from dock, toolbar, NodeConfig and composer · selection ring 1px on-bounds in `--ring`, no
offset · node progress bar deleted · send neutral, Generate accented · node label moved outside the frame ·
type settled at 20/14/12/11 · heights at 28/36/44 · `dark` moved from `<html>` into ThemeProvider.
