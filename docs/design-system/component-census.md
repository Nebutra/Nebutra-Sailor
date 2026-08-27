# Component Census — @nebutra/ui coverage and app-side duplication

Survey date: 2026-07-30. Scope: `packages/design/ui/src/{components,primitives,patterns}` plus
`apps/{web,landing,forge,router,admin}`. All counts exclude `.next`, `storybook-static`, `dist`,
`node_modules`, and `*.generated.*`.

This is a worklist. Sections 2 through 5 are the actionable parts; section 1 explains what the
headline numbers do and do not mean; section 6 states what the census could not settle.

---

## 1. Headline numbers, and what they actually mean

### Files and stories

| Measure | Count | How measured |
|---|---|---|
| Source component files (`.tsx`, excluding `*.stories.tsx` / `*.test.tsx`) | 235 | `find` over the three directories |
| Colocated story files under `packages/design/ui/src/**` | 195 | `find -name '*.stories.tsx'` |
| Story files under `apps/storybook/src/**` | 22 | same |
| Source files exporting a PascalCase symbol with **no sibling** `.stories.tsx` | **58** | per-file sibling check + `grep -E '^export (const\|function\|class) [A-Z]'` |

The 58 figure is the one that maps cleanly onto "a file someone must go write a story for". It is a
file count, not a symbol count, and it is the number the worklist in section 2 is built from.

### Symbols — the 179 number is misleading

| Measure | Count | Notes |
|---|---|---|
| PascalCase symbols exported from source files | **308** | re-derived here; the 310 starting figure used a slightly looser export regex. Both are the same population. |
| Of those, the name appears anywhere inside a story file | 171 | loose heuristic: `grep -w` of the symbol against the concatenated text of all 217 story files |
| Of those, the name appears as a *story subject* (`component:` / `title:`) | 131 | stricter heuristic, from the starting measurement |
| Symbols never named in any story file | **137** | 308 − 171 |
| Symbols never a story *subject* | **179** | 308 − 131 |

**179 is not 179 missing components.** The gap between 137 and 179 is entirely symbols that appear
inside an existing story's JSX but are not the story's declared subject — which is exactly what a
compound sub-part should look like. `AccordionItem`, `DialogFooter`, `DropdownMenuSeparator`,
`CardHeader` and their ~150 siblings do not each need their own story; they are covered by the
story for their parent. Counting them as coverage debt inflates the problem roughly fivefold.

### The real number

Of the surveyed symbols, classified by hand into `standalone` versus `compound-part`:

- **41 standalone, consumed components lacking any story** — the genuine coverage debt in the
  surveyed slice. These are section 2.
- **11 delete candidates** — zero consumers, no compound parent. Section 4.
- **2 merge candidates** — a third or fourth variant of a shape the library already has. Section 3.

Caveat, stated plainly: the per-symbol classification returned covers
`packages/design/ui/src/primitives` alphabetically through `F` (`FlickeringGrid`) and then stops.
`components/`, `patterns/`, and primitives `G`–`Z` were not classified. The 41 / 11 / 2 counts are
therefore **lower bounds over roughly the first half of one of three directories**, not totals. See
section 6.

### Governance state

- CLAUDE.md: "Every new component MUST have a Storybook story." Nothing enforces it. There is no
  lint script, no arch test, and no CI job that fails on a storyless component file. The 58 storyless
  files are the direct consequence.
- There are **two** story locations (`packages/design/ui/src/**/*.stories.tsx`, 195 files, and
  `apps/storybook/src/**/*.stories.tsx`, 22 files). The documented "Step 2: File structure" in
  CLAUDE.md names only the colocated one. The 22 non-colocated stories are undocumented as a
  location, which is why a sibling-file check reports files as storyless when a story exists in the
  other tree.

### App-side duplication (`手搓禁止` violations)

Hard counts across `apps/**` excluding build artifacts:

| Pattern | Files |
|---|---|
| Raw `<table>` markup where the `Table` primitive exists | **28** (forge 8, web 7, landing 4, router 3, sailor-docs 2, design-docs 2, typelens 1, storybook 1) |
| Hand-rolled `role="menu"` dropdown where `DropdownMenu` / `Popover` exist | **7** |
| Hand-rolled `role="tablist"` where `Tabs` exists | **6** |
| Local `function CopyButton` / `const CopyButton` definitions | **7** (plus the library's own) |
| Imports of the library `CopyButton` | **0** |

The surveyed apps produced 32 individually-evidenced findings. `apps/admin` returned zero — it is
the only clean app in the set.

---

## 2. Ranked worklist — write these stories, in this order

Ranking is `consumers × severity`. Severity is high for a form/interaction primitive whose behaviour
is easy to regress (focus, keyboard, ARIA), medium for layout/structure, low for decorative. Consumer
counts are import-site counts from the survey; treat them as accurate to about ±2 since they were
derived by name grep and a name can appear in a comment.

### Tier 1 — high consumer count, no story anywhere

| # | Component | File | Consumers | Why it ranks here |
|---|---|---|---|---|
| 1 | `Command` | `primitives/command.tsx` | 49 | Highest-usage storyless component in the library. Command-palette keyboard and filtering behaviour has no visual regression surface at all. Confirmed no sibling story. |
| 2 | `Carousel` | `primitives/carousel.tsx` | 8 | Embla-backed, stateful, keyboard-navigable; `apps/router` already reimplemented an autoplay carousel by hand (section 3) partly because there is nothing to look at. |
| 3 | `Collapsible` | `primitives/collapsible.tsx` | 8 | Animated height + ARIA expanded state, 8 consumers, zero coverage. |
| 4 | `Alert` | `primitives/alert.tsx` | 7 | 7 consumers; `apps/forge` hand-rolled a toned error box instead of using it (`ShellError`). A story is the cheapest way to make the `destructive` variant discoverable. |
| 5 | `BrandMark` | `primitives/brand-mark.tsx` | 6 | Brand surface. Rebrand/white-label work (see the brand-meta-replacement governance track) needs a visual reference for this specifically. |
| 6 | `Breadcrumb` | `primitives/breadcrumb.tsx` | 5 | 5 consumers, 6 sub-parts, no story for the family. |
| 7 | `Field` | `primitives/field.tsx` | 5 | **Mandated** by the form-controls primitive-only rule in CLAUDE.md — every governed form in `apps/**` is supposed to route through it, and it has no story. Highest doc-vs-reality mismatch on the list. |
| 8 | `AvatarSmartGroup` | `primitives/avatar-smart-group.tsx` | 5 | Overflow/collapse logic (the `+N` case) is exactly what a story should pin. |
| 9 | `AlertDialog` | `primitives/alert-dialog.tsx` | 4 | Destructive-confirm modal, 11 sub-parts, focus trap. |
| 10 | `CodeBlockLanguageIcon` | `primitives/code-block-language-icon.tsx` | 4 | 4 consumers; a story doubles as the language-coverage matrix. |

### Tier 2 — the provider-avatar cluster, one story covers five

`primitives/avatar-extended.tsx` exports five sibling standalone components with no story between
them: `AvatarWithIcon` (5 consumers), `DiceBearAvatar` (5), `BitbucketAvatar` (4), `GitHubAvatar` (4),
`GitLabAvatar` (4) — 22 consumers total. One `AllVariants` story covers the whole file. Best
ratio of coverage gained to work done on this list.

### Tier 3 — the CommandMenu parts cluster, one story covers nine

`primitives/command-menu-parts.tsx` exports nine standalone parts (`CommandMenuRoot`, `Input`,
`List`, `Item`, `Group`, `Separator`, `Shortcut`, `Empty`, `Results`), most at 3 consumers, none with
a story. `CommandMenu` (the composed component, 2 consumers) does have one. The parts file is the
low-level API and should get one composition story showing the parts assembled — not nine stories.

Note the smell here: `command.tsx` (49 consumers, no story) and `command-menu-parts.tsx` (9 parts,
no story) and `command-menu.tsx` (has a story) are three overlapping command-palette APIs. Resolving
that overlap is a design question, not a story-writing task, and is flagged in section 6.

### Tier 4 — remaining storyless standalone components, low consumer count

Each of these is a single story, ordered by consumers:

`ErrorBoundary` (3, `primitives/error-boundary.tsx` — also owns three context wrappers) ·
`ConfirmDialog` (2) · `AspectRatio` (2) · `BaseButton` (2) · `ChartTooltip` (1) ·
`ChartTooltipContent` (1) · `ErrorMessage` (1) · `ExpandingTextarea` (1) · `BulkActionBar` (1) ·
`AnimatedCircularProgressBar` (1) · `AppleLiquidGlassSwitcher` (1) · `BaseBadge` (1) · `Book` (1) ·
`BentoCard` (1, sibling of `BentoGrid` which has one) · `CircularUI` (1) · `DualModeImage` (1) ·
`Badge1` (1).

`Badge1` (`primitives/badge-1.tsx`) should be triaged before a story is written for it. The name is
almost certainly an accidental scaffold duplicate of `Badge` (181 consumers). If it is, it belongs in
section 4, not here. One consumer; check that consumer's intent first.

`CircularUI` and `DualModeImage` both live inside `primitives/feature-card.tsx` without the
`FeatureCard` prefix, so they read as standalone exports while being decorative sub-widgets. Either
prefix them (making them compound parts, no story owed) or extract them to their own files with
stories. Prefixing is the smaller change.

---

## 3. Merge candidates

Grouped by the shape being duplicated. Each entry names both files and why they are the same thing.

### 3a. Destructive-confirm dialog — three variants, one shape

| File | Export | Consumers |
|---|---|---|
| `packages/design/ui/src/primitives/confirm-dialog.tsx` | `ConfirmDialog` | 2 |
| `packages/design/ui/src/primitives/confirm-dialog.tsx` | `ConfirmDeleteDialog` | 0 |
| `packages/design/ui/src/primitives/confirm-dialog.tsx` | `DestructiveActionModal` | 0 |

All three live in the same file and render the same contract: a modal, a warning body, a cancel
action, a destructive confirm action. `ConfirmDeleteDialog` is a copy-preset over `ConfirmDialog` and
is defensible. `DestructiveActionModal` is a third implementation of the same idea with zero
consumers — and it is the only one of the three with a story, which means the documented component is
the unused one. Merge into `ConfirmDialog` + presets; delete `DestructiveActionModal`; move its story
onto `ConfirmDialog`.

### 3b. Bulk action bar — two variants, one consumed

| File | Export | Consumers |
|---|---|---|
| `packages/design/ui/src/primitives/bulk-action-bar.tsx` | `BulkActionBar` | 1 |
| `packages/design/ui/src/primitives/compact-bulk-action-bar.tsx` | `CompactBulkActionBar` | 0 |

`CompactBulkActionBar` is re-exported through `bulk-action-bar.tsx`, which is what a density variant
of the same component looks like — but it is a separate file with a separate implementation and no
consumers. Note there is also `primitives/floating-bulk-action-bar.tsx` in the tree, unclassified by
this survey; the three should be triaged together as one component with a `variant` prop rather than
three files. Do not act on the third without classifying it first.

### 3c. Browser mockup — two exports, one used

| File | Export | Consumers |
|---|---|---|
| `packages/design/ui/src/primitives/browser-mockup.tsx` | `Browser` | 1 (has story) |
| `packages/design/ui/src/primitives/browser-mockup.tsx` | `BrowserMockup` | 0 |

Same file, same purpose. `Browser` won. Listed here rather than in section 4 only because the
resolution is "collapse to one export", not "delete a file".

---

## 4. Delete candidates

Evidence for every row is: zero import sites found by name grep across `apps/**` and `packages/**`
excluding build artifacts, **and** no compound-parent relationship that would explain a zero count.
Consumer counting by name grep is a heuristic — it can miss a re-export chain or a dynamic import —
so each row should get one confirming `rg` before removal.

| Component | File | Story? | Evidence |
|---|---|---|---|
| `Enable2FACard` | `primitives/enable-2fa-card.tsx` | no | 0 consumers, no story, no parent. Cleanest delete on the list. |
| `FallbackCard` | `primitives/fallback-card.tsx` | no | 0 consumers, no story. |
| `LetterGlitch` | `primitives/fallback-card.tsx` | no | 0 consumers, no story. Second export in the same orphaned file — delete the file, not just the symbol. |
| `FeatureGate` | `primitives/feature-gate.tsx` | no | 0 consumers. Only textual reference is a doc comment showing `fallback={<UpgradeBanner/>}`, i.e. referenced by documentation and by nothing else. |
| `FileCard` | `primitives/file-card.tsx` | **yes** | 0 app consumers. Has a story, so it is *documented* but unused — the story is the only thing keeping it alive. |
| `FilterPills` | `primitives/filter-pills.tsx` | **yes** | 0 app consumers, story only. Same shape as `FileCard`. Worth a second look: `apps/forge/src/components/json-diff-runner.tsx` hand-rolls a filter-pill bar (section 5 notes), so this may be an adoption failure rather than dead code. |
| `ChartLegend` | `primitives/chart.tsx` | no | 0 consumers. Sibling `ChartContainer` (1 consumer) is used; the legend halves never were. |
| `ChartLegendContent` | `primitives/chart.tsx` | no | 0 consumers. Pairs with the above; delete together. |
| `CopyableField` | `primitives/copy-button.tsx` | no | 0 consumers, no story. |
| `BrowserMockup` | `primitives/browser-mockup.tsx` | no | 0 consumers; see 3c — resolve as a merge. |
| `CompactBulkActionBar` | `primitives/compact-bulk-action-bar.tsx` | no | 0 consumers; see 3b — resolve as a merge. |

### `CopyButton` — do not delete this one

`CopyButton` (`primitives/copy-button.tsx`) has **zero** consumers, which by the letter of the rubric
puts it in this table. It should not be deleted. Verified independently:

- Imports of the library `CopyButton`: **0**.
- Local `function CopyButton` / `const CopyButton` definitions in app and package code: **7** —
  `apps/design-docs/src/components/component-preview.tsx`,
  `apps/design-docs/src/components/tailwind-demos.tsx`,
  `apps/sailor-docs/src/components/component-preview.tsx`,
  `apps/sailor-docs/src/components/tailwind-demos.tsx`,
  `apps/web/src/components/theme-playground/theme-playground-workbench.tsx`,
  `apps/web/src/components/growth/referral-panel.tsx`,
  `packages/design/docs-shared/src/components/gradient-demos.tsx`.

That is a seven-way `手搓禁止` violation against a component that already exists, not dead code. The
action is adoption: replace all seven local definitions with the library import, then write its story.
Its wrappers (`CopyCodeButton`, `CopyIdButton`, `CopyLinkButton`) inherit the same fate.

This is the clearest illustration of why "0 consumers" alone cannot decide deletion.

---

## 5. Promotions — hand-rolled app code with no library equivalent

**The survey found no clean promotion candidates.** Every one of the 32 app findings named an
existing library equivalent. Stated plainly so nobody reads absence as absence of evidence: the
surveyors were asked for duplicates and found duplicates; they were not separately tasked with
hunting for capability gaps, so a genuine gap could have gone unrecorded.

Two things surfaced that are promotion-shaped rather than replacement-shaped and are worth a decision:

### 5a. The forge runner results table — a repeated pattern, not a missing primitive

Eight files in `apps/forge/src/components` hand-write the same results grid:
`w3-isbn-runner.tsx`, `json-diff-runner.tsx`, `sota-runners.tsx`, `p0-runners.tsx`,
`w3-loan-amortization-runner.tsx` (two separate tables), `w3-retry-backoff-schedule-runner.tsx`,
`w3-vin-runner.tsx`, `w3-line-ending-detect-runner.tsx`.

Each reimplements `<table>/<thead>/<tbody>` with manual zebra striping. The `Table` primitive already
covers the markup and already has `striped` / `bordered` / `interactive` props, so the table itself is
a **replacement** (section 2 context, worklist item for forge). What does not exist is the
runner-specific shape above it — a titled, column-typed, monospace-numeric results panel repeated
eight times. That is a candidate for a shared `apps/forge` component. It is app-specific and should
stay in forge; it does not belong in `@nebutra/ui`.

### 5b. `useAnchoredMenu` — an app-local hook that only exists because a primitive was bypassed

`apps/web/src/hooks/use-anchored-menu.ts` provides portal-anchored menu positioning and is consumed
by `apps/web/src/components/navigation/user-menu.tsx` and
`apps/web/src/components/notifications/notification-center.tsx`.

This looks like a promotion candidate and is not one. Both consumers should be using the library's
Radix-backed `DropdownMenu` / `Popover`, which already handles anchoring, focus trap, Escape, and
outside-press. Promoting the hook would institutionalise the bypass. The correct action is to delete
the hook along with the two hand-rolled menus.

### 5c. The largest replacement targets, for reference

Not promotions, but the highest-value app-side fixes, ranked by size of the hand-rolled surface:

| File | Lines hand-rolled | Replace with | Confidence |
|---|---|---|---|
| `apps/web/src/components/navigation/user-menu.tsx` | ~359 | `UserMenu` (`patterns/user-menu.tsx`) | certain |
| `apps/web/src/components/navigation/org-switcher.tsx` | ~183 (lines 39–222) | `WorkspaceSwitcher` (`patterns/workspace-switcher.tsx`) | certain |
| `apps/landing/src/components/landing/navbar/UserAvatarMenu.tsx` | ~194 (lines 79–273) | `UserMenu` | certain |
| `apps/forge/src/components/journey-shells.tsx` | 6 separate findings: two hand-built tablists, a card radiogroup with hand-written roving focus, `ShellBadge`, `ShellError`, `ShellSkeleton` | `Tabs`, `RadioGroupCard`, `Badge`, `Alert`, `Skeleton` | certain (4) / likely (2) |
| `apps/router/src/components/console-shell.tsx` | ~90 (lines 77–166, `HeaderMenu`) | `DropdownMenu` | certain |
| `apps/router/src/components/market-banner-carousel.tsx` | ~95 (lines 16–111) | `Carousel` | certain |

The `journey-shells.tsx` and `market-*.tsx` clusters both reimplement accessibility contracts
(ArrowLeft/Right roving tabindex, Home/End on a radio grid) that Radix and Base UI already ship. Those
are correctness defects, not style preferences.

`apps/router` imports nothing from `@nebutra/ui/layout` anywhere — `EmptyState`, `LoadingState`,
`ErrorState`, `PageHeader` are entirely unused in that app despite CLAUDE.md naming them canonical.

---

## 6. What this census could not determine

Stated as gaps, not softened.

1. **Symbol classification covers less than half the library.** The per-symbol
   standalone-vs-compound-part classification returned `packages/design/ui/src/primitives`
   alphabetically through `F` and stopped. `primitives` `G`–`Z`, all of `components/`, and all of
   `patterns/` are unclassified. Every count in section 1 that derives from that classification
   (41 needs-story, 11 delete, 2 merge) is a **lower bound over a partial slice**. The file-level
   numbers (235 source files, 58 storyless, 308 symbols, 171/137 story-name coverage) are complete.

2. **Consumer counts are name-grep heuristics.** A symbol name matched in a comment, a string, or a
   type-only import counts. A consumer reached through a re-export chain or `React.lazy` may not.
   Every zero in section 4 needs one confirming `rg` before anything is removed.

3. **"Appears in a story file" is not "is covered by a story."** Both the 171 and 131 figures are
   text matches. A symbol named in a story's import list but never rendered counts as covered. Real
   coverage would need the story graph parsed, not grepped.

4. **The two-story-location split was not reconciled.** 22 stories live in `apps/storybook/src`. The
   sibling-file check that produced the 58 figure cannot see them, so some of those 58 files may
   already have a story in the other tree. Each tier-1 item was individually spot-checked and
   confirmed genuinely storyless; tier-4 items were not.

5. **Three overlapping command-palette APIs were found but not adjudicated.** `command.tsx`
   (49 consumers, no story), `command-menu-parts.tsx` (9 exports, no story), `command-menu.tsx`
   (2 consumers, has a story). Whether this is a deliberate low-level/high-level split or accreted
   duplication is a design decision this survey cannot make.

6. **Three bulk-action-bar files, only two classified.** `floating-bulk-action-bar.tsx` was never
   reached. Section 3b should not be executed until it is.

7. **`apps/admin` returned zero findings — unverified as a clean result.** It could be genuinely
   clean, or the app could be small enough that the surveyor found nothing to compare. No coverage
   metric distinguishes those two cases here.

8. **Apps outside the surveyed five were not examined.** The raw-`<table>` count reaches
   `apps/sailor-docs` (2), `apps/design-docs` (2), `apps/typelens` (1), and `apps/storybook` (1) —
   six files in apps that received no duplicate survey at all. Those apps almost certainly hold
   further findings.

9. **No enforcement mechanism was designed.** This census documents that the CLAUDE.md story rule is
   unenforced. Whether the fix is a lint script, an arch test, or a structural change (single story
   location, generated coverage report) is out of scope. Per the project's standing preference for
   correct-by-construction over added guards, a new lint rule should not be the default answer.
