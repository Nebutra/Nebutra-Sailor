# Beauty Acceptance — how "good-looking" is decided in this repo

**Status:** normative. Applies to any diff touching `packages/design/**`, `apps/web/src/**`,
`apps/landing/src/**`, or `apps/admin/src/**`.
**Owner:** design system. **Opened:** 2026-07-28. **Refs:** #345.

---

## 0. Why this exists

"Looks good" is currently decided by whoever happens to review. That has let six
separate classes of defect ship (§5), including a primary call-to-action that was
literally invisible and a status colour used as text at 2.05:1. None of those were
caught by taste. All six are catchable by measurement.

This document turns the three stated principles — 呼吸感, colour and visibility
science, state management — into items a reviewer can decide holding exactly two
things:

- **(a)** a Storybook screenshot of the changed component at **1440×900**, in **both**
  light and dark (recipe in §1);
- **(b)** the diff.

Nothing here may be decided by feeling. If an item cannot be resolved from (a) and
(b), the item is defective and should be reported, not guessed at.

### Verdict rules

| Verdict | Meaning |
|---|---|
| **Hard fail** | Blocks merge. No reviewer discretion. The item states an exact token, class, or measured number. |
| **Needs justification** | Merges only with a written reason in the PR body naming the item number. Silence is a fail. |
| **Pass** | Neither triggered. |

A reviewer who cannot produce screenshot (a) — because the component has no story,
or its story renders an empty shell — has hit **hard fail S-0** and stops there.

---

## 1. The evidence: screenshot recipe

### 1.1 Boot Storybook

```bash
pnpm dev:storybook          # → apps/storybook, storybook dev --port 6006 --no-open
```

Port **6006** is fixed in `apps/storybook/package.json`. Stories are globbed from
`packages/design/ui/src/**/*.stories.@(ts|tsx)` and `apps/storybook/src/stories/**`
(`apps/storybook/.storybook/main.ts`).

### 1.2 The two URLs

Storybook renders one story, chrome-free, at:

```
http://localhost:6006/iframe.html?id=<story-id>&viewMode=story
http://localhost:6006/iframe.html?id=<story-id>&viewMode=story&globals=theme:dark
```

`<story-id>` is the kebab-cased `title` plus the export name, e.g.
`primitives-datalist--default`. Read it off the address bar in the Storybook UI, or
from `storybook-static/index.json` after a build.

**`&globals=theme:dark` is the whole dark-mode mechanism.** `apps/storybook/.storybook/preview.ts`
declares a `theme` global (`light` | `dark`, default `light`) and its decorator does
`document.documentElement.classList.toggle("dark", theme === "dark")`. Because the
Storybook background values are declared as `var(--neutral-1)` / `var(--neutral-12)`
and `--neutral-1` flips from `#ffffff` to `#020617` inside `.dark`, the backdrop
follows the global automatically. **Do not** also switch the backgrounds toolbar —
that produces a light surface inside a dark token context and invalidates every
contrast reading you take off the shot.

### 1.3 Capture at 1440×900 with the Playwright already in the workspace

`@playwright/test` **1.58.2** is declared in `apps/web/package.json` and hoisted to
the repo root, which is why the root scripts call `playwright test` directly.
`e2e/playwright.visual.config.ts` already fixes the reference viewport:

```ts
{ name: "desktop-light", use: { ...devices["Desktop Chrome"], colorScheme: "light",
                                viewport: { width: 1440, height: 900 } } },
{ name: "desktop-dark",  use: { ...devices["Desktop Chrome"], colorScheme: "dark",
                                viewport: { width: 1440, height: 900 } } },
```

That config's `webServer` boots `@nebutra/landing` and `@nebutra/design-docs`, **not**
Storybook. For component review, drive an already-running Storybook directly:

