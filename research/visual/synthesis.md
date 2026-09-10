# Visual language — cross-competitor synthesis

Sources: `research/visual/{seko,tapnow,flowith,lovart,libtv,fal}.md` (pass-2 reads of the same 310
captures). Questions: `research/visual/BRIEF.md`. Tiers and the A/B/C/EXPERIMENTAL rule:
[ADR 2026-09-08 competitive product cartography](../../docs/architecture/2026-09-08-competitive-product-cartography.md).

**fal has no canvas and no nodes.** For canvas questions the denominator is five, and each section
says which is in use. Hex/L\* values are eyeballed off WebP by the per-product reports, ±5%; the
*deltas* are load-bearing, not the absolutes.

---

## 1. Surface ladder — compressed everywhere, separated three different ways

Levels: Seko 5, TapNow 5, LibTV 5, Lovart 5, Flowith 4 dark / 3 light, fal 2 fills.

| Product | Ground | Δ / step | Carried by |
|---|---|---|---|
| Flowith dark | `#0a0a0b` L\*4 | 3–4 | luminance only, **zero borders** |
| Seko | `#0a0a0a` L\*4 | 2–3 | luminance; borders only on nodes + input wells |
| TapNow | `#080808` L\*3 | 1–3 | **hairline + radius**; luminance does almost no work |
| LibTV | `#0f1010` L\*6 | 4–7 | luminance; borders only on overlays and pills |
| Lovart | `#F5F5F4` L\*96 | ~4 | **shadow + hairline**; overlay and card share a value |
| fal | `#ffffff` L\*100 | **0** | **1px `#e6e6e6` border, exclusively** |

- **A (6/6): the ladder is compressed** — no neighbouring step exceeds ~7 luminance points, and two
  products separate by zero. Nobody uses a dark-page / light-card dashboard jump.
- **A (5/6): shadow is reserved for things that float.** Resting content carries none in Flowith,
  Seko, TapNow, LibTV; fal has no shadow anywhere. Lovart alone shadows a resting artboard — and it
  is also the only product whose work surface is *darker* than its content, so shadow is doing the
  job luminance does in the dark products.
- **A (4/5 canvas): exactly one hairline exists in the product**, at the seam where a persistent
  panel meets the canvas — Seko's agent aside (1px `#1e1e1e`), TapNow's canvas↔agent rule, Lovart's
  canvas↔agent rule, LibTV's agent-drawer left border. Everything else is separated by spacing.
- **Splits, B:** *which* mechanism carries the step — luminance-led (Flowith, Seko, LibTV),
  hairline-led (TapNow, fal), shadow-led (Lovart). The finding is "pick one and use it everywhere".

## 2. Chrome that floats rather than docks — 5/5, not 4/6

| Product | Top level | Rail / dock |
|---|---|---|
| Seko | header has **no border, no shadow**, sits on the page colour | left rail + bottom bar are **detached pills**, `#161616`, radius ~20, inset ~16, overlapping nodes |
| TapNow | **no top bar at all** — three free-floating capsules | left rail ~48px capsule; bottom-left zoom capsule |
| Flowith | transparent onto the canvas (light); one hairline (dark) | **dock pill** 60×175, radius ~18, inset ~16, ambient shadow; composer a floating card ~20px off the bottom |
| LibTV | **no bar** — two clusters of individually rounded ~30px pills, no strip behind them | one bottom **dock pill**, radius-full, ~56px tall, ~340px wide |
| Lovart | top bar has **no fill and no border** | bottom dock capsule radius ~16; minimap, selection toolbar, toasts all float |
| fal | flush hairline bars, rails attached full-height | — (no canvas) |

- **A (5/5): no canvas product has a filled, bordered, full-width top bar.** The identity row is
  absent, transparent, or a set of pills. A bordered strip appears only in fal, a docs/dashboard
  product.
- **A (5/5): the tool rail/dock is a detached rounded island inset from the viewport edge** —
  radius 16 to fully-round, height 44–60, allowed to overlap canvas content (O in Seko).
- **A (4/5): a *persistent* panel is the exception and docks** — agent asides (Seko, TapNow, Lovart)
  and LibTV's agent drawer are opaque, full-height, hairline-separated, and shrink or push the
  canvas; Lovart's layers drawer pushes too.

Two-part rule: **transient tool chrome floats; a persistent panel docks with one hairline.** Nothing
in the set floats a persistent panel, and nothing docks a toolbar.

## 3. Accent budget — the primary action is never the accent

| Product | Count at rest | What they are | Primary action |
|---|---|---|---|
| Flowith | **0** | greyscale canvas | black circle (light) / white circle (dark) |
| Seko | 2 | promo banner, `开通会员` — both commerce | `#3a3a3a` grey circle |
| TapNow | 4 | logo mark, three 4px blue dot badges, blue wash in the composer | **white** circle, black arrow |
| Lovart | 4 | lime promo band, black logo, blue avatar, black button | **black** (`开始`) |
| fal | 6 | purple Run + nav underline + slider, plus 11px green/blue/pink badges | **purple** — see below |
| LibTV | **9** | sync dot, seats, panel toggle, orange 开通会员 + red 限时 badge, avatar + unread dot, 团队 chip, four saturated template tiles | **white** filled circle |

