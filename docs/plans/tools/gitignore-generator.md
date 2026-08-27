# Tool brief: gitignore-generator (.gitignore Generator)

Root: **Template** (21) — currently empty (§6.7.9 priority 1: "highest web-first
frequency and trivially deterministic"). This is the first tool proposed to
open that root.

## 1. Demand

- **JTBD:** starting or cleaning up a repo → paste/pick the stack(s) in use →
  get a correct `.gitignore` → copy or download it into the repo root.
- **Keywords:** gitignore generator, .gitignore generator, gitignore online,
  node/python/macos gitignore.
- **Pain:** hand-writing a `.gitignore` misses OS cruft (`.DS_Store`,
  `Thumbs.db`), IDE cruft (`.vscode/`, `.idea/`), and language-specific build
  artifacts the author doesn't think of; copy-pasting from Stack Overflow
  produces stale or conflicting rules; combining more than one stack (e.g.
  Node + Python + macOS + VS Code in one monorepo) means manually merging
  several templates by hand.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| gitignore.io (Toptal) | https://www.toptal.com/developers/gitignore | Yes | `docs/research/forge/gitignore-generator/gitignore-io-toptal.webp` |
| github/gitignore | https://github.com/github/gitignore | Yes | `docs/research/forge/gitignore-generator/github-gitignore.jpg` |
| CodeShack Gitignore Generator | https://codeshack.io/gitignore-generator/ | **No — HTTP 403 on both WebFetch and headless screenshot, tried twice** | none |
| GitLoop .gitignore Generator | https://www.gitloop.com/tool/gitignore-generator | Yes | `docs/research/forge/gitignore-generator/gitloop-gitignore-generator.webp` |

CodeShack could not be verified. It is not described further below — no
feature, layout, or journey claim is made about it. It remains a listed
competitor by search presence only.

## 3. Feature inventory

**gitignore.io (Toptal)** — the reference implementation.
- Core: type-ahead search box over "Operating Systems, IDEs, or Programming
  Languages"; multi-select (you keep typing/adding after the first pick);
  press **Create** to generate.
- The generated file is served from a real, documented API:
  `GET https://www.toptal.com/developers/gitignore/api/<comma,separated,stacks>`
  — confirmed live by fetching
  `.../api/node,python,macos,visualstudiocode`. Each stack becomes a
  `### <Name> ###` section, stacks are alphabetized in the URL-independent
  merged output, and the file opens and closes with `# Created by` /
  `# End of` banner comments that carry the exact request URL used — so the
  request is reproducible and self-documenting. (The banner text itself is
  not quoted verbatim here; only the request URL in the row above was
  captured.)
- Has a public CLI (documented at a separate "Command Line Docs" link) and
  publishes its source code (link on the page) — this is the one competitor
  here with an actual API surface, not just a page.
- No visible ads on the tool page itself; the surrounding Toptal top bar
  carries "Hire the world's top talent" recruiting banners (chrome, not
  workflow interruption).
- Upsell/padding: none observed on the tool screen itself — the whole page is
  the search box + Create button + two doc links.

**github/gitignore** — not a generator UI, the raw template corpus.
- A GitHub repo (CC0-1.0 licensed) of ~175+ individual `<Name>.gitignore`
  files: root-level for mainstream languages/frameworks, `Global/` for
  editor/OS/tool templates, `community/` for niche/less-mainstream ones.
  Structure confirmed via GitHub page fetch.
  No generator UI — used two ways: (a) copy a single file directly into a
  repo, or (b) it is the literal data source populating GitHub.com's own "Add
  a .gitignore" **single-select** dropdown when creating a new repository —
  which is why it matters here even with zero UI of its own: it is the
  template supply most other generators (including gitignore.io) build on.
  GitHub's own repo-creation flow only lets you pick **one** template at
  creation time — it does not compose multiple stacks the way gitignore.io
  does.

**GitLoop .gitignore Generator** — reached, and the reach reveals real debt.
- The page is not a stack picker at all. It is a **generic "paste code, click
  Generate" AI-tool shell** reused across GitLoop's whole tool catalog: a
  raw textarea labeled "Enter your code here", a purple **Generate →**
  button, and a second read-only textarea labeled "Generated code will
  appear here" — confirmed by screenshot
  (`docs/research/forge/gitignore-generator/gitloop-gitignore-generator.webp`).
  There is no stack search, no checkbox list, no template selection UI of any
  kind visible above the fold or below it.
  Below the tool: a two-column grid of ~24 unrelated tool links (Dockerfile
  Generator, SQL Formatter, JSON↔TypeScript converters, code-language
  converters, "AI Code Reviewer") — the same link farm on every one of
  their tool pages, confirming the "SEO farm, same operator, cloned page"
  characterization from the landscape survey. The real product being sold is
  "Try GitLoop — The AI That Knows Your Entire Codebase" (a CTA banner sits
  directly above the tool, mid-page, before any input).
  This is templated marketing surface wearing a tool costume, not a
  purpose-built `.gitignore` generator — a real risk to a naive teardown that
  only reads its marketing copy ("Choose languages, frameworks, OS files,
  IDEs, Docker...") instead of the actual rendered page.

## 4. Journey maps

**gitignore.io** (the only competitor with a real, verifiable stack-picker
journey):
1. Arrival: single search box, placeholder "Search Operating Systems, IDEs,
   or Programming Languages", plus a green **Create** button beside it — that
   is the entire above-the-fold content (confirmed by screenshot).
2. User types a partial name (e.g. "nod") and an autocomplete/type-ahead list
   surfaces matches; picking one adds it, and the box stays open for more —
   this is how multiple stacks get combined into one file (confirmed by the
   multi-stack API response format: sections in the merged output, one per
   selected stack).
3. Nothing renders until **Create** is pressed — this is a
   configure-then-generate flow, not a live-as-you-type one, because the
   "configuration" (which stacks) has to be finished before there is anything
   coherent to show.
4. Result: the generated file is served as its own page/response (the API
   endpoint doubles as the web result), banner-commented top and bottom with
   the exact request URL — which is itself the "copy the request, get the
   same file later" mechanism; no separate modal or drawer.
5. Getting it out: because the result is a real URL with real Content-Type
   text output, users can `curl` it directly, or select-all/copy from the
   rendered page; the CLI wraps the identical API.
6. Large input / error: N/A in the meaningful sense — the input is a small
   list of stack names, not a blob; an unrecognized stack name simply won't
   autocomplete/select.

**github/gitignore** journey is entirely different in kind: it is a file
browser, not a tool. Arrival is a repo README; the user clicks into a single
`<Name>.gitignore` file, views raw text, and copies or downloads it. No
combination step exists here at all — that gap is exactly what gitignore.io
exists to close on top of this same data.

**GitLoop** journey: arrival shows the CTA banner, then the generic
input/output textarea pair, then Generate. There is no stack-selection step
observed — matching its generic-tool-shell shape rather than a template
picker, so no further journey detail can be verified.

## 5. Layout + screenshots

- **gitignore.io**: everything above the fold, centered, single column: logo
  wordmark → one-line tagline → search+Create bar → two doc links
  (Source Code | Command Line Docs). No sidebar, no options panel, no visible
  output area until a Create request completes (the result is a full
  page/response, not an inline panel). Confirmed via full-page screenshot at
  desktop viewport.
- **github/gitignore**: standard GitHub repo layout — file tree left/top,
  README below; not a "tool layout" at all.
- **GitLoop**: vertical stack — hero title → subtitle → CTA banner → input
  textarea (full width, ~270px tall) → Generate button (full width) → output
  textarea (full width, matching height) → a dense two-column link grid of
  ~24 other tools taking up roughly the rest of the page height, then a
  newsletter capture block, then a large footer link directory. Confirmed by
  full-page screenshot — the tool itself is a small fraction of total page
  height; most of the page is cross-sell surface.

## 6. Their debt

- **gitignore.io**: no debt observed in the tool page itself. The only friction
  is structural, not a dark pattern: the flow requires knowing stack names to
  search for, and there is no browse/checklist view of "all 571 templates" on
  the landing page itself (that view exists but is not the entry point).
- **github/gitignore**: not a generator, so "debt" doesn't apply the same way
  — but its structural limit (GitHub's repo-creation dropdown is single-select)
  is a real gap that a combining tool like gitignore.io (and ours) fills.
- **GitLoop**: the generic-shell page is itself the debt — it is not
  purpose-built for this job (no stack picker, no template awareness visible),
  it exists primarily to funnel visitors into "Try GitLoop" and a 24-tool
  cross-sell grid, and it could not be verified to actually produce a correct,
  complete `.gitignore` (an LLM-shaped "paste code → Generate" box is the
  wrong tool shape for a job that has a deterministic, enumerable answer).
- **CodeShack**: unverifiable — HTTP 403 on every fetch attempt. No debt or
  feature claim made.

## 7. Domain know-how

1. **The right unit is a stack name, not a language.** "Node" and
   "macOS" and "VisualStudioCode" are independent, composable template units
   — OS, IDE, and language/framework are three different axes a real project
   needs simultaneously (a Node project on a Mac edited in VS Code needs all
   three). A single-template picker (GitHub's own repo-creation dropdown) is
   a known limitation precisely because it forces one axis only.
2. **Templates must be additively merged, not just concatenated blindly** —
   the reference output uses `### Name ###` section banners so a human can
   see which rule came from which stack, and de-duplicates/organizes so
   overlapping patterns (e.g. `dist/` showing up under multiple ecosystems)
   don't read as redundant noise.
3. **The template data itself is a maintained corpus, not a one-off list** —
   github/gitignore is the community-curated source of truth (CC0, actively
   PR'd) that other generators build on. Hand-authoring rules per stack from
   scratch means perpetually falling behind as tools/frameworks add new
   default directories (e.g. new bundler cache folders). The correct approach
   is to treat template content as data to sync/vendor, not logic to
   hand-write.
4. **Global vs project-root templates are a distinct category.** OS files
   (`.DS_Store`, `Thumbs.db`) and editor files (`.vscode/`, `.idea/`) are
   commonly added to a user's **global** gitignore rather than every repo's
   — a generator serving both "add to my repo" and "here's what to put in
   your global gitignore" use cases needs to make that distinction visible,
   not conflate them into one undifferentiated list.
5. **A generated `.gitignore` only stops future untracked files** — it does
   nothing about files already tracked by git. Every credible competitor
   implicitly assumes this (none claim otherwise) — but it's the single most
   common support-question class for this tool category ("I added it and my
   file is still showing up") and worth a one-line inline note so users don't
   file that confusion against us.
6. **Combining stacks is the whole value-add over the raw template repo.**
   If the tool only reproduces `github/gitignore`'s single-file copy-paste
   job, it duplicates something already one click away on GitHub itself with
   zero differentiation. The generator's reason to exist is the multi-select
   merge step.

## 8. Chosen archetype — Configure-then-generate

Per §6.7.10 this fits **configure-then-generate**: "the options *are* the
product; output regenerates as they change" — the explicit sibling example
given in the spec is ".gitignore by stack."

Why the others are wrong here:
- **Instant transform** (no button, live-as-you-type) doesn't fit: there is
  no single input value to transform live — the input is an open-ended,
  growing *set* of stack selections, and showing a half-typed search query
  as if it were the answer would be actively wrong. A "compose the set, then
  produce" step is the honest shape (which is also what gitignore.io itself
  does — it does not regenerate on every keystroke of the search box, only
  after Create).
- **Decision wizard** doesn't fit: users already know their stack names
  (Node, Python, macOS...) — the friction isn't *deciding* what they want in
  a narrowing dialogue, it's *composing* a set they already know. A wizard
  that asks "what OS? what language? what IDE?" one screen at a time would
  add clicks for no benefit over a multi-select search box.
- **Drop-and-verdict** doesn't fit: there is no file to drop and analyze —
  the input is a choice of named templates, not a blob to inspect.
- **Two-pane compare / inspect-and-drill / batch queue** don't apply: there's
  nothing to diff, no nested structure to explore, and no batch of files —
  the domain fits none of their shapes.
- **Form + button as a fallback** would technically also cover this, but it's
  the wrong argument to make when configure-then-generate is a *named*
  archetype in §6.7.10 whose canonical example is this exact tool.

## 9. Our design

### 9.1 Journey

*concrete enough to build from*

1. **Arrival**: a multi-select search input (placeholder: "Search languages,
   frameworks, OS, or editors…") plus a **generate**-labeled primary action,
   above a live-updating tag row showing currently selected stacks (each with
   an `×` to remove). This mirrors gitignore.io's proven shape but exposes
   the selected set as visible chips instead of hiding it inside the search
   box, which is a small, low-risk UX upgrade over the reference (users can
   see and prune their whole selection without re-searching).
2. **Selecting stacks**: as the user types, a filtered dropdown list of known
   template ids appears (fuzzy-match against the vendored template corpus,
   §7 point 3). Selecting an item adds it as a chip and the search box
   clears for the next pick, matching gitignore.io's "keep adding" motion.
3. **Regeneration**: unlike a from-scratch instant-transform, the output DOES
   regenerate automatically the moment the selection set changes (add or
   remove a chip) — no explicit Generate click required once at least one
   stack is selected. This is the "options are the product, output
   regenerates as they change" half of the archetype and is a deliberate
   improvement over gitignore.io's separate Create click: our merge step is
   cheap (string concatenation over static template files) so there is no
   compute reason to gate it behind a button. Preserve a visible Generate
   affordance only as a no-op safety net for users expecting one (keyboard
   accessibility, screen readers announcing state change) — not as a
   required step.
4. **Output panel**: monospace, syntax-neutral text area showing the merged
   file with the same `### Name ###` section banners as the reference
   (this is a known-good, self-documenting convention worth keeping — "取其精华") —
   plus a **top banner comment** stating this was generated by
   forge.nebutra.com with the exact stack-id list, so a regenerated/updated
   file downloaded later is traceable back to its inputs, same idea as
   gitignore.io's URL banner but without requiring the user to reconstruct a
   URL by hand.
5. **Getting it out**: both a **Copy** button (clipboard) and a **Download**
   button that saves literally as `.gitignore` (not `.txt` — a real
   filename users can drop straight into a repo root). Both visible at once,
   not one behind a menu.
6. **Global vs project note**: a small, non-interruptive inline note
   distinguishing OS/editor entries a user may prefer in their **global**
   gitignore from language/framework entries that belong in the repo — this
   directly answers domain-know-how point 4 above, which no competitor
   surfaces explicitly.
7. **Empty state**: with zero stacks selected, show a short static hint
   ("Pick at least one language, OS, or editor above") rather than an empty
   textbox with no explanation — avoiding the "禁七 generic empty-state"
   language, this is a specific instruction, not a "no data available" stub.
8. **Large input / error behavior**: not meaningfully applicable — the
   input is a bounded set of enum picks, not a blob, so there is no large-
   input degradation path to design for. An unknown/mistyped search term
   simply won't match anything in the dropdown; no error state needed beyond
   "no matches" in the dropdown itself.

### 9.2 Layout

- Single column, centered, `max-w-[var(--container-text)]` (reading-width
  container — this is a short, focused tool, not a dense dashboard).
- Top to bottom, all above the fold on desktop: title/intent line → search +
  chip row (the "configure" surface) → output panel (monospace, scrollable if
  long) → Copy / Download action row directly under the output → the global-
  vs-project note as a small caption under the actions.
- No options density beyond the stack picker itself — there is nothing else
  to configure (no "compact vs verbose" mode; the merged template content is
  the product).
- Mobile: single column collapses naturally; the chip row wraps; output panel
  keeps horizontal scroll for long lines (rare in gitignore syntax) inside its
  own scroll container per the responsive rule.

### 9.3 Must-have

*without these, a user bounces back to gitignore.io*

- Multi-stack composition (not single-template pick) — this is the entire
  reason to exist over `github/gitignore`'s raw files or GitHub's own
  single-select repo-creation dropdown.
- Fast, accurate autocomplete over a real, current template corpus — a stale
  or thin template list is instantly noticeable to the exact audience (devs)
  who would compare it against gitignore.io.
- Both copy and download, with the download literally named `.gitignore`.
- Section-labeled output (`### Name ###`) so a merged multi-stack file stays
  legible — dropping this would be a real regression from the incumbent.

### 9.4 Deliberately skipped

- **A public CLI wrapping our own API** (gitignore.io has one) — out of scope
  for a first ship; our OpenAPI + MCP surface already gives agents/scripts a
  callable contract without a bespoke CLI binary (§6.5 gate 2–3 cover this
  more generally than a one-off CLI would).
- **A full "browse all templates" checklist UI** (nice-to-have on
  gitignore.io, not the entry point even there) — search-first is the proven
  primary path; a browse view can be added later without changing the
  runner's core contract.
- **GitLoop's generic AI-paste-box shape** — explicitly rejected: this
  problem has a deterministic, enumerable answer (domain know-how point 3),
  so routing it through an LLM "explain/generate my gitignore from pasted
  code" flow would be strictly worse (slower, non-reproducible, and
  `external`/metered for no reason) than a static template merge. This is
  also why the tool ships as `pure`, not as a Router-backed shell.

### 9.5 Differentiator

- **One capability, two surfaces on one contract**: the same merge logic
  backs the human page, the OpenAPI operation, and an MCP tool — an agent
  scaffolding a new repo can call this directly and get back structured
  `stacksResolved`/`notFound` fields, something none of the four competitors
  here offer (gitignore.io has a CLI and an ad-hoc text API with no schema;
  GitLoop and the raw GitHub repo have no programmatic contract at all).
- **No ad/cross-sell interruption** — GitLoop's page spends most of its
  height funneling to "Try GitLoop" and a 24-tool link farm; ours puts the
  entire workflow above the fold with nothing competing for attention.
- **Regenerate-as-you-configure** instead of gitignore.io's separate Create
  click — a small but real reduction in the step count for the exact same
  job, justified because the underlying operation is cheap enough to not
  need a submit gate.

### 9.6 I/O contract

*for the runner + machine surface*

- **Input**: `{ stacks: string[] }` — an ordered or unordered array of
  template ids drawn from the vendored corpus (validated against a known-id
  enum/set at request time — reject unknown ids with a stable error code
  rather than silently dropping them).
- **Output**: `{ content: string, stacksResolved: string[], notFound: string[] }`
  — the merged file text, the list of ids that actually resolved, and any
  requested ids that didn't match anything (so an agent caller gets a
  structured signal instead of a silently smaller file).
- **Side effect**: `pure` — the whole operation is static-template lookup +
  string merge, no upload, no external call, matching the F2 "pure-first"
  posture (§6.7.8) and the 99.3%-pure north star (§6.7.7).
- **Meter**: `forge.template.gitignore_generate`.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — contract sketched in §9.6 |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Meter id proposed in §9.6 (`forge.template.gitignore_generate`); wallet hooks not built |
| 6 | Side-effect class declared | Declared `pure` in §9.6 |
| 7 | Stable error codes; `request_id` on server paths | Partially specified — §9.6 requires rejecting unknown template ids with a stable code; the code set itself is not defined |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — no upload path exists, but the note is still unwritten |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — the vendored template corpus needs a stated source + version (see §11) |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (three of four reached; CodeShack unverified, see §11) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

**Internal acceptance status:** `planned` — no implementation exists yet in
`packages/ai/forge-runtime/src/tools/` (verified: no `gitignore` reference in
that tree as of this research). This brief is the required §6.5 gate 11
("competitor teardown on file") and §6.7.10 archetype decision, to be
consumed by whoever implements `template/gitignore-generate`.

## 11. Gaps and open questions

- [ ] **CodeShack could not be reached** — HTTP 403 on both WebFetch and
      headless screenshot, tried twice. It stays in §2 as a search-presence
      listing only; no feature, layout or journey claim is made about it, and
      none should be added downstream without a successful reach.
- [ ] **The template corpus has no stated vendoring plan.** §7 item 3 is
      right that `github/gitignore` (CC0) is the corpus to sync rather than
      hand-author — but this brief does not say how it is vendored, how often
      it is refreshed, which commit/version we ship, or what the merge step
      does when upstream renames a template. That is the difference between
      "current" (our stated must-have) and "stale within a quarter".
- [ ] **gitignore.io's banner-comment text was not captured verbatim** (§3) —
      only the request URL was. The claim that its output is
      "self-documenting" via banner comments carrying the request URL is
      correct in shape but the exact strings are not quoted here.
- [ ] **The de-duplication behaviour in §7 item 2 is asserted, not
      observed** — a multi-stack response was fetched, but overlapping
      patterns across ecosystems (e.g. `dist/`) were not specifically checked
      to see whether gitignore.io actually de-duplicates or merely
      concatenates.
- [ ] **Global-vs-project guidance (§7 item 4, §9.1 step 6) has no chosen
      presentation** — it is a note in the journey, but which entries are
      classified "global" and where that classification comes from is
      undecided.
- [ ] **Mobile behaviour unverified** for the reached competitors (desktop
      captures only).
- [ ] **Error-code set and privacy note are not yet written** (§10 gates 7,
      8), and the vendored-corpus source/version needed by gate 10 is not
      chosen.