```bash
# with `pnpm dev:storybook` running in another shell
pnpm exec playwright screenshot \
  --viewport-size=1440,900 --full-page --wait-for-timeout=800 \
  "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story" \
  /tmp/<story-id>.light.png

pnpm exec playwright screenshot \
  --viewport-size=1440,900 --full-page --wait-for-timeout=800 \
  "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story&globals=theme:dark" \
  /tmp/<story-id>.dark.png
```

The `--wait-for-timeout=800` is not decoration: the motion rails run to 500 ms
(`--duration-cinematic`), so a shot taken earlier can catch an entrance mid-flight and
read as a contrast failure that does not exist.

### 1.4 Assertions that are already written — reuse them, don't re-derive

`e2e/visual/helpers/visual.ts` exports the checks several items below refer to. They
are real, in the repo, and used by `e2e/visual/design-docs-primitive-state-matrix.visual.spec.ts`:

| Helper | What it decides |
|---|---|
| `expectNoHorizontalOverflow(page, root)` | No descendant escapes the root's box by >2 px. Skips `code`/`pre`/`svg`/`table`, `position: fixed\|sticky`, and anything whose own `overflow-x` is `auto\|scroll\|clip`. |
| `expectRenderableSurface(locator, {minimum, minimumTextCharacters, minimumVisibleDescendants})` | The surface has a real box and real content — the empty-shell detector. |
| `expectStableVisualSurface(locator, {width, height})` | Box exceeds a floor. |
| `expectVisibleTextDensity(locator, n)` | ≥ n visible characters (default 80). |
| `expectNoNativeFocusOutline(page, root)` | No `outline-style: auto`, and no non-token outline on a square-cornered element. |

The state-matrix spec also fixes the repo's layout-stability tolerance:
`const stableDeltaPx = 3` — a preview's width and height may move at most **3 px**
across an interaction. Item **S-1** uses that number.

---

## 2. Principle 1 — 呼吸感 (separation by rhythm and tone, never by rules)

Separation comes from spacing and a tonal background shift. A removed border must be
replaced by a background tint, or panels blend into the page.