- **A (5/6): the primary action is a neutral fill — black or white, not a hue.** fal is the sole
  exception and a principled one: purple `#7C3AED` marks the one action that *spends money* (Run),
  while near-black carries every merely-important primary (`Open in Sandbox`, `Create`, `Upload`).
  Read with the other five, fal names the rule rather than breaking it: **if one action owns the
  accent, it is the one that costs.**
- **A (6/6): saturated colour is commerce, status or selection — never craft.** No product tints a
  node, canvas, panel or tool with brand colour. Seko says it outright: the brand cyan is "a
  marketing layer painted on top of" a monochrome product.
- **The outlier is smaller than it looks.** LibTV's nine are five commerce/account chips and four
  onboarding tiles. Strip the commerce layer PARA has already declined (`workspace.md` §12) and the
  counts read **0 · 0 · 4 · 2 · ~2 · ~4** — an evidenced budget of **0–4, median 2**.
- **A (3): selection colour is not brand colour.** Flowith's stroke is violet `#7c6cf0` and
  explicitly "not the product's blue"; Lovart's `#1B75FF` is used for nothing else; TapNow's is a
  desaturated `#2f6fd0`. Selection is a functional channel held apart from identity.

## 4. Node treatment at rest — Flowith's austerity is mostly shared

Testing Flowith's four claims (no border, no shadow, no title bar, media bleeding):

- **A (6/6): media bleeds to the edge, clipped by the radius, no inner padding, no frame.** Flowith,
  Seko ("edge to edge with no inset"), TapNow, LibTV ("the node *is* the media"), Lovart, fal
  (template covers). The most unanimous finding in the pass.
- **A (5/6): no shadow on a resting node.** Lovart only.
- **A (6/6): no internal title bar.** Not one product draws chrome inside a node.
- **A (4/5): identity metadata sits outside, above the node.** Seko (12px icon+text pair), TapNow
  (`▣ Video ✓` in ~12px grey), LibTV (~13px caption + 16px glyph), Lovart (blue label chip
  above-left, size readout above-right). **Flowith is the outlier** — a translucent caption strip
  overlaid on the media's bottom edge and an author/timestamp footer inside text nodes. LibTV also
  stamps a 10px `AI生成` chip inside the media corner.
- **Border — B, no rule.** With: Seko (1px `#3a3a3a`), TapNow (1px ~10% white), LibTV (1px light at
  ~60% alpha), fal (1px `#e6e6e6`). Without: Flowith, Lovart. 4/6 draw one, but the two that do not
  have the most confident ladders.
- **A (5/6): radius 8–14 on content.** Lovart alone uses square corners and reserves radius for
  chrome.

Shared floor: **bleeding media, no shadow, no title bar, identity outside the frame.** Border and
radius are the two open choices.

## 5. Selection — a 1px on-bounds stroke plus summoned chrome

- **A (5/5): 1px stroke drawn exactly on the node's own bounds — no offset, no outer ring, no glow,
  no scale, no fill tint.** Flowith (1–1.5px violet), TapNow (1px desaturated blue), LibTV (1px
  near-white), Lovart (1px `#1B75FF`), Seko (border luminance swap `#3a3a3a` → ~`#c8c8c8`, I2).
- **A (5/5): selection is expressed far more by what *appears* than by what is drawn.** Each report
  reaches this independently. Flowith summons a toolbar above (Copy / Delete + a 5-dot colour row)
  and a `Follow Up F` pill below; Seko a 12-item toolbar above and an inspector below; TapNow a pill
  toolbar above, a generation bar below (prompt · 2K · x1 · model · cost · send) and a composer chip;
  LibTV `+` port handles, a `1536 × 2048` readout and a config panel beneath; Lovart a 10-control
  toolbar with every icon labelled.
- **EXPERIMENTAL: corner handles — Lovart alone (1/5).** White fill, blue 1px stroke, centred on the
  corner half in / half out; plus 1px blue dividers between children on multi-select. TapNow states
  the opposite explicitly: "the stroke is the whole affordance."
- **B: a size readout on select — Lovart + LibTV (2/5)**, both above the top-right corner at ~12px.
- **No rule on stroke colour:** two blue, one violet, two near-white.

fal, having no canvas, uses four mutually exclusive mechanisms (underline, fill inversion, checkmark,
focus ring) and never rings an object. It contributes only the negative: a selected *row* is not a
selected *object*.

## 6. Overlay treatment — paper, not glass

