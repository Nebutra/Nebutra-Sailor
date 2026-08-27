# @nebutra/ui compliance audit — execution plan

Target: `packages/design/ui/src` (the primary component library).
Scope note: build artifacts (`.next`, `storybook-static`, `dist`, `node_modules`, `*.generated.*`) excluded from every search.
Standing rule this plan is written against: 规范是底线、观感是验收 — compliance is the floor, appearance is the acceptance test. No fix below is allowed to land if its effect is "now it complies and looks worse".

---

## 1. Headline

**33 findings.**

| Cut | Count |
|---|---|
| Renders nothing today (invalid CSS, the component silently does not paint) | **2** |
| Complies badly — real rule break, currently renders as intended | **31** |

By severity family:

| Severity | Count |
|---|---|
| `renders-nothing` | 2 |
| `accessibility` (missing keyboard path, missing `type`, dark-mode contrast) | 8 |
| `drift` (token/ramp/preset bypass, look unaffected) | 17 |
| `cosmetic-debt` (bespoke on purpose, low traffic) | 6 |

**The number that matters: 9 findings are good-looking components whose compliance would change the look.**
(`looksGood: true` AND `fixChangesLook: true` — expandable-gallery, interactive-frosted-glass-card, Hero media glow, banner inset ring, Pricing tinted shadow, checkbox-group glyph, choicebox glyph, github-inline-diff, Hero media reveal motion.)

Those 9 are the real work, and **5 of them resolve to a missing capability in the library rather than a defect in the component** (see §4.2). Those 5 are the most valuable output of this audit: they are upgrades to `@nebutra/ui` / the token layer, not cleanups.

21 findings need nobody to look at a screen. 2 need a screenshot because no human has ever seen the correct rendering. 10 need taste.

---

## 2. Batch 1 — mechanical and safe (21 findings)

Every item here has `fixChangesLook: false`. Sweep in one pass, no visual review, no screenshots. Grouped by family so each group is one focused commit.

### 2.1 Status/semantic colour tokens replacing raw Tailwind palette (5)

The `--success-strong` / `--warning-strong` / `--destructive-strong` foregrounds already exist and were tuned to the same visual weight as the `*-600` values they replace (rationale at `packages/design/tokens/styles.css:200-208`). Commit `55c0cddc` migrated `apps/web` onto them; the library was not touched.