### Tokens this principle is measured against

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` | `0 0% 100%` | `222 14% 9%` | |
| `--card` | `0 0% 100%` | `222 12% 13%` | dark `--card` vs `--background` = **1.11:1** |
| `--muted` | `210 40% 96%` | `222 10% 17%` | light `--muted` vs `--card` = **1.10:1**; dark `--muted` vs `--card` = **1.13:1** |
| `--border` | `240 5.9% 90%` | `220 8% 22%` | vs surface: **1.27:1** light, **1.37:1** dark |
| `--edge-faint` / `--edge-soft` / `--edge-medium` | `rgb(0 0 0 / .04 / .07 / .12)` | `rgb(255 255 255 / .04 / .06 / .10)` | `design-tokens/static/base.css` — pre-computed, replaced ~70 runtime `color-mix()` calls |
| `--halo-faint` | `rgb(0 0 0 / .03)` | `rgb(255 255 255 / .03)` | |
| `--radius-button` / `--radius-card` / `--radius-panel` | `0.5rem` / `0.75rem` / `1rem` | same | 8 / 12 / 16 px |
| `--container-text` / `-content` / `-wide` | `896px` / `1152px` / `1400px` | same | |

Everything in `apps/**` and `packages/design/**` inherits `border-color: hsl(var(--border))`
from the `@layer base` universal rule in `design-tokens/static/base.css`. A border is
therefore never "already there by accident" — it is always an author's `border` /
`border-b` / `ring` class.

### Hard fail

**B-1 — Border removed without a tint.**
The diff deletes a `border` / `border-b` / `border-t` / `ring-1` class from a panel,
card, list header, or section wrapper, and adds no `bg-*` on the same element or its
parent. Decidable from the diff alone: search the removed line's element for a
surviving or added `bg-`. The measured surface delta must be at least the token
minimum — `bg-muted` on `bg-card` is **1.10:1** light / **1.13:1** dark, which is the
floor this system ships. Anything below that (e.g. `bg-muted/40` alone on `--card` at
1440×900) is invisible on a 60 Hz IPS panel and reads as "the border just vanished".

**B-2 — Container width off the three-token contract.**
Any `max-w-5xl` (1024 px) or `max-w-7xl` (1280 px) in `apps/**` or `packages/design/**`.
The contract is text **896** / content **1152** / wide **1400**, i.e. `max-w-4xl`,
`max-w-6xl` or `max-w-[var(--container-content)]`, and `max-w-[1400px]` or
`max-w-[var(--container-wide)]`. Enforced by `scripts/lint-no-forbidden-containers.mjs`
(scans both trees as of 2026-07-28; comment lines and the two design-sync prose files
are allowlisted). Currently **green** — any red is a new violation.

**B-3 — Component-level focus ring.**
Any `focus:ring-*` or `focus-visible:ring-*` in `apps/**` or `packages/design/**`.
The global rule in `design-tokens/static/base.css` already supplies

```css
:focus-visible:not(:where(input, textarea, select, [cmdk-input],
                          [role="textbox"], [contenteditable="true"])) {
  outline: 2px solid hsl(var(--ring) / 0.5);
  outline-offset: 2px;
  border-radius: inherit;
}
```

with `--ring` = `222 47% 11%` light, `0 0% 88%` dark. A component ring double-draws it.
Allowed: `focus:border-*` (mouse feedback on inputs), `focus:outline-none` paired with
the global rule, and the single allowlisted `primitives/form-control.ts`. Enforced by
`scripts/lint-no-focus-rings.mjs`. Currently **green**.

**B-4 — Arbitrary pixel breakpoint.**
Any `min-[NNNpx]:` or `max-[NNNpx]:`. Named tokens: `xs` 420, `sm` 640, `md` 768,
`lg` 1024, `tight` 1080, `shell` 1180, `xl` 1280, `2xl` 1536, `3xl` 1800. Enforced by
`scripts/lint-no-arbitrary-breakpoints.mjs`.

**B-5 — Opacity modifier on a spacing utility.**
Any `p-4/[0.04]`, `gap-3/[0.2]`, `rounded-lg/[0.06]` and relatives. Tailwind v4 accepts
`/<opacity>` only on colour utilities and **silently drops the whole class** otherwise,
so the element gets zero padding while the className reads plausibly. Enforced by
`scripts/lint-no-spacing-opacity.mjs`. Visible in screenshot (a) as a collapsed row.

**B-6 — Redundant `dark:` override.**
Any `dark:bg-neutral-12` (uses the *text* token as a background — the invisible-popover
bug) or `dark:*:(bg|text|border|fill|stroke|divide|ring)-white`. The `neutral-*` and
brand scales auto-flip via the `.dark` block in `packages/design/tokens/styles.css`;
a manual override is redundant at best and inverted at worst. Enforced by
`scripts/lint-no-dark-overrides.mjs` over `apps/web/src`, `apps/landing/src`,
`packages/design`.

### Needs justification

**B-7 — A new border on a surface that has a tint available.**
Adding `border` where a `bg-muted` / `bg-card` step would separate the panel. State in
the PR why the tonal step is insufficient (common valid reason: the panel sits on an
image or a gradient, where a tonal shift has no stable reference).

**B-8 — Relying on adjacent neutral steps to separate two surfaces.**
The 12-step scale is **not** perceptually uniform, and the reviewer must not assume it
is. Measured adjacent-step contrast:

- Light: `n1→n2` 1.05, `n2→n3` 1.05, `n3→n4` 1.13, `n4→n5` 1.20, **`n5→n6` 1.20 in
  reverse** (`--neutral-6` `#e2e8f0` is *lighter* than `--neutral-5` `#cbd5e1`, and is
  a duplicate of `--neutral-4`; `--neutral-7` duplicates `--neutral-5`).
- Dark: `n1→n2` 1.13, `n2→n3` 1.22, `n3→n4` 1.41, `n4→n5` 1.37, then **`n5→n6` 2.37
  with a hue-family jump** (`#475569` slate → `#171717` neutral gray), `n6→n7` 1.18,
  `n8→n9` **4.04**.

So `bg-neutral-2` on `bg-neutral-1` is 1.05:1 in light mode — not a separation. If a
diff separates panels with `neutral-N` / `neutral-N+1`, name the measured ratio in the
PR or switch to `--card` / `--muted`.

**B-9 — Off-scale radius or type size.**
Radius outside `--radius-{none,sm,md,lg,xl,2xl,3xl,full}` / `--radius-{button,card,panel}`,
or a font size outside the named utilities in `design-tokens/static/base.css`:
`text-heading-{72,64,56,48,40,32,24,20,16,14}`, `text-button-{16,14,12}`,
`text-label-{20,18,16,14,13,12}` (+ `-strong` / `-mono` / `-tabular` suffixes),
`text-copy-{24,20,18,16,14,13}` (+ `-strong` / `-mono`). A `text-[13.5px]` is off-system.

---

## 3. Principle 2 — colour and visibility science

Every foreground must clear **WCAG AA**: 4.5:1 for body text, 3:1 for text ≥ 24 px or
≥ 19 px bold, and 3:1 for the non-text parts of a control that carry meaning (SC 1.4.11).

### Measured ratios — the table this section is decided from

All values computed from the shipped HSL triples in `packages/design/tokens/styles.css`.
Light = against `--background` `#ffffff` unless the row says otherwise.

| Token | Light value | Light ratio | Dark value | Dark ratio (on `--background`) | Verdict |
|---|---|---|---|---|---|
| `--foreground` | `222 47% 11%` | **17.90:1** | `210 18% 96%` | **16.59:1** | foreground ✅ |
| `--muted-foreground` | `215 25% 45%` | **5.22:1** | `220 8% 65%` | **7.21:1** (6.50:1 on `--card`) | foreground ✅ |
| `--primary` | `228 85% 56%` = `#2f56ee` | **5.71:1** | `228 90% 72%` | **6.22:1** (5.62:1 on `--card`) | fill **and** foreground ✅ |
| `--destructive` | `0 84% 45%` | **5.42:1** (5.18:1 on `--neutral-2`) | `0 63% 38%` | **2.36:1** | light: foreground ✅ / **dark: FILL ONLY** |
| `--success` | `142 71% 29%` | **5.11:1** (4.89:1 on `--neutral-2`) | `142 60% 42%` | **6.14:1** | foreground ✅ |
| `--warning` | `38 92% 50%` | **2.14:1** (2.04:1 on `--neutral-2`) | `38 80% 52%` | **8.08:1** | light: **FILL ONLY** |
| `--warning-strong` | `38 92% 30%` | **5.40:1** (5.16:1 on `--neutral-2`) | `38 80% 52%` (= `--warning`) | **8.08:1** | foreground ✅ |
| `--status-warning` | `#f59e0b` | **2.15:1** (2.05:1 on `--neutral-2`) | same | — | **never a foreground** |
| `--status-danger` | `#ef4444` | **3.76:1** | same | — | large text / UI only |
| `--status-success` | `#22c55e` | **2.28:1** | same | — | **never a foreground** |
| `--blue-9` | `#0033FE` | 7.23:1 | same | — | passes contrast, **banned** on components (§B/C-4) |
| `--cyan-9` | `#0bf1c3` | **1.46:1** | same | — | decorative fill only |

Two consequences a reviewer must hold in mind:

1. **`--warning-strong` is not in the Tailwind `@theme inline` block.** There is a
   `--color-warning` (→ `bg-warning`, `text-warning`) but **no** `--color-warning-strong`.
   Amber text is therefore written `text-[hsl(var(--warning-strong))]`, never
   `text-warning-strong` (which silently generates nothing) and never `text-warning`
   (2.14:1).
2. **`--destructive` is a foreground in light mode and a fill in dark mode.** At
   `0 63% 38%` it is 2.36:1 on the dark background. Dark-mode destructive *text* must
   use `--foreground` or `--muted-foreground` with a `bg-destructive/N` chip, not
   `text-destructive`.

### Hard fail

**C-1 — Any foreground below 4.5:1 in either screenshot.**
Decided by reading the class off the diff and looking the pair up in the table above,
then confirming visually in both (a) shots. The three specific killers, in the order
they have actually occurred here: `text-[color:var(--status-warning)]` (2.05:1),
`text-warning` (2.14:1), `text-[color:var(--status-success)]` (2.28:1).

**C-2 — `text-destructive` (or `text-[hsl(var(--destructive))]`) visible in the dark
screenshot.** 2.36:1.

**C-3 — Reference to an undefined custom property.**
An undefined `var(--x)` computes to `rgba(0,0,0,0)` — transparent — so the element
renders as a styling choice rather than an error. Run
`node scripts/lint-defined-css-vars.mjs`; the diff must not add a new name. Current
baseline: **155 bare references to 50 undefined properties**, dominated by colour
scales that were never created — `--green-*`, `--amber-*`, `--red-*`, `--purple-*`,
`--orange-*`, `--emerald-*`, `--accent-N`. **The token system defines exactly three
colour families: `neutral`, `blue`, `cyan.`** Status colour goes through
`--status-success` / `--status-warning` / `--status-danger` (fills) or `--success` /
`--warning-strong` / `--destructive` (foregrounds). The guard deliberately does not
flag `var(--x, fallback)` — a fallback degrades gracefully.

**C-4 — Raw brand hex, or `--blue-9` / `--brand-primary` on a component surface.**
`#0033FE`, `#0BF1C3`, `#8b5cf6`, `#ef4444`, `#f59e0b`, `#10b981` are banned literals
(`scripts/lint-no-brand-hex.mjs`; escape hatch `// @allow-brand-hex: <reason>`).
Separately, `--blue-9` is the *identity* colour: it is the most saturated step in the
scale, reads as electric violet at panel size, and must not surface on a button, chip,
icon, or fill. Product blue is `--primary`. Decidable from the screenshot: a CTA whose
blue is visibly more saturated than the sidebar's active state is `--blue-9`.

**C-5 — Contrast-carrying meaning below 3:1.**
A state that is communicated by colour alone in the non-text layer — a status dot, a
selected row tint, a chart series, a toggle track — must reach 3:1 against its
immediate background, or carry a second channel (text, icon, weight). `--cyan-9` at
1.46:1 and `--status-success` at 2.28:1 both fail this as a lone signal.

**C-6 — The axe `color-contrast` rule reports a violation in the story.**
`apps/storybook/.storybook/a11y-config.ts` enables `color-contrast`, `heading-order`,
`label`, `button-name`, `image-alt`, `link-name` globally. Open the a11y panel on the
story in both themes.

### Needs justification

**C-7 — New saturation above the system's ceiling.**
The product palette's most saturated shipped foreground is `--primary` at 85% S light
/ 90% S dark. A new colour above that (or any `oklch` chroma above the Geist DS steps
in `--ds-*`, whose maximum is `0.3008` at `--ds-purple-700`) needs a reason.

**C-8 — A gradient on a product surface.**
`--brand-gradient` and its `--gradient-brand-*` aliases all resolve to a flat
`hsl(var(--primary))`. The only real gradients are `--brand-gradient-logo` /
`-logo-reverse` (`#0033fe → #00a2e9 → #0bf1c3`, mid stop is the OKLab perceptual
midpoint), and they are **brand assets only, not product CTAs**. A gradient CTA in a
dashboard screenshot needs a justification naming which of those it is.

**C-9 — A fourth colour family.**
Adding `--green-*` / `--amber-*` / `--red-*` etc. to the token source rather than
using `--status-*`. Legitimate occasionally; must be argued, and must be added to
`packages/design/design-tokens/tokens/` and regenerated with `pnpm brand:apply` —
never hand-edited into `styles.css`, which carries a DO-NOT-EDIT header.

---

## 4. Principle 3 — state management (loading / empty / error / overflow)

Layout must not jump, collapse, or stack chaotically as state changes.

### Hard fail

**S-0 — No story, or a story that renders an empty shell.**
Every component in `packages/design/ui/src/**` must have a co-located
`*.stories.tsx` whose default export renders **with content**. Many components in this
library ship no default data, so `args: {}` produces a byte-identical empty box in
before/after screenshots and proves nothing. Decided by
`expectRenderableSurface(preview, { minimum: { width: 220, height: 120 },
minimumVisibleDescendants: 1 })` and `expectVisibleTextDensity(preview, 80)`.

**S-1 — Layout jump greater than 3 px across a state transition.**
Capture the component's bounding box in `idle`, `loading`, `empty`, and `error`
stories. `Math.abs(after.width − before.width) ≤ 3` and the same for height — the
repo's `stableDeltaPx = 3` from `e2e/visual/design-docs-primitive-state-matrix.visual.spec.ts`.
The standard fix is a reserved body floor: `minBodyRows × rowHeight`, default
**5 × 44 px**, applied to the loading, empty *and* error bodies alike, so all three
occupy the same height as a short data body.

**S-2 — A missing state.**
Any component that fetches must define all four of: `loading`, `empty`, `error`,
`overflow`. Decided from the diff — the state union must have all four arms, and each
must have a story. Precedence is fixed: **error > loading > empty > rows**.

**S-3 — A background refresh that unmounts rows.**
A refetch or an optimistic mutation must not route through `status: "loading"`.
`isRefreshing` is a separate boolean; rows stay mounted and a hairline marks the
surface busy. Decidable from the diff: if the mutation handler sets the same state
value the first load sets, that is a fail. (Concretely: `webhooks-list` runs optimistic
mutations; collapsing them into `loading` blanks the table on every toggle.)

**S-4 — Horizontal overflow.**
`expectNoHorizontalOverflow(page, root)` must pass at 1440×900 in both themes. Wide
content — tables, code, diagrams — scrolls inside its **own** `overflow-x: auto`
container (which the helper correctly skips); the page body never scrolls sideways.
Decidable from the screenshot: a clipped right edge or a body scrollbar.

**S-5 — A skeleton that changes the loaded geometry.**
`Skeleton` (`packages/design/ui/src/primitives/skeleton.tsx`) sizes itself to wrap its
children when no `width`/`height` is given, precisely so the loading→loaded swap does
not reflow. It is `aria-busy="true"` + `aria-hidden="true"` while visible, keeps
shape-children `invisible` + `inert` so they cannot be tabbed to, and carries
`motion-reduce:animate-none`. A hand-rolled pulsing `div` has none of that and is a
fail on both counts (geometry and a11y).

**S-6 — Motion that ignores the reduced-motion rule.**
`design-tokens/static/base.css` clamps animation and transition duration to `0.01ms`
under `prefers-reduced-motion: reduce` for everything **except** `.animate-spin`,
`.animate-pulse`, `.animate-ping` (functional progress indicators, excluded per
WCAG 2.3.3). A component that re-declares `animation` inside its own
`@media (prefers-reduced-motion)` block, or that hides a *functional* spinner behind
the reduce query, fails.

### Needs justification

**S-7 — Off-rail duration or easing.**
Rails: `--duration-micro` 100 ms (hover, focus, toggle, press), `--duration-flow`
200 ms (modal, dropdown, tab), `--duration-reveal` 300 ms (slide, expand, accordion),
`--duration-cinematic` 500 ms (hero entrance). Easings: `--ease-in`, `--ease-out`
`cubic-bezier(0,0,0.2,1)`, `--ease-in-out`, `--ease-spring`. A raw `duration-[250ms]`
needs a reason.

**S-8 — `EmptyState` inside a borderless body.**
All eight `EmptyState` variants carry a border, and `blank-slate` / `no-results` /
`cleared` are `border-dashed` (`primitives/empty-state.tsx`). Dropping one into a
borderless list body reintroduces a rule the surrounding design just removed. Either
override the className explicitly, or render plain content. Say which in the PR.

**S-9 — Reserved floor other than 5 × 44.**
Fine — pass the height of your densest row — but state the number, because a floor
shorter than the real row height reintroduces S-1.

**S-10 — Overflow handled by truncation.**
Truncating is a legitimate overflow strategy, but it hides data. Justify, and confirm
in the screenshot that the truncated element still has an accessible full value
(`title`, tooltip, or expandable row).

---

## 5. What has actually gone wrong here

Six incidents, all shipped, all now traceable to one checklist item. This section is
the argument for the list, not decoration — read it before dismissing an item as
pedantic.

### 5.1 The hero CTA that shipped invisible — **C-3**

`Hero.tsx` styled its primary call-to-action `bg-[var(--brand-9)]`. `--brand-1..12`
do not exist; the real 12-step scale is `--blue-*`, with `--brand-primary` as an alias
for `--blue-9`. An undefined custom property inside a Tailwind arbitrary value computes
to `rgba(0,0,0,0)`, so the button rendered as **white text on a transparent background**
— invisible. The same phantom scale erased the hero's mesh backdrop, leaving the
decorative grid unmasked. 29 references across 5 files, two of them authenticated
product pages (usage, integrations). Fixed in `29645b1d`.

Every token guard in the repo at the time checked for *forbidden* values. None checked
that a referenced property *resolves*. That is exactly C-3.

### 5.2 Colour scales that were never created — **C-3**

Running the guard written to close that gap (`9899ae19`) found the same defect class at
ten times the scale: **155 bare references to 50 undefined properties**, dominated by
`--green-*` (71), `--amber-*` (32), `--red-*` (27), `--purple-*` (6), plus
`--orange-*`, `--emerald-*`, `--accent-N`, `--space-N`, and a literal `--xxx`. The
token system defines three families. Every one of those 155 sites is currently rendering
a transparent colour that reads as a deliberate subtlety.

`scripts/lint-defined-css-vars.mjs` **exits 1 today and is deliberately not yet wired
into `pnpm lint`** — wiring it in is the last step of fixing the references, not the
first. Until then, C-3 is a reviewer's job: run it, diff the count, reject increases.

### 5.3 `--status-warning` as text at 2.05:1 — **C-1**

`--warning` is a fill. At `38 92% 50%` it measures **2.04:1** against `--neutral-2` and
2.14:1 against white, so every place it was used as text or as an icon stroke was
unreadable — **29 files across `apps/**`** did exactly that, following CLAUDE.md's own
inline example (`text-[color:var(--status-warning)]`). Destructive (5.42:1) and success
(5.11:1) pass as foreground; amber had no passing step at all until `4b601ea9` added
`--warning-strong` (`38 92% 30%`, **5.16:1** on `--neutral-2`, chosen to sit between
success 4.89 and destructive 5.18 so the three status colours read at equal weight).

The same commit corrected a stale comment that had claimed `--primary` was `#254bfa`;
`228 85% 56%` resolves to **`#2f56ee`**. Nothing rendered wrong — both are 5.7–6.1:1 on
white — but the wrong hex was quoted as fact in a commit message and in review. Hence
this document's rule: cite the HSL triple, not a hex someone typed next to it.

### 5.4 276 component focus rings doubling the global outline — **B-3**

`lint-no-focus-rings` carried a documented carve-out: *"packages/** primitives own the
design-system focus treatment (not scanned)."* That predated the global `:focus-visible`
rule in `base.css`. With both owners live, app code had **zero** rings and the library
had **276**, across **68 files** — every one of them drawing a second outline on top of
the global 2 px translucent one. One of them lived in `button-variants.ts`, a `.ts`
file, invisible to the guard's `*.tsx`-only glob. Removed in `75721878`; the guard now
scans `packages/design` and `.ts`, with `primitives/form-control.ts` as the one
explicit allowlist entry.

This is why B-3 is a hard fail and not a style preference: the double outline was
*documented policy* for months.

### 5.5 Three parallel container scales — **B-2, B-8**

CLAUDE.md defines one container contract — 896 / 1152 / 1400. The library shipped two
more that contradicted it:

```
tokens/spacing.ts       containerWidths  768 / 1024 / 1280
layouts/SectionContainer maxWidthMap     768 / 1024 / 1152 / 1280
```

Plus 24 direct `max-w-5xl` / `max-w-7xl` sites in `packages/design` while app code had
none — a width baked into a DS section container reaches every page that uses it.
Collapsed in `ecb2877e`; verified numerically in the browser (Features / Testimonials /
SocialProof 1280 → 1400; Pricing and two-column FAQ 1280/1024 → 1152).

### 5.6 Stories that rendered an empty shell — **S-0**

The 41 components in `packages/design/ui/src/marketing` had **no stories at all**, so no
marketing surface could be reviewed without booting a full app. When stories were added
(`29645b1d`), the first three screenshots taken through them immediately found §5.1.

Then a second-order failure: Features / Testimonials / FAQ / SocialProof ship **no
default data**, so `args: {}` rendered an empty shell. The before/after screenshots were
**byte-identical and proved nothing** until the sections were given fixture data
(`ecb2877e`). A story that renders nothing is worse than no story, because it produces a
green screenshot diff.

---

## 6. Commands a reviewer runs

```bash
# 1. Evidence — Storybook at 1440×900, both themes (§1)
pnpm dev:storybook                              # port 6006, --no-open
#   then, in a second shell:
pnpm exec playwright screenshot --viewport-size=1440,900 --full-page \
  --wait-for-timeout=800 \
  "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story" /tmp/s.light.png
pnpm exec playwright screenshot --viewport-size=1440,900 --full-page \
  --wait-for-timeout=800 \
  "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story&globals=theme:dark" \
  /tmp/s.dark.png

# 2. The full guard suite (B-2..B-6, C-4, plus non-visual guards)
pnpm lint

# 3. C-3 — not in `pnpm lint` yet; exits 1 by design. Compare the count to baseline.
node scripts/lint-defined-css-vars.mjs           # baseline: 155 refs / 50 properties

# 4. Individual guards, when `pnpm lint` fails and you want the one line that matters
node scripts/lint-no-focus-rings.mjs             # B-3
node scripts/lint-no-forbidden-containers.mjs    # B-2
node scripts/lint-no-brand-hex.mjs               # C-4
node scripts/lint-no-dark-overrides.mjs          # B-6
node scripts/lint-no-spacing-opacity.mjs         # B-5
node scripts/lint-no-arbitrary-breakpoints.mjs   # B-4

# 5. S-1 / S-4 — layout stability and overflow, on the surfaces that have specs
pnpm visual                                      # design-docs + landing, 1440×900 light+dark
pnpm visual:design-docs                          # includes the primitive state matrix

# 6. Types and unit tests
pnpm typecheck
pnpm test
```

**C-6** (axe `color-contrast`) is read off the a11y panel in the Storybook UI, in both
themes, on the story from step 1.

---

## 7. Amending this document

Every item must remain decidable from a screenshot and a diff. Before adding one, check
it names a real token, a real class, or a real number, and that a reviewer without
context could reach the same verdict you would. An item that reads "looks clean" or
"feels balanced" is a defect in this document and should be removed.

Where a structural fix is possible — a shared component, a shared helper, a real SSOT —
prefer it over adding an item here. This list is the residue of what could not be made
correct by construction.