- **A (6/6): popovers, menus and floating toolbars are opaque.** Flowith "paper, not glass" (opaque,
  radius 12–16, wide soft shadow, no border); Lovart "one class only: paper" (white, 1px very light
  border, real shadow); fal (white, 1px `#e6e6e6`, radius ~8, tight shadow, "no blur, no
  translucency"); LibTV (solid `#1e1f1f`, 1px `#333`, shadow — "closer to a native menu"); Seko
  ("none of these read as glass"); TapNow ("paper cut from a darker stock").
- **Blur exists in exactly two places, neither a menu:** under a **modal scrim** (Seko ~70% black
  blurred; fal a *lightening* blurred scrim) and on a **drawer** (TapNow History + settings sheet
  read through as glass; LibTV's node-settings scrim is "the only translucent surface in the
  product").
- **`backdrop-filter` on resting chrome: 0/6 — an O-negative across the set.** Glass on a drawer is
  2/6 → **EXPERIMENTAL**.
- **A (6/6): overlay shadow. A: radius converges on ~12** (8–16). **B: border, split 4–2** (Seko-dark,
  LibTV, Lovart, fal with; Flowith, TapNow without).

Warning case: Seko ships **two overlay systems side by side** — near-white paper pickers and dark
bordered command menus — inside one near-black app; its own report calls this its most unusual
decision. Flowith stacks three overlays at one elevation and the report reads it as clutter.

## 7. Type scale, density, icons

- **A (6/6): four or five sizes** (Seko 4, Lovart 4, Flowith 5, TapNow 5, LibTV 5, fal 5).
  **A (5/6): exactly two weights**; fal alone uses three. No bold on the work surface. Caps only in
  TapNow's 11px tracked section heads and fal's badges.
- Body 13–15px; chrome labels 14–15; one display size (20–34) confined to modals, hero lines and
  agent greetings.
- **A (6/6): smaller-than-body (10–12px) is machine facts and scaffolding, never content** —
  dimensions, credit cost, zoom %, timestamps, keyboard accelerators, model-version badges, job
  status. Seko states it: "never for interface labels".
- **A: three control heights.** ~26–30 chip (LibTV config chips 26, TapNow parameter chips 28, LibTV
  pills 30) · ~32–40 control (Seko bottom bar 32, LibTV dock icons 32, Seko control row 36, fal
  buttons 36–40 and inputs 40, Lovart chips 40) · ~44–48 target (Seko rail 44, TapNow rail 44 and
  menu rows 44–48, Lovart dock 44 and menu rows 44, fal nav 48). Bars 44–60; panel padding 16–24;
  toolbar gaps 8–14.
- **A (6/6): outline icons, ~1.5px stroke, 16px beside a 13–15px label, monochrome grey at rest.**
  All six say it in nearly the same words. Filled treatment is reserved for the logo, status dots,
  the active-tool plate and the send affordance.

## 8. Empty and in-flight

- **A-weak (3/5): a faint dot grid marks the canvas** — Seko (`#242424`, 20px pitch), TapNow (~8%
  white), LibTV. Flowith and Lovart use a flat field.
- **B, no rule on furnishing.** Genuinely empty: Flowith (a low-contrast wordmark watermark, nothing
  else), Lovart (one grey sentence and a keycap `C`). Furnished: Seko (headline + instruction + four
  48px quick-start chips, plus three prefilled cards in the aside), LibTV (double-click hint + four
  saturated template cards), TapNow (two ghost node frames). PARA has already chosen via
  `workspace.md` §10.
- **A (5/5): no spinner and no progress bar on an in-flight node.** Seko fills the node with a
  blurred teal→green haze at final dimensions plus 11px centred text; Lovart shows a flat grey
  rectangle with a small dark `生成中` pill; LibTV keeps a grey `#2b2c2c` placeholder and moves the
  spinner into the *config panel's send button*; TapNow leaves the frame void; Flowith shows a plain
  empty fill. Status is a text pill or a chrome change, never a determinate bar.
- **EXPERIMENTAL: an explicit ETA** — Lovart alone (`00:31 / 2分钟`), and a real differentiator.
- Whether any of it animates — **U**. Hover, transition and easing — **U**, six times.

## 9. Light versus dark — not converged; dark-only is a bet

| Product | Ground | Note |
|---|---|---|
| fal | pure light | "not a dark dashboard at all" — the only dark surfaces are a promo bar, one button class, a hero image |
| Lovart | light, warm off-white `#F5F5F4` | "a light product, not a dark dashboard — the single most consequential visual fact in this file" |
| Flowith | **follows the OS** | `settings.default` shows Theme = *System*; canvas captures light, home/library/settings dark — ships both fully |
| LibLib / LibTV | **both, split by surface** | LibTV canvas dark, LibLib art/home site light — "two distinct visual systems under one brand" |
| Seko | dark | — |
| TapNow | dark | — |

Counted honestly: **dark-only 2/6 · light-only 2/6 · both 2/6.** For the canvas surface specifically,
dark is 3/5 (Seko, TapNow, LibTV) against Lovart's light canvas and Flowith's either — so **a dark
canvas is A (3)**, but **a dark-only product with no light path has 2 supporters (B), with 4/6 either
light or shipping both.** Lovart's line carries weight precisely because it was written by an agent
expecting a dark dashboard. A product that hardcodes dark is making a taste bet and should say so
rather than cite the field.