| File | Line | Edit |
|---|---|---|
| `primitives/metric-card.tsx` | 156 | `colorClasses`: `bg-emerald-500` → `bg-success`, `bg-amber-500` → `bg-warning`, `bg-red-500` → `bg-error`. The `info: "bg-info"` entry in the same object proves the utilities resolve. Verify the registered name in `tailwind.preset.ts` is `error` and not `destructive` before landing. |
| `primitives/metric-card.tsx` | 73 | `trendColors`: `up: "text-[hsl(var(--success-strong))]"`, `down: "text-[hsl(var(--destructive-strong))]"`. Delete both `dark:` clauses — the tokens carry their own dark definition. |
| `primitives/status-badge.tsx` | 96 | `iconColorClasses`: `text-emerald-600 dark:text-emerald-500` → `text-[hsl(var(--success-strong))]`; red → `text-[hsl(var(--destructive-strong))]`; amber → `text-[hsl(var(--warning-strong))]`; blue → `text-info`. All four `dark:` clauses deleted. |
| `primitives/stepper.tsx` | 196, 219, 232-233, 425 | `slate-300/600/900/100/400/500/200/700` → the `neutral-*` scale (`neutral-4` pending border, `neutral-3` track, `neutral-11`/`neutral-9` text); `border-red-500 bg-red-500` → `border-destructive bg-destructive`. Neutral-scale dark values already approximate the hand-written `dark:` overrides, so they go away with it. |
| `primitives/dialog.stories.tsx` / `primitives/iphone-mockup.stories.tsx` | 38 / 32 | `bg-[color:var(--blue-9)]` and `bg-[var(--blue-9)]` → `bg-primary`. `--blue-9` (#0033FE) is the VI identity lock and must never surface on a component; `--primary` is #254bfa, visually indistinguishable. Stories are teaching code — this is what gets copy-pasted. |

Third repetition of the same success/error text pair across three files (`status-badge`, `kpi-card`, `metric-card`) — the cost is not the pixels, it is that a palette or skin change has to be hunted in three places instead of edited once at the token layer.

### 2.2 Shadow ramp replacing hand-paired shadows (2)

| File | Line | Edit |
|---|---|---|
| `layouts/bento-grid.tsx` | 84, 88-89 | Replace `hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[...rgba(255,255,255,0.03)]` and the `hasPersistentHover` duplicate with `hover:shadow-ambient-sm` / `shadow-ambient-sm`, deleting both `dark:` clauses. `--elevation-ambient-sm` already flips to a light-tinted shadow under `.dark`. Note this pair currently escapes `lint-no-dark-overrides.mjs` because its regex covers `bg\|text\|border\|fill\|stroke\|divide\|ring` but not `shadow`. |
| `primitives/apple-liquid-glass-switcher.tsx` | 59, 103 | fieldset `shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]` → `shadow-glass-md`; active thumb `shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(0,0,0,0.2)]` → `shadow-glass-sm`. `--elevation-glass-sm`'s inset top edge (`inset 0 1px 0 rgb(255 255 255/.5)`) is within a rounding error of the hand-written `.4`, so this is effectively a no-op visually and gains theme-correct ambient values. |

### 2.3 Missing `type="button"` (2)

`framer-motion`'s `motion.button` renders a native `<button>`; an unset `type` defaults to `submit`. Both files have zero `type=` occurrences.

- `navigation/StoryProgress.tsx:61` — section-node button. Inside any `<form>` (settings/onboarding wizard), clicking a node submits the form instead of scrolling.
- `marketing/highlight-card.tsx:190` — CTA button. Metric/highlight cards get dropped into dashboard panels that may sit inside forms.

Purely additive attribute. Zero visual or animation change.

### 2.4 Keyboard operability added to existing mouse handlers (4)

None of these change a pixel; they add the keyboard path next to an already-working click path.

| File | Line | Edit |
|---|---|---|
| `marketing/stagger-testimonials.tsx` | 49 | The only way to advance the deck is clicking a back card, and the a11y lint rules that would have caught it are explicitly `eslint-disable`d rather than satisfied. Add `role="button"`, `tabIndex={0}`, `onKeyDown` firing `handleMove(position)` on Enter/Space, then delete the disable comment. clipPath/transform/rotation/shadow untouched. |
| `marketing/UseCases.tsx` | 113 | `UseCaseTabsNav` is bare `<button onClick>` with no `role="tablist"`/`role="tab"`/`aria-selected`/roving tabindex/arrow keys. Compose `TabsList`/`TabsTrigger` (`primitives/tabs.tsx`) and pass the existing card-style className straight through — the primitive does not dictate the visual. Keep the `m.div layoutId="activeTabBackground"` spring morph as a child of the trigger slot; Tabs' own indicator is CSS-transition based, not spring-physics, so do not swap that part. |
| `marketing/pricing-section.tsx` | 91 | `PricingFrequencyToggle` hand-applies `role="radiogroup"`/`role="radio"`/`aria-checked` but has no `onKeyDown` anywhere — ARIA roles claiming a pattern they do not implement. Compose `RadioGroup`/`RadioGroupItem` and render the `mix-blend-difference` `motion.span layoutId="frequency"` inside each item's slot. Segmented pill + blend-mode text inversion preserved. |
| `marketing/Navbar.tsx` | 262 | Hand-rolled right-side drawer: manual backdrop click-close, hand-written `document.body.style.overflow` scroll lock, no `role="dialog"`, no `aria-modal`, no focus trap, no Escape. Compose `Sheet`/`SheetContent side="right"`/`SheetOverlay` driven by the same `isMobileMenuOpen`. Sheet is token-driven (`--sheet-background`, `--sheet-shadow`, `--sheet-duration`/`--sheet-easing`) so the current surface and slide are reproducible; `m.div` may still wrap `SheetContent` if the entrance timing must match the rest of Navbar. Backdrop/focus/escape/scroll-lock plumbing comes from the primitive. |

### 2.5 Popover primitive replacing hand-rolled dropdown (1)

- `components/changelog-widget.tsx:87` — bell → "What's New" panel with manual open state, manual `mousedown` outside-click listener, manual `keydown` Escape listener, `dropdownRef`. Compose `Popover`/`PopoverTrigger`/`PopoverContent align="end" side="bottom"`. `PopoverContent` portals at `overlayZIndex.popover`, so `z-50`, `w-80`, `rounded-[var(--radius-lg)]`, `shadow-lg` and the gradient header pass through as className/children with no visual change; both document listeners and the ref are deleted.

### 2.6 Motion values pulled from tokens (5)

`AnimateIn` cannot absorb all of these (see §4.2), but the bare numeric literals can stop drifting today.

| File | Line | Edit |
|---|---|---|
| `marketing/Hero.tsx` | 220 | Scroll indicator `m.div` (`opacity 0→1`, `delay: 1`, `duration: 1`) → `<AnimateIn preset="fade" delay={1} duration={1}>`. `AnimateIn` already accepts a `duration` override — pure drop-in, zero visual change. |
| `marketing/UseCases.tsx` | 249 | `duration: 0.3` → `motionDurations.reveal / 1000` from `../tokens/motion`. Value identical today; the literal is what allows silent drift. |
| `marketing/Navbar.tsx` | 266 | `duration: 0.2` → `motionDurations.flow / 1000`. |
| `primitives/agent-plan.tsx` | 293, 316 | `duration: 0.25` / `0.3` → `motionDurations.reveal` / `.flow`. The overshoot ease `[0.34, 1.56, 0.64, 1]` at line 138 stays — see §4.2. |
| `primitives/animate-in.tsx` | 1 | Two independently-maintained public `AnimateIn` implementations exist (`components/animate-in.tsx`, preset table from `@nebutra/brand`, the governance-allowlisted path in `ui-governance.policy.json`; and `primitives/animate-in.tsx`, preset table from `tokens/motion.ts`). `marketing/Hero.tsx` imports the primitives one specifically. Make `primitives/animate-in.tsx` a thin re-export of the `components/` one and repoint callers. Existing presets render identically — this only removes the second source of truth. |

### 2.7 Dead focus-ring suppression (1, spans ~15 files)

- `primitives/button-variants.ts:11`, plus `primitives/base-button-variants.ts:4`, `primitives/toggle-group-variants.ts:19`, `combobox.tsx`'s `comboboxTriggerVariants`, `tokens/components/overlay.ts`'s shared `overlayFocusRingClassName = "outline-none"` (piped into every Dialog/Sheet close button), `theme-toggle.tsx`, `onboarding-checklist.tsx`, and ad-hoc `focus:outline-none` in `marketing/Navbar.tsx` (×4), `marketing/Footer.tsx`, `marketing/UseCases.tsx` (×2).

This is **not** currently a bug and must not be treated as a visual change. The global `:focus-visible` rule in `packages/design/design-tokens/static/base.css` is concatenated into `packages/design/tokens/styles.css` at line 900 — deliberately **outside** any `@layer` block (the `@layer base { … }` above it closes at line 885). Tailwind v4's `@import "tailwindcss"` wraps all generated utilities, including every `outline-none` above, inside the `utilities` layer, and per the Cascade Layers spec unlayered rules beat layered ones regardless of specificity or source order. So the global 0.5-alpha ring still renders on all of these; the component-level suppression is dead code cargo-culted from shadcn/Radix boilerplate that assumes the reset lives inside `@layer base`.

Two edits, neither visual:
1. Delete the dead `outline-none` / `focus-visible:outline-none` utilities from those call sites — they suppress nothing and encode a false assumption.
2. Add a one-line comment above the `:focus-visible` rule in `static/base.css` stating it must stay unlayered on purpose. Today nothing marks that as intentional; it looks like a stray rule sitting outside every other block. A plausible "tidy this file" pass that wraps it in `@layer base` would silently kill keyboard focus indication across the entire library, with no visual warning until someone tabs through the app.

---

## 3. Batch 2 — currently broken, screenshot before merge (2 findings)

Both are `renders-nothing`. Semantic tokens hold bare HSL channel triples (`--border` is `240 5.9% 90%`), so an unwrapped `var(--token)` in a colour slot invalidates the whole declaration and the browser silently discards it. **Fixing these makes something appear that has never rendered in this codebase.** There is no "before" screenshot anywhere that shows the correct state, so each needs a visual check before merge — not to validate a design decision, but because the reviewer's mental model of the component is based on the broken rendering.

### 3.1 `primitives/magic-card.tsx:74` (and `:135`) — MagicCard border glow

```
radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, var(--border) 100%)
```

The two preceding arguments in the same call already wrap correctly (`hsl(var(--primary))`, `hsl(var(--muted-foreground))`) — the last stop does not. Same bug in the reduced-motion fallback at line 135 (`linear-gradient(135deg, …, var(--border) 100%)`). The whole `background` declaration on the border-glow `motion.div` (lines 131-137) is invalid at computed-value time and falls back to `none`; only the flat `bg-border` className underneath shows.

The sibling primitive `warp-background.tsx` documents this exact failure mode verbatim in its `gridColor` JSDoc ("an unwrapped `var(--border)` makes the whole background declaration invalid and the grid does not draw"). `magic-card.tsx` is the instance that comment is warning about.

Edit: `var(--border) 100%` → `hsl(var(--border)) 100%` at both lines.

**What to look at:** render `<MagicCard>` with default props and move the mouse across it. Expect a mouse-tracked gradient border that follows the cursor, fading to the border colour at the gradient edge. Confirm in both light and dark, and confirm the reduced-motion path (`prefers-reduced-motion: reduce`) shows the static 135° gradient border. Capture the moving-cursor state, not a static shot.

### 3.2 `primitives/dynamic-island-toc.tsx:123` (and `:131`) — CircleProgress

`stroke="var(--muted)"` on the track circle and `stroke="var(--foreground)"` on the animated `m.circle`. SVG presentation attributes participate in the cascade as `stroke: var(--muted)`; both tokens are bare channel triples, so both declarations are invalid and `stroke` computes to its initial `none`. Neither the track nor the progress arc draws — the DOM has two `fill="none"` circles and the progress indicator is invisible.

Edit: `stroke="hsl(var(--muted))"` and `stroke="hsl(var(--foreground))"`.

**What to look at:** mount `DynamicIslandToc` on a long scrollable page and scroll from 0 to 100%. Expect a muted track ring with a foreground-coloured arc sweeping to full. Check that the arc's stroke width and cap read correctly against the island surface in both themes — nobody has ever seen this ring, so its sizing has never been visually validated either.

---

## 4. Batch 3 — taste required (10 findings)

These are good-looking components that break a rule because the compliant path was worse, plus three where the current rendering is wrong in dark mode. Each states the compliant path that preserves the look. Where no compliant path preserves the look, the finding is written as a **requirement on the library**, not a fix to the component.

### 4.1 Component-level fixes that change pixels (5)

**`primitives/kpi-card.tsx:36, 48-49` — trend indicator** (`accessibility`)
`text-green-600` / `text-red-600` with no `dark:` variant at all. Swap to `text-[hsl(var(--success-strong))]` / `text-[hsl(var(--destructive-strong))]`. This is a visible change *in dark mode specifically*: today the raw 600-weights render too dark against a dark card because no dark override was ever added. The fix is a contrast correction, not a regression — but the pixels change, so it does not belong in Batch 1. Eyeball the dark-mode card.

**`primitives/expandable-gallery.tsx:195` — collapsed polaroid** (`drift`)
`shadow-[0_20px_50px_rgba(0,0,0,0.15)]`, fixed pure-black, no dark counterpart, on a component that otherwise theme-adapts (`border-background`). Swap to `shadow-ambient-lg` (`0 4px 8px -4px hsl(222 47% 11% / .06), 0 24px 56px -18px hsl(222 47% 11% / .16)`). Offset/blur/opacity are near-identical in light mode, so the light look barely moves; in dark mode the token switches to `rgb(0 0 0 / .5-.6)` against the dark elevation base instead of a flat 0.15 black-on-black that is currently almost invisible. Confirm the dark-mode drop shadow does not now read as too heavy behind the polaroid stack.

**`marketing/Hero.tsx:180` — split-variant media reveal** (`drift`)
Raw `m.div` with `initial={{ opacity: 0, scale: 0.95, y: 20 }}`, `transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}`. The ease array is a hand-copy of `AnimateIn`'s `emerge` preset (`components/animate-in.tsx:15`) but the duration has drifted: `emerge` uses `motionDurationSec.cinematic` = 0.5s, this says 0.8s. The file already imports and uses `AnimateIn` for the copy column at line 94, so the primitive was available and simply not used.
Compliant path: `<AnimateIn preset="scale" delay={0.2}>`, or add the 20px-rise + 0.8s combination as a supported `AnimateIn` variant rather than re-deriving the emerge curve in a consumer. **Needs a human decision first: is 0.8s or the 0.5s token value the intended feel?** Land the answer, not a guess.

**`marketing/Hero.tsx:210` — media placeholder glow** (`cosmetic-debt`)
`shadow-[0_0_80px_rgba(0,0,0,0.1)]`. Every ramp step is a directional drop shadow; nothing reproduces a centred 0-offset 80px blur, so forcing this onto `shadow-ambient-lg` visibly flattens the halo. Lowest-value item here (decorative fallback state, low traffic). If touched at all, hand-write `shadow-[0_0_80px_hsl(var(--foreground)/0.1)]` so it tracks the theme-aware foreground instead of hardcoded black, glow shape unchanged. See also §4.2 requirement R2.

**`marketing/banner.tsx:97` — icon badge inset ring** (`cosmetic-debt`)
`shadow-[inset_0_0_1px_1px_rgba(255,255,255,0.5)]`, a uniform all-around inset highlight. The closest ramp step, `shadow-sheen`, is a directional top-edge highlight (`inset 0 1px 0 …`) — swapping would change an all-around ring to top-only, a visible regression on a small decorative chip. Leave as-is, or at most substitute the token colour: `shadow-[inset_0_0_1px_1px_hsl(var(--background)/0.5)]`. **Not worth a ramp addition for one call site.**

### 4.2 Requirements on the library (5)

These are the audit's primary output. Each is a capability `@nebutra/ui` (or the token layer) does not have, discovered because a component had to break a rule to get a look the library could not express. Fix the library first; the component fixes then become mechanical.

**R1 — Shadow ramp needs brand-tinted glow steps.**
Driver: `primitives/interactive-frosted-glass-card.tsx:55, 63`. `shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_60px_rgba(11,241,195,0.08)]` with a hover escalation and an icon glow at `rgba(11,241,195,0.1)`. `rgba(11,241,195,*)` is `#0BF1C3` decoded to decimal — `--cyan-9` / `--brand-accent`, the VI-locked accent, hand-typed as raw RGB.
No ramp step expresses a brand-tinted glow, so any ramp swap strips the cyan halo that is this card's entire visual identity. Requirement: add `--shadow-glow-accent` (and `--shadow-glow-accent-hover`) to `packages/design/tokens/styles.css`, defined as `0 8px 32px hsl(var(--foreground)/.4), 0 0 60px hsl(var(--brand-accent)/.08)`, then point the component at it. Identical rendered glow; accent finally sourced from the token.
Adjacent, and the reason to design this as a family not a one-off: `marketing/Pricing.tsx:46` uses `shadow-xl shadow-[hsl(var(--primary))]/5` for the popular-plan glow. That one is **not a violation** — it already uses the canonical `hsl(var(--x))` form, and Tailwind v4 resolves opacity modifiers on arbitrary colour functions via `color-mix()` at the browser level, so it renders correctly whatever `--primary`'s channels are. If R1 lands, add a sibling `--shadow-glow-primary` so coloured elevation stops being bespoke anywhere. Do not "fix" Pricing.tsx on its own.

**R2 — Shadow ramp has no symmetric/centred ambient glow.**
Driver: `marketing/Hero.tsx:210` (above). Every current step is directional. Either add a `--shadow-ambient-glow` step (0 offset, wide blur, foreground-tinted) or accept centred glows as a documented exception. One call site today, so this is the lowest-priority requirement — but it is the reason a bespoke shadow exists there, and the shadow ramp was created precisely to remove that class of bespoke value.

**R3 — `AnimateIn` needs a keyed exit-swap mode and an off-canvas slide preset.**
Drivers: `marketing/UseCases.tsx:249` (tab content inside `AnimatePresence mode="wait"`, opacity+y+blur in/out) and `marketing/Navbar.tsx:266` (drawer + backdrop, `x: "100%"`, with hand-managed `useReducedMotion` branching that `AnimateIn` already centralises internally).
Neither can route through `AnimateIn` today: it has no `mode="wait"` keyed swap and no `AnimatePresence`-driven unmount, and no slide-from-edge preset. Forcing either through the current API loses the effect (the tab crossfade, the true off-canvas slide). Requirement: `AnimateIn` gains (a) a keyed/exit variant that wraps `AnimatePresence mode="wait"`, and (b) a `drawer`/`slideX` preset with edge selection. Until then the Batch 1 token substitution (§2.6) is the whole fix, and every new off-canvas panel will keep hand-rolling the same reduced-motion + duration logic.

**R4 — The overshoot/bounce ease is not a token.**
Driver: `primitives/agent-plan.tsx:138`, `transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}`. This is a deliberate playful checkbox-pop feel that no current entry in `easings` provides, so it is legitimately outside `AnimateIn`'s preset set — do not force it through. Requirement: add the curve to `easings` in `tokens/motion.ts` (or `@nebutra/brand`) as a named token so it stops being a bare array embedded in a component file, and so a second component wanting the same feel copies a name instead of four numbers.

**R5 — `@nebutra/icons` has no stroke-weight-matched checkbox glyph.**
Drivers: `primitives/checkbox-group.tsx:107` (bespoke `<path d="M14 7L8.5 12.5L6 10" strokeWidth={2}>` in a 20×20 box, plus a `<line>` for indeterminate) and `primitives/choicebox.tsx:196` (a *second*, different bespoke checkmark: `M5 13l4 4L19 7`, `strokeWidth={3}`, 24×24). Two hand-drawn checkmarks for the same semantic in the same package, and `check.svg` / `minus.svg` already exist in the Geist set.
But Geist's `Check` is fill-based (`fill="currentColor"`, 16×16 viewBox) while both controls are stroke-based and hand-tuned so the tick sits flush inside the checkbox border. A naive `<Check className="h-3 w-3" />` swap renders at a visibly different weight and inset. Requirement: either add a stroke-weight-matched checkbox/indeterminate glyph pair to `@nebutra/icons`, or document a sanctioned exception for checkbox control glyphs — then consolidate both controls onto one source. **Do not swap blind**; a className-only swap is exactly the "complies and looks worse" outcome the standing rule rejects.

### 4.3 The one finding whose resolution is "decide, then document" (1)

**`primitives/github-inline-diff.tsx:296, 347-348`** — `bg-emerald-50/60 dark:bg-emerald-950/20` for add rows, `bg-rose-50/60 dark:bg-rose-950/20` for delete rows, `text-emerald-600` / `text-rose-600` gutter markers.
This is genuine success/error semantics (added vs removed line), unlike `folder.tsx`, which carries an explicit documented exception for categorical non-brand colours. Two acceptable outcomes, and the audit deliberately does not pick one:
- Keep the palette and add the same kind of documented-exception comment `folder.tsx` has, on the grounds that diff green/red is a platform convention users read from GitHub, not a product status colour.
- Migrate to `bg-success/10` / `bg-destructive/10` row tint and `text-success-strong` / `text-destructive-strong` markers.
GitHub's diff hues are close to this repo's success/destructive, but emerald/rose read visibly cooler/warmer. This is a look change requiring a human eye, not an invisible token swap. What is *not* acceptable is leaving it undocumented and unmigrated, which is the current state.

---

## 5. Rules that need an automated check

Ranked by how many findings in this audit each documented-only rule let through. Every rule below is in the enforcement ground truth's `documentedOnly` list.

| Rank | Rule | Findings it let through | Verdict |
|---|---|---|---|
| 1 | **Hardcoded brand/status hex + raw Tailwind palette inside `packages/design/ui/src`** | **9** — metric-card ×2, status-badge, kpi-card, stepper, github-inline-diff, dialog.stories (`--blue-9`), iphone-mockup.stories (`--blue-9`), interactive-frosted-glass-card (`rgba(11,241,195)` = `#0BF1C3`) | **Lint, and it is a two-line change.** `scripts/lint-no-brand-hex.mjs` already exists and works; its ripgrep target is literally `apps`. Add `packages/design` to the target and extend the pattern set to decimal-RGB spellings of the brand hexes (`rgba(11,241,195`, `rgba(0,51,254`) — the frosted-glass-card finding proves hex-only matching is evadable by decoding. Separately, `verify-ui-governance.ts`'s `rawTailwindColorBudgets` instruments only `apps/landing/src` and `apps/web/src`; add a `packages/design/ui/src` budget seeded at today's count, shrink-only. This is the rule most directly at risk (the VI lock) with a coverage hole in exactly the audited directory. |
| 2 | **Bespoke multi-stop `shadow-[...]` vs the ramp** | **7** — bento-grid, expandable-gallery, apple-liquid-glass-switcher, interactive-frosted-glass-card, Hero, banner, Pricing | **Lint.** Nothing anywhere greps for `shadow-\[`. A grep-based rule with a shrink-only allowlist is enough: flag any `shadow-[` containing a comma (multi-stop) or a raw `rgba(`/`#` colour; permit `shadow-[…hsl(var(--…))…]` so the R1/R2 hand-written escape hatches stay legal. Also extend `lint-no-dark-overrides.mjs`'s property regex to include `shadow` — it currently covers `bg\|text\|border\|fill\|stroke\|divide\|ring`, which is why the bento-grid `dark:hover:shadow-[…]` pair slipped through a rule that was supposed to catch it. |
| 3 | **Accessibility baseline (`type="button"`, `aria-label` on icon-only, keyboard path for click handlers)** | **7** (2 missing `type`, 5 missing keyboard/semantics) | **Split it.** `type="button"` on `<button>` and `motion.button`/`m.button` is a clean mechanical lint — write it, it caught two live defects here at zero false-positive risk. `aria-label` on icon-only buttons is lintable with moderate effort (element whose only child is an icon import). **Keyboard operability and correct ARIA pattern choice are not lintable** — the `stagger-testimonials` case was already flagged by `jsx-a11y` and the response was an `eslint-disable`, which is the failure mode of adding more rules to this class. Those belong in review, backed by the primitives-first rule (compose `Tabs`/`RadioGroup`/`Sheet`/`Popover` and the keyboard behaviour comes for free), not in a new script. |
| 4 | **Bare-HSL-channel token correctness (unwrapped `var(--token)` in a colour slot)** | **2** — and both render nothing, so this is the highest-severity-per-violation rule in the list | **Needs a real script, not a grep.** Correctness depends on which tokens are bare-channel triples versus complete colours, so the check must read `packages/design/tokens/styles.css`, classify each `--token` by whether its value parses as a colour, then flag bare-channel tokens appearing unwrapped in a colour position (`stroke=`/`fill=` attributes, gradient stop lists, `style` colour properties, `bg-[…]`/`text-[…]` arbitrary values). That token-classification step is exactly why a naive `grep -v hsl(` would be useless. Highest value per line of script in this table: both existing violations are invisible failures that shipped, and `warp-background.tsx` proves the team already knows the failure mode and still cannot catch it. |
| 5 | **Raw `motion.div` / hardcoded animation values at call sites** | **5** — Hero ×2, UseCases, Navbar, agent-plan | **Partially lintable, but do not over-build.** `verify-animation-governance.mjs` already blocks raw `framer-motion` imports outside the facade and correctly covers `packages/**`; what it cannot see is a bare numeric `duration:`/`ease: [...]` inside a file that legitimately imports the facade. A narrow lint for numeric literals in `transition={{ duration: … }}` and inline cubic-bezier arrays, with an allowlist, would have caught all five. But note 3 of the 5 exist because `AnimateIn` genuinely cannot express the effect (R3, R4) — **land R3 and R4 first.** A lint that forces call sites toward a primitive that cannot do the job produces exemption comments, not compliance. |
| 6 | **Inline `style={{…}}` ban across the rest of `packages/design/ui/src`** | 0 new findings here, but `tests/architecture/no-inline-css.test.ts` walks only `packages/design/ui/src/layout` — a small slice of a ~310-component library | **Extend the existing test, seeded shrink-only.** Cheap: the walker exists, only `DESIGN_SYSTEM_SRC` needs widening plus a baseline allowlist. Zero findings above is not evidence of compliance — it is evidence this audit prioritised colour, shadow, motion and a11y over inline style. Seed the baseline and let it shrink. |
| 7 | **CVA for variants instead of conditional class strings** | **1** — `stepper.tsx` (four-state `status` discriminated union rendered as ternary/`&&` chains at three separate call sites, no `cva` import in the file) | **Do not write a lint. Keep it as a review heuristic and say so in CLAUDE.md.** Any mechanical proxy ("N conditional class strings keyed off the same prop") has bad precision — plenty of legitimate one-off conditionals look identical, and the fix is a refactor with no runtime signal. One finding in a 310-component library also does not justify a script. Rewrite the CLAUDE.md line to state plainly that this is enforced in review, not by CI, so nobody assumes coverage that does not exist. |
| 8 | **No-borders preference (tonal background shift over border/ring/branch-lines)** | 0 reportable findings | **Drop it from the rules section; it is irreducibly human judgement.** It currently lives as an owner preference in a memory/feedback file with no lint and no codified CLAUDE.md governance section, and there is no mechanical way to distinguish "a border that should have been a background tint" from a border carrying real structural meaning. Presenting it alongside enforced rules is worse than presenting it as taste: it invites both false compliance claims and mechanical border-stripping that would violate 观感是验收. State it as an acceptance criterion for visual review, not a rule. |

Cross-cutting note on scope drift: `lint-no-focus-rings.mjs` and `lint-no-forbidden-containers.mjs` only added `packages/design` to `SCAN_ROOTS` on 2026-07-28 — and the focus-ring script's own header records that the library alone held 276 rings at that moment. `lint-no-arbitrary-breakpoints.mjs` is still `apps`-only. The recurring pattern is that guards are written for `apps/**` and the library, which every app consumes, is added years later or never. **Any new rule from this table should be written with `packages/design` in scope from day one.**

---

## 6. What this audit could not determine

- **Whether any Batch 3 fix actually looks right.** No rendering was performed. Every "the look barely moves" claim above is derived from comparing declared CSS values (bespoke rgba versus token definition), not from pixels. The two Batch 2 items and the five §4.1 items need a real screen.
- **Whether the unlayered `:focus-visible` rule survives every app's build pipeline.** The cascade-layer reasoning in §2.7 was derived by reading `static/base.css`, the concatenated `tokens/styles.css`, and Tailwind v4's layer declaration. It was not verified against built CSS output in `apps/web`, `apps/landing`, or Storybook, and any of those could wrap or reorder the import differently. Verify before deleting the ~15 `outline-none` utilities — if the reasoning is wrong in some app, those deletions restore double rings there.
- **Whether `text-error` or `text-destructive` is the registered utility name.** `tailwind.preset.ts` was not read; §2.1 flags this. Getting it wrong yields a class that does not exist and a silently uncoloured element — the same class of invisible failure as Batch 2.
- **Whether swapping in `Sheet`/`Popover`/`Tabs`/`RadioGroup` preserves the current animation timing.** The primitives are token-driven (`--sheet-duration`/`--sheet-easing`, `--tabs-duration`/`--tabs-easing`), but whether those tokens match the hand-written `framer-motion` timings in Navbar/UseCases/pricing-section was not compared. The compositions in §2.4/§2.5 are listed as look-preserving on the grounds that the visual surface is className-passthrough; the *timing* claim is unverified.
- **Coverage of the library.** ~310 exported components; this audit examined a targeted subset driven by pattern searches for colour literals, `shadow-[`, `motion.`/`m.` usage, missing `type=`, hand-rolled overlay/tab/radio behaviour, and unwrapped tokens. Families not swept at all: inline `style={{}}` outside `layout/`, container widths, Storybook coverage per component, arbitrary breakpoints, and microcopy (structurally ungoverned for this package). Absence of findings in those families means nothing.
- **Downstream override risk.** Whether any app or scaffold currently depends on the *broken* rendering of MagicCard or CircleProgress (for example, styling around an invisible progress ring) was not checked. Both Batch 2 fixes make new pixels appear in every consumer simultaneously.
- **The exact live count of `governance.config.json` allowlist debt versus CLAUDE.md's prose.** The ground truth notes a one-entry drift in the repository-seam allowlist (27 live versus "26" documented). Out of scope for this package, but it is the same doc-versus-config drift class as the scope gaps in §5, and it means CLAUDE.md's counts should not be cited as authoritative.
