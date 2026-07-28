# Tool brief: editorconfig-generator

Root: **Template** (21) — see §6.7.9 empty-slot priority order (Template → Detector → Processor). Object: dev config file (text). Side effect: `pure`.

## 1. Demand

Ship a correctly-formed `.editorconfig` at a repo root without hand-writing INI-like glob sections from memory — the properties, their legal values, and glob syntax are easy to misremember, and a malformed file fails silently (editors just ignore rules they can't parse).

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| Tim Severien's Editor config generator | https://editorconfig.timseverien.com/ | Yes | [`timseverien.png`](../../research/forge/editorconfig-generator/timseverien.png) |
| Editorconfig Guide | https://editorconfig.guide/ | Yes (contrary to the landscape survey's note — reachable via WebFetch/screenshot on this pass) | [`editorconfig-guide.png`](../../research/forge/editorconfig-generator/editorconfig-guide.png) |
| W3Schools .editorconfig Generator | https://www.w3schools.com/tools/tool_editorconfig_generator.php | Yes | [`w3schools.png`](../../research/forge/editorconfig-generator/w3schools.png) |
| GitGroomer .editorconfig Generator | https://www.gitgroomer.com/editorconfig-generator/ | Yes | [`gitgroomer.png`](../../research/forge/editorconfig-generator/gitgroomer.png) |

All four were successfully fetched (WebFetch, HTTP 200) and screenshotted (`scripts/research-screenshot.mjs`, all `ok:true`) on this pass — the earlier landscape survey's "could not verify" for guide/W3Schools/GitGroomer no longer holds; recorded here for the record, not repeated as fact. `editorconfig.org` itself remains the spec/homepage, not a generator, so it is excluded as a direct competitor.

## 3. Feature inventory

| Competitor | Core strength (why people come) | Feature set | Upsell / padding |
|---|---|---|---|
| **timseverien** | Multiple **glob sections**, each independently editable, live regenerating text — the cleanest minimal implementation of the actual spec shape | Add/remove section; per-section quick language chips (Any/HTML/JS/JSON/TS/YAML) that presumably seed a glob; core properties (charset, end_of_line, indent_style, indent_size, insert_final_newline, tab_width, trim_trailing_whitespace) each as its own row with a delete (×) button and an "Add [property]" affordance for properties not yet in a section; comment header naming the generator + URL in the output | None found — no ads, no account, no upsell |
| **editorconfig.guide** | Richest implementation reached: split-pane form-left/preview-right, **presets** (Prettier, Microsoft C#, Google Web, Airbnb, Linux Kernel, 2-Space, PSR-2 PHP, Go Standard), **per-language option sets** (dotnet/C#/C++/JS/HTML/CSS/XML/Razor/Protobuf/ShaderLab/VB), a documentation link on every single option, and bidirectional **paste-to-import** (paste an existing `.editorconfig` and the form re-populates) | root toggle, hide-defaults toggle, add-new-pattern with language picker, per-option live code-snippet preview showing the effect of the current value, copy + download buttons pinned above the output pane | None — no ads (self-hosted, Clojure/ClojureScript credit, GitHub issues link, legal Impressum footer only) |
| **W3Schools** | Domain authority / brand recognition, not tool depth — a generic single-section form | Indent style/size, EOL, charset dropdowns; 4 checkboxes (trim trailing whitespace, insert final newline, keep trailing spaces in `.md`, force tabs in Makefiles) baked in as fixed extra rules rather than user-added sections; copy + "Download .editorconfig" button; live preview panel | Full W3Schools chrome (sidebar nav to unrelated tools, sign-in/XP gamification, "REMOVE ADS" link implying ad slots elsewhere on the page, certification upsells) surrounds a genuinely small tool card |
| **GitGroomer** | SEO-shaped content page with a small embedded generator | Single global section only: indent style/size, EOL, charset, trim-trailing-whitespace, insert-final-newline; auto-updating preview; Copy button (no download button seen in the captured viewport) | "How to Use" 3-step callout, 4 "Common Use Cases" cards, "Why Use It" essay, second static example file, 5-question FAQ block, "Buy me a coffee" and "Need Expert SEO Help? / Free SEO Consultation" CTA banner — all after the tool, but the page is mostly this padding |

**Cross-competitor read:** every implementation nails the same core (indent style/size, EOL, charset, trim-trailing-whitespace, insert-final-newline) live-regenerating with copy/download. The differentiator is **breadth**: multi-section support (timseverien, guide) vs. single fixed section (W3Schools, GitGroomer), and **presets/per-language depth** (guide only). None of the four expose an API — this is a purely human-page category today.

## 4. Journey maps

**timseverien** — Arrives at a two-card layout, each card is one glob section (`*` and `package.json` pre-populated). First touch is any property control inside a card (a text/select input with a delete `×` next to it). The plain-text `.editorconfig` output sits below both cards and **updates live, no button** — confirmed by watching the rendered property list match the visible form state exactly (e.g. `indent_style = tab` reflected from the "Tab" value shown). To scope a new rule set, "Add a section" appends a new empty card. No visible copy/download control was captured in the above-the-fold screenshot; property values are typed/typed-select rather than defaulting the user into extras — a genuinely bare-bones spec-shaped tool with no explanatory content at all below it.

**editorconfig.guide** — Arrives with the `[*]` section already fully populated with sane defaults and the right pane already showing a valid, non-empty `.editorconfig` (the tool has value before any interaction). A top bar of preset chips (Prettier, Airbnb, …) is the fastest first move — one click reshapes the whole current pattern's properties. Each option row shows a **live mini code preview** to its right (e.g. an `if(true) {…}` snippet demonstrating the current indent/EOL choice) — this is the one feature none of the other three have, and it directly answers "what does this value actually look like in my file." Copy and Download buttons sit pinned at the top of the output pane, always visible without scrolling. Adding a pattern is a labeled text field + "Add Pattern" button at the bottom of the form column. The reverse path — paste an existing `.editorconfig` into the preview side — re-populates the form (confirmed by the page's own copy: "paste an existing configuration files populates the form accordingly"). Below the tool: a two-paragraph explainer and nothing resembling an ad.

**W3Schools** — Arrives at a single fixed-shape form (no add/remove sections) with defaults pre-filled and a live preview beside/below it labeled `.editorconfig`. First touch is any dropdown/checkbox; output updates live. Two explicit action buttons: Copy (top-right of the output box) and a full-width green "Download .editorconfig" button beneath the output. Directly under the tool card: a "REMOVE ADS" link (implying ad units elsewhere on the page even though none render inside the captured tool card itself) and then a short "About EditorConfig" text block. The rest of the page (nav, sidebar tool list, sign-in gamification panel, footer link farm) is generic W3Schools chrome unrelated to this specific tool.

**GitGroomer** — Arrives at a "How to Use" 3-step numbered callout above the actual form — a real onboarding step none of the others show, useful for a first-time visitor who has never seen a glob-sectioned config before. The form itself is single-section, defaults pre-filled, live preview to the right, a "Copy" button on the output pane. No second glob section is offered. Below the tool: use-case cards, a "Why Use It" essay, a second static example file block, an FAQ, then a monetization CTA ("Buy me a coffee" nav item and a black "Need Expert SEO Help? — Free SEO Consultation" banner) before the footer.

**Common thread across all four:** none require an explicit "Generate" button — the result is always live. All four resolve output to on-page text; none force an upload (there is nothing to upload — the whole job is local text synthesis, so none of the four could gate it behind upload even if they wanted to).

## 5. Layout + screenshots

| Competitor | Structure | Above the fold | Options density | Mobile |
|---|---|---|---|---|
| timseverien | Two-column grid of section cards (form only, no explicit output pane framing) with plain-text output below | Both sample sections + start of output | Medium — 6-7 properties per card, each its own row | Not verified (desktop capture only) |
| editorconfig.guide | True split-pane: preset bar on top spanning full width, then left form column / right output column, dark theme | Presets + first ~8 global options + full live output pane with copy/download | High — every property has label + control + live-preview snippet, so the form column scrolls, but the essential controls (indent, size, EOL, charset, trim, newline) are within the first screen | Not verified (desktop capture only) |
| W3Schools | Single centered card, form fields stacked top-to-bottom on the left half of the card, output box on the right half within the same card | The whole tool card fits in one view along with the "REMOVE ADS" line beneath it | Low-medium — 4 dropdowns + 4 checkboxes, fixed set, no add/remove | Not verified (desktop capture only) |
| GitGroomer | Full-width "How to Use" band, then a two-column form (left) / output (right) card | How-to band + top of the form/output card | Low — 4 dropdowns + 2 checkboxes only, no per-file sections at all | Not verified (desktop capture only) |

None of the four screenshots were captured at a mobile viewport in this pass — mobile behaviour for all four competitors is **not verified**, not assumed.

## 6. Their debt

- **W3Schools**: heaviest surrounding chrome of the four — unrelated sidebar tool list, sign-in/XP gamification panel, "REMOVE ADS" messaging (ads exist on the wider template even if not visibly inside the tool card itself), certification upsell links in global nav. None of this sits *inside* the generate step itself, but it dominates the page.
- **GitGroomer**: the actual tool is a small fraction of the page; a "Buy me a coffee" nav item and a black full-width "Need Expert SEO Help? — Free SEO Consultation" banner sit directly under the tool, functioning as a lead-gen interruption between the generator and its own explanatory content.
- **No API on any of the four.** All four are human-page-only; an agent cannot call any of them without scraping/simulating a browser. This is the single clearest gap versus the AI-Native requirement in §6.5.
- **No section-glob support** on W3Schools or GitGroomer — real projects routinely need per-language overrides (`[*.md]`, `[Makefile]`), and both tools structurally cannot express that, silently pushing users who need it toward hand-editing anyway.
- **GitGroomer has no visible Download button** in the captured viewport (Copy only) — a minor but real gap against the "get the file out" step of the journey.
- None of the four exposed a warning about known spec footguns (see domain know-how below) — e.g. nobody flags that `utf-8-bom` is generally discouraged, or that duplicate glob sections silently let the later one win.

## 7. Domain know-how

1. **`root = true` must be the file's own first property, and only makes sense in the file actually intended as the top of the search chain.** EditorConfig-aware editors walk up the directory tree collecting `.editorconfig` files until one has `root = true` (or the filesystem root is hit) — a naive generator that always emits `root = true` regardless of context can silently stop a monorepo's nested overrides from ever being reached by tooling that also checks parent directories, or (more commonly for us, since we always generate one file) simply needs the toggle to be honest about what it does, not just a decorative checkbox.
2. **Glob sections resolve by file order, not by specificity.** If two sections in the same file both match a given file, the **later-declared section's properties win** for any property both define — this is not "most specific glob wins" the way CSS specificity works, and it is the single most common misunderstanding. A generator that lets users create two sections both matching e.g. `*.js` and `src/*.js` without ever telling them which one actually takes effect for a given path is shipping a footgun silently.
3. **`indent_size` and `tab_width` are two different knobs that people conflate.** `indent_size` is what gets inserted when a soft-indent is requested; `tab_width` is the on-screen rendering width of an actual tab character. When `indent_style = tab`, `indent_size` can legitimately be set to the literal string `"tab"` to mean "same as tab_width" — a naive schema that types `indent_size` as a plain number will reject or mishandle this valid spec value.
4. **`charset = utf-8-bom` is technically valid but broadly discouraged** — a BOM breaks shebang-line scripts and several toolchains handle it inconsistently. None of the four competitors surface this as a warning; a generator that lets a user pick it without comment is repeating everyone else's silence on a known gotcha.
5. **Glob syntax is EditorConfig's own dialect, not regex and not exactly shell glob**: `*` (any string except a path separator), `**` (any string including separators), `?` (single character), `[name]` / `[!name]` (character class / negation), `{s1,s2,s3}` (alternation), `{num1..num2}` (numeric range). A naive text-field-only implementation invites users to type invalid patterns (e.g. a raw regex) that silently fail to match anything.
6. **The filename itself is a real adoption obstacle.** A file with no basename and only an extension (`.editorconfig`) is awkward to create through some GUIs (notably older Windows Explorer "New File" dialogs reject a name starting with a dot). A generator's download step must emit the literal filename `.editorconfig` — untested, this is exactly the kind of thing that silently becomes `.editorconfig.txt` depending on how a browser's save-as logic handles a "extension-only" filename, and is worth an explicit test rather than an assumption.
7. **`max_line_length` accepts the literal value `off`** in addition to a number, to explicitly disable a value that might otherwise be inherited from a lower-precedence file — the same escape-hatch pattern exists generically as the value `unset` for *any* property, letting a nested `.editorconfig` cancel a property set by a parent directory's file. Schemas that model properties as `number | boolean | enum` only, with no unset/off sentinel, cannot express this.
8. **Property and value names are case-insensitive per spec but conventionally always written lowercase** — a generator that round-trips a pasted file (like editorconfig.guide's import feature) needs to normalize case rather than assume canonical casing on input.

## 8. Chosen archetype

**Configure-then-generate.** The options *are* the product — there is no external input to transform (unlike base64/case-convert), and the entire job is synthesizing a small, well-known structure from user choices that regenerates as they change, exactly like the `.gitignore` and password-generator examples in §6.7.10's own archetype table.

Why the others are wrong here:
- **Instant transform** — there is no "input text" to paste and transform; nothing to instantly transform *from*.
- **Decision wizard** — most users arrive already knowing "spaces, size 2, LF" or similar; a forced multi-step narrowing question flow would add friction over direct property controls. (A **preset row** gives wizard-like speed to users who don't know their preferences, without forcing everyone through a wizard — see editorconfig.guide's preset chips, which we adopt as an accelerator, not the primary journey.)
- **Drop-and-verdict** — there is no file to drop for a verdict; the closest analogue (paste an existing `.editorconfig` to reverse-populate the form) is a secondary import affordance, not the primary path.
- **Two-pane compare** — nothing is being diffed or compared side by side.
- **Inspect-and-drill** — the output is a short flat text file with no internal structure worth drilling into; nothing to explore.
- **Batch queue** — single small text artifact, synchronous, no queue needed.

## 9. Our design

### 9.1 Journey

1. **Arrival**: page loads with one default section already populated (`glob: "*"`, `charset: utf-8`, `indent_style: space`, `indent_size: 2`, `end_of_line: lf`, `insert_final_newline: true`, `trim_trailing_whitespace: true`), `root = true` checked, and the right-hand `.editorconfig` preview already showing valid, non-empty output — value before any click, matching editorconfig.guide's strongest trait.
2. **First touch — two equally valid entry points**:
   - a. A **preset row** above the sections (e.g. "2-space", "4-space / tabs", "Prettier-like", "Go (tabs)") — one click reshapes the current section's properties.
   - b. Direct edits to any property control (radio/select/checkbox/number stepper) inside a section card.
3. **Live regeneration, no button** — every edit re-renders the preview text immediately.
4. **Multi-section**: "Add a section" appends a new card with its own glob field; a row of quick-glob chips (`*.md`, `*.py`, `Makefile`, `package.json`, `*.{yml,yaml}`) speeds up the common cases instead of requiring the user to remember EditorConfig's own glob dialect.
5. **Shadow warning**: if two sections' globs could both match a property being edited, an inline note names which section wins (last-declared), addressing know-how item 2 directly.
6. **Import (should-have)**: a "paste an existing .editorconfig" affordance parses pasted text back into sections/properties, mirroring editorconfig.guide's reverse path.
7. **Output actions**: Copy and Download buttons pinned at the top of the preview pane, always visible without scrolling; Download must produce a file literally named `.editorconfig` (verified in implementation, not assumed).
8. **Edge cases**: empty/invalid glob defaults back to `*` with an inline note rather than emitting a broken section header; there is no "large input" failure mode since the tool has no external input — only the number of sections a user adds, which just scrolls.
9. **Agent path**: `POST /api/v1/tools/editorconfig-generate` with `{ root: boolean, sections: [{ glob: string, properties: Record<string, string | number | boolean | "unset"> }] }` → `{ editorconfig: string }`. Deterministic, `pure`, synchronous, no upload — fits Core tier per §6.5/§6.7.4.

### 9.2 Layout

- **Desktop**: two-column layout — left column is a vertical stack of section cards (preset row pinned above the first card), right column is the live preview pane with Copy/Download pinned to its own top bar. This mirrors the proven pattern from both timseverien and editorconfig.guide, the two strongest implementations reached.
- **Mobile**: stack vertically — preset row, then section cards, then the preview pane below (or a lightweight tab switch between "Configure" and "Preview" if the stacked column runs too long) — per project convention (`@nebutra/ui` primitives, no raw inputs/selects). Not modeled on any competitor since none of the four had mobile behaviour verified in this pass.
- **Below the fold (optional, SEO)**: a short "What is .editorconfig" explainer and FAQ, strictly below the tool, never interleaved with it — no ad units, no lead-gen banners inside or under the workflow.

### 9.3 Must-have

*without these, a user bounces to a competitor*

- Multi-section glob support (add/remove)
- Core properties: charset, indent_style, indent_size, tab_width, end_of_line, insert_final_newline, trim_trailing_whitespace, max_line_length
- `root = true` toggle
- Live regeneration, no run button
- Copy **and** Download, with Download emitting the literal filename `.editorconfig`
- At least one preset row (fastest path for undecided users)

- Paste-to-import (reverse-populate form from pasted text)
- Per-language quick-glob chips
- Shadow-warning when two sections conflict on a property
- `unset` value support per property (know-how item 7)
- Inline caution on `utf-8-bom`

### 9.4 Deliberately skipped

*and why*

- **Full IDE-specific extension properties** (ReSharper/Roslynator/dotnet_* keys that editorconfig.guide supports) — real long-tail value for .NET shops specifically, but not part of the 80% use case; can be added later as an opt-in "advanced" section without changing the core contract.
- **Account/sign-in, gamification, ad slots, "consultation" CTAs** — none of these serve the tool's job; W3Schools and GitGroomer both carry this weight and it is explicitly the debt we are not importing.
- **Social share buttons in the workflow** (seen on W3Schools) — belongs to page chrome, not the tool itself, if added at all.

### 9.5 Differentiator

- **Same journey grammar as the rest of Forge, zero ads inside the workflow** — none of the four competitors dark-pattern the generate step itself, so our edge here is not "less annoying," it's **consistency**: this tool looks and behaves like the other 148 blades, not like a fourth unrelated product.
- **One implementation, two callers.** None of the four expose an API. Ours ships as a `pure` Generator/Template tool: same engine backs the human page and a `POST` JSON contract (`sections[]` in, `.editorconfig` text out) — callable by MCP/OpenAPI with zero extra work, per §6.5.
- **Multi-section (timseverien/guide) + presets (guide) + surfaced footguns (nobody)** in one page: we take the best-of-four feature set — glob sections, quick presets, per-language pattern chips, paste-to-import — and add the one thing none of them do: an inline warning when a later section shadows an earlier one on the same property, and a caution note on `utf-8-bom`.
- **Correct dot-filename download, verified, not assumed** — since this is a documented friction point in the ecosystem, we explicitly test the download path produces a literal `.editorconfig`, not `.editorconfig.txt` or similar.

### 9.6 I/O contract

```text
Input   { root: boolean, sections: [{ glob: string, properties: Record<string, string|number|boolean|"unset"> }] }
Output  { editorconfig: string }
sideEffect: pure
meterId: forge.template.editorconfig_generate
roots: [generator, template]
objects: [dev-config, text]
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Meter id proposed in §9.6 (`forge.template.editorconfig_generate`); wallet hooks not built |
| 6 | Side-effect class declared | Declared `pure` in this brief |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (named, reached, captured) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

## 11. Gaps and open questions

- [ ] **No competitor was exercised beyond the captured entry state.**
      timseverien's copy/download controls were not visible in the
      above-the-fold capture (§4) and are recorded as "not seen", not
      "absent"; editorconfig.guide's paste-to-import round-trip is quoted
      from its own copy, not tested; GitGroomer's missing Download button is
      an observation about one viewport, not a verified absence.
- [ ] **Mobile behaviour is unverified for all four** (§5) — every capture
      was desktop viewport.
- [ ] **The dot-filename download claim needs a real test, not a plan.**
      §9.3 commits to Download emitting a literal `.editorconfig`; browsers
      and OS save dialogs handle extension-only filenames inconsistently, so
      this needs a cross-browser check before it is stated as a
      differentiator (§9.5).
- [ ] **The shadow-warning rule is specified loosely.** "If two sections'
      globs could both match" (§9.2, item 5) is undecidable in general for
      EditorConfig's glob dialect; the shipped rule needs a concrete,
      documented approximation (e.g. warn only on identical or trivially
      nested globs) rather than an implied full overlap analysis.
- [ ] **The preset list is invented, not sourced** (§9.2 item 2a) —
      editorconfig.guide's presets are named after real conventions
      (Prettier, Airbnb, Linux kernel); ours ("2-space", "Prettier-like")
      would need to match what those tools actually configure, or be named
      generically enough not to imply an endorsement.
- [ ] **.NET/ReSharper extension properties are deferred** (§9.4) — a real
      long-tail that editorconfig.guide serves and we would not.
- [ ] **Privacy note and error codes are not yet decided** (§10 gates 7, 8).
      Side effect (`pure`) and meter id are already declared in §9.6.
