# Tool brief: csv-diff

Root: **Comparator** (46) — CSV Diff (row/column aware). Object: two tabular
(CSV) payloads.

## 1. Demand

- **JTBD:** "Did this export actually change, and where" — a spreadsheet/export
  landed twice (nightly sync, vendor re-send, before/after a migration script)
  and the user needs to know which *rows* were added, removed, or modified —
  not a line-by-line text diff that flags every row as different the moment one
  row shifts position.
- **Keywords:** csv diff, compare two csv files, csv compare tool, diff csv
  rows, csv row diff online
- **Pain:** A generic text/line diff treats CSV as opaque lines, so reordered
  rows, a single inserted row, or a resorted export make the *entire file*
  read as changed even though only one row actually differs. Users need
  identity-based row matching (a key column), not position-based line matching,
  plus a per-cell before/after view for rows that really did change.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| **Diffchecker** | https://www.diffchecker.com/ | Yes — WebFetch + screenshot | `docs/research/forge/csv-diff/diffchecker-home.png` |
| **Datablist CSV Diff Tool** | https://www.datablist.com/tools/csv-diff | Yes — WebFetch + screenshot | `docs/research/forge/csv-diff/datablist-csv-diff.png` |
| **ExtendsClass CSV diff** | https://extendsclass.com/csv-diff.html | Yes — WebFetch + screenshot (landscape stage had this as search-snippet-only; this pass reached it directly) | `docs/research/forge/csv-diff/extendsclass-csv-diff.png` |
| **AllFileTools CSV diff** | https://www.allfiletools.com/csv-diff/ | Yes — WebFetch + screenshot (landscape stage had this as search-snippet-only; this pass reached it directly) | `docs/research/forge/csv-diff/allfiletools-csv-diff.png` |
| **Apify CSV Diff Tool** | https://apify.com/automation-lab/csv-diff-tool | **No** — direct fetch returned HTTP 404; a follow-up search of the Apify Store surfaced no CSV-diff actor either. Not screenshotted (a 404 page is not the tool). Retained in the competitor table below only as "claimed, unverified" from the original search snippet — no feature claim from this listing is treated as confirmed. | — (capture attempted, failed: HTTP 404) |

Two of the five names improved from search-snippet-only to fully reached and
screenshotted this pass (ExtendsClass, AllFileTools). Apify's listed URL no
longer resolves; nothing about it is asserted as fact below beyond "could not
verify."

## 3. Feature inventory

**Datablist CSV Diff Tool** — the category-defining reference implementation;
every other competitor is a simpler or narrower cut of this journey.
- Core strength: true **key-column row matching** — auto-suggests columns
  named `id`/`email`/`sku`/`key`/`uuid`, lets the user pick single or multiple
  key columns, or fall back to full-row comparison when no natural key exists.
- **Columns Mapping** — matches fields with different names across the two
  files (e.g. `customer_id` vs `Customer ID`), so a rename-only schema drift
  doesn't register every row as fully changed.
- **Four-way row classification**: Unchanged / Changed (with the specific
  columns that differ, old value vs new value) / Removed (only in original) /
  Added (only in updated).
- **Join-type control**: full outer join (default, shows all rows), inner join
  (matched rows only), left join (original file as the baseline) — this is a
  real relational-join semantic, not just a filter toggle.
- **Comparison options**: ignore whitespace, ignore case, treat empty and
  null-like values as equivalent.
- **Encoding support** stated explicitly: UTF-8, UTF-8 with BOM, UTF-16 LE,
  UTF-16 BE, Windows-1252, Latin-1.
- **Large-file strategy**: full summary counts always computed, preview capped
  to a manageable sample, full diff still downloadable — "the page remains
  responsive" is stated as the explicit design goal.
- **Export**: three formats — Summary CSV (row status + keys), Changed-rows-only
  CSV, Full-diff CSV (original + updated values) — with a chosen separator and
  an option to include/exclude unchanged rows.
- **No signup, no server-side upload** — stated as fully in-browser.
- Upsell/padding: light — workflow explainer and FAQ below the tool, no ad
  banners or link farms observed.

**Diffchecker** — the category-defining general-diff brand; useful as the
trust/credibility bar, not as a CSV-specific reference.
- No dedicated CSV diff mode was found on the fetched page — the main compare
  surface is generic text, with separate top-nav modes for Images, Documents
  (Word/PDF), Excel, and Folders. CSV is handled as plain text in the generic
  text-compare mode (per the earlier landscape note that it "markets comparison
  across text/CSV/spreadsheet formats"), not as a row/column-aware tool.
  This pass's fetch did not surface a dedicated CSV parser/key-matching UI —
  treated as **not confirmed** rather than assumed absent.
- Two-column "Original text" / "Changed text" layout with file upload on each
  side and a single "Find difference" button.
- Heavy **Desktop App** upsell: "Diffchecker Desktop — the most secure way to
  run Diffchecker... your diffs never leave your computer" with a dedicated
  download CTA — an explicit trust argument for local-only comparison.
- Ships a documented **API** (footer link to a "getting started" guide) and a
  CLI — the only competitor here with a confirmed developer offering.
- 11-language localization — evidence of broad, non-niche traffic.

**ExtendsClass CSV diff** — the lightest, most "raw diff" tool of the five.
- Layout: two vertically stacked plain-text editors ("First CSV to compare" /
  "Second CSV to compare"), pasted or loaded via drag-and-drop, file browse, or
  a `load CSV from URL` fetch (HTTPS-only) — including shareable `url1`/`url2`
  query-parameter links.
- Comparison is explicitly **line-by-line, then field-by-field by position**:
  "it compares line by line, and indicates which fields are different" — there
  is **no key-column matching at all**; the tool states outright that "your CSV
  files must be sorted so you can compare them," pushing the row-identity
  problem entirely onto the user.
- Configurable CSV dialect: separator (comma/tab/semicolon/pipe), quote
  character (single/double), escape character (double-quote/single-quote/
  backslash) — genuine delimiter flexibility, but no row-matching intelligence.
- Output: full result or differences-only, with an optional "Add original row
  number" column for reference; downloadable/copyable.
- Fully client-side, no signup — but ad-supported, with a direct ask to
  disable ad blockers ("advertising is the only resource of this website").

**AllFileTools CSV diff** — the simplest "zero-config" cut of the same job.
- Layout: side-by-side "Old CSV (Before Update)" / "New CSV (After Update)"
  panels, paste or drag-and-drop, live character counters per panel.
- **Implicit first-column key**: "the tool uses the first column (index 0) as
  the key column to match rows" — no manual key picker, no multi-column key,
  no columns-mapping for renamed headers. Rows with missing/empty key values
  get a position-based generated identifier as a fallback.
- **Four-way classification**: Added (green) / Removed (red) / Modified
  (yellow, with per-field old→new values) / Unchanged (hidden by default).
- Options: ignore case, ignore whitespace. Delimiter choice: comma, semicolon,
  tab, pipe, or space.
- No export/download functionality found in the fetched content, no ads, no
  API mentioned — a clean but feature-thin implementation.

## 4. Journey maps

**Datablist** (the journey to match):
1. Land on a two-column upload area: "Original CSV" / "Updated CSV," each
   accepting file browse or drag-and-drop.
2. Upload both files → a **Settings panel** appears: key-column picker
   (auto-suggested, overridable), optional multi-key selection, Columns
   Mapping for renamed fields, join type (full outer / inner / left), and the
   ignore-whitespace / ignore-case / empty-as-null toggles.
3. Result renders as a table: full summary counts up top (added/removed/
   changed/unchanged totals) regardless of file size, then a capped preview of
   individual rows below — each changed row shows which columns changed and
   the old vs new value for those columns specifically (not the whole row
   re-rendered).
4. Navigating between differences is via the preview table itself — filterable
   by status (implied by the four-way classification existing as distinct
   groups), not a "next diff" stepper.
5. Exit: three export options (summary / changed-only / full-diff CSV), with
   separator choice and an unchanged-rows include/exclude toggle.
6. Large input: summary counts always compute in full; only the on-page
   preview is capped — the user is never blocked from getting the complete
   answer, just from rendering every row in the DOM.

**Diffchecker** (generic-text baseline, not CSV-specialized per this fetch):
1. Land directly on two side-by-side text/file inputs and one "Find
   difference" button — no settings panel, no key-column concept.
2. Paste or upload both sides → click Find difference → generic diff renders
   (line/word level, per the tool's general-purpose design).
3. Exit is implied via standard copy/download affordances typical of the
   product family; the Desktop app is pitched as the "your diffs never leave
   your computer" alternative for sensitive data.
4. No row-identity, no per-cell classification — this is the ceiling case for
   "why a generic diff tool is the wrong shape for CSV."

**ExtendsClass**:
1. Land on two stacked paste/upload editors, plus a collapsed "CSV format
   settings" accordion (separator/quote/escape) the user must open to change
   dialect defaults.
2. Paste, drop, browse, or load-from-URL for each side.
3. Comparison runs against **positional** rows/fields — the tool does not ask
   for a key column at all; correctness silently depends on both files already
   being sorted the same way, a precondition stated in prose, not enforced or
   checked by the tool.
4. Output: full or differences-only view, with an optional row-number column;
   copy/download from there.
5. No stated large-file cap; entirely client-side.

**AllFileTools**:
1. Land on two side-by-side panels (Old / New), paste or drop, live character
   counters as immediate feedback that input registered.
2. No settings step is required — the first column is used as the key
   automatically; comparison options (ignore case/whitespace, delimiter) are
   presumably in a lighter settings row near the panels (not detailed further
   in the fetched content).
3. Result renders as four status groups (Added/Removed/Modified/Unchanged),
   Unchanged collapsed by default, Modified rows showing field-level old→new.
4. No export/download step found — the journey may dead-end at "view in
   browser only," which is the qualifying "their debt" for this competitor.

## 5. Layout + screenshots

- **Datablist**: single centered column — two-up upload cards → settings panel
  (dense, multi-control) → preview table (below the fold, capped rows) →
  export button row. Below the working area: an educational workflow walkthrough
  and an FAQ addressing key-column matching, encoding, and join types — content
  that supports the tool rather than padding around it. See
  `datablist-csv-diff.png`.
- **Diffchecker**: two-column "Original text" / "Changed text" input area with
  a single centered "Find difference" button between them; top nav exposes the
  format-specific tools (Text/Images/Documents/Excel/Folders) as separate
  pages rather than tabs within one CSV-aware tool. See `diffchecker-home.png`.
- **ExtendsClass**: single centered column, two editors stacked **vertically**
  (not side-by-side) with a collapsed format-settings accordion above them —
  the vertical stack is a layout choice that trades off the "compare visually
  side by side" affordance most CSV-diff competitors use. See
  `extendsclass-csv-diff.png`.
- **AllFileTools**: single centered column, two panels **side-by-side**
  (Old/New) with character counters directly below each — a lighter-weight
  version of Datablist's two-up upload area, without a distinct settings-panel
  step (options appear to live near the panels rather than as a separate
  stage). See `allfiletools-csv-diff.png`.
- **Mobile**: not directly observed for any of the four reached competitors —
  all captures are desktop-viewport. The side-by-side two-panel layouts
  (Datablist, AllFileTools, Diffchecker) are the ones most likely to need an
  explicit mobile stacking rule (old/new panels full-width, stacked).

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- `docs/research/forge/csv-diff/diffchecker-home.png`
- `docs/research/forge/csv-diff/datablist-csv-diff.png`
- `docs/research/forge/csv-diff/extendsclass-csv-diff.png`
- `docs/research/forge/csv-diff/allfiletools-csv-diff.png`
- Apify (`https://apify.com/automation-lab/csv-diff-tool`): capture attempted,
  failed — HTTP 404, no screenshot on file.

## 6. Their debt

- **Datablist**: least workflow debt of the four — the closest thing to a gap
  is that navigating between individual differences relies on the preview
  table/status grouping rather than a dedicated "jump to next diff" control,
  and the preview cap (unspecified exact threshold from the fetched content)
  means very large files require a download to see the full picture rather
  than paging through results in-page.
- **Diffchecker**: no confirmed CSV-aware row/column matching at all in this
  fetch — CSV appears to be treated as generic text, which is exactly the
  "noisy line-by-line diff" failure mode the JTBD is trying to escape. Heavy
  desktop-app upsell interrupts the page's framing even though the web tool
  itself was ad-light in this capture.
- **ExtendsClass**: no key-column matching whatsoever — correctness depends on
  the user pre-sorting both files identically, an assumption that silently
  produces wrong-looking diffs (every row after an insertion or reorder reads
  as "different") for the exact reordered/inserted-row case the category
  exists to solve. Ad-supported with an explicit ad-blocker-disable ask.
- **AllFileTools**: first-column-as-key is a rigid, non-overridable assumption
  — a file whose first column isn't a stable unique identifier (e.g. a
  `timestamp` or `status` first column) will silently mismatch rows with no
  way to point the tool at the real key. No export/download found — a tool
  that shows you the diff but appears to have no verified way to get it out
  is a genuine dead end for anything beyond eyeballing.
- **Apify**: unverifiable — the named URL 404s and no replacement listing was
  found via Store search. No feature claim about it is treated as confirmed;
  its only role here is as the reason the original landscape stage's "reached:
  false" status for it should be corrected to "attempted, not found," not
  silently dropped.

## 7. Domain know-how

1. **Row identity, not row position, is the correct default equality
   semantic.** A CSV with no explicit primary key still has an implicit one in
   practice — most real exports have a natural key (`id`, `email`, `sku`,
   `uuid`) even when not declared as such. A naive diff that compares row N of
   file A to row N of file B (ExtendsClass's stated model: "must be sorted so
   you can compare them") turns any insertion, deletion, or resort into a
   cascade of false "changed" rows for every row after the disturbance. The
   correct default is key-column matching with auto-suggestion from common
   header names, and an explicit, honest fallback to full-row comparison when
   no key is chosen or found — not silent positional comparison.
2. **A fixed "first column is the key" rule is a trap, not a simplification.**
   AllFileTools' zero-config first-column-as-key shortcut looks user-friendly
   but is wrong whenever the first column isn't a stable identifier (a
   `status` column, a `date` column, an unlabeled index) — it will silently
   produce nonsense pairings rather than fail loudly. Auto-*suggestion* with a
   visible, overridable choice (Datablist's model) is strictly safer than
   auto-*assumption* with no override.
3. **Column-name drift is a distinct problem from row-identity.** Two exports
   of "the same" data taken a version apart commonly rename columns
   (`customer_id` → `Customer ID`, `qty` → `quantity`) without changing the
   underlying schema. A diff that only matches columns by exact header string
   will report every value in a renamed column as "removed from A, added to
   B" — a false full-column diff. Column-name mapping (manual pairing of old
   header → new header) needs to exist as a first-class step, not be
   conflated with row-key matching.
4. **"Changed" needs cell-level granularity, not whole-row granularity.** Once
   two rows are matched by key, the useful answer is *which columns* differ
   and their old/new values — not "row X differs" as an opaque blob the user
   must diff by eye. Reporting a full changed row without naming the changed
   columns forces the user to do the actual comparison work the tool exists to
   automate.
5. **"Empty" is not one value.** `""`, `NULL`, `null`, `N/A`, and a
   whitespace-only cell can all represent "no value" depending on the export
   tool that produced the file, and two exports of the same underlying record
   can legitimately use different empty-value conventions without the
   underlying data having changed. An "ignore empty/null-equivalence" option
   (Datablist's "treat empty and null-like values as equivalent") is required
   to avoid reporting a meaningless representation difference as a real
   content change — but it must be opt-in and visible, never a silent default,
   because sometimes the empty-vs-value distinction is exactly what the user
   is trying to catch.
6. **The join type changes what "the diff" even means, not just what's
   displayed.** Full outer join (see everything: both matched and unmatched
   rows on both sides), inner join (only rows present in both — useful when
   the user only cares about changes to persisting records and additions/
   removals are noise for their use case), and left join (treat file A as the
   authoritative row set, report only what happened to those specific rows) are
   three different *questions*, not three display filters over one answer. A
   tool that only ever computes a full outer join and calls everything else "a
   filter" is quietly wrong for a user who asked "what happened to the rows
   that were already in my system" (a left-join question) — filtering a full
   outer join result down doesn't recover the same semantics.
7. **CSV encoding and dialect are part of correctness, not cosmetics.**
   Delimiter (comma/tab/semicolon/pipe), quote character, escape character,
   and text encoding (UTF-8 with/without BOM, UTF-16 LE/BE, Windows-1252,
   Latin-1) all affect how a row is even *parsed* into fields before any
   diffing can happen. A tool that assumes comma-delimited UTF-8 and silently
   mis-tokenizes a semicolon-delimited Windows-1252 export (common from
   European-locale Excel exports) will produce a diff that looks plausible but
   is comparing garbled fields — wrong, not just imprecise.
8. **Header-row mismatch (different column counts/orders) needs to be
   surfaced as its own condition, not silently reconciled or silently
   dropped.** If file A has 8 columns and file B has 9, or the same columns in
   a different order, a byte/position-naive diff will misalign every field
   after the divergence point. The correct behavior is to match columns by
   header name (post column-mapping) regardless of physical order, and to
   report added/removed *columns* as a distinct, visible fact — not to bury it
   inside per-row noise.

## 8. Chosen archetype

Two-pane compare is explicitly listed in the design doc's archetype table as
"side-by-side inputs, synchronized structured output" and named as fitting
"diff family, comparators" — this is the canonical shape for the whole
Comparator root, and CSV Diff is a textbook instance: two files in, one
synchronized structured verdict out.

Why the other six are wrong here:
- **Instant transform** — wrong shape: an instant transform takes *one* input
  and becomes a transformed output live as you type. This tool fundamentally
  needs *two* inputs before any comparison is even meaningful — there's no
  single-input live-as-you-type version of "diff two files" that makes sense.
- **Configure-then-generate** — no configuration produces this tool's output;
  the settings (key column, join type, ignore-options) *shape* how the
  existing two inputs are compared, they don't generate new content from
  scratch the way a .gitignore-by-stack or password-rule generator does.
- **Decision wizard** — the user isn't uncertain about what they want; they
  already have two specific files and want to know how they differ. There's no
  narrowing-by-questions step before the comparison can run.
- **Drop-and-verdict** — closer than most alternatives (there is a
  "one clear answer, detail on demand" element in the summary-counts-first
  presentation), but Drop-and-verdict is fundamentally single-input analysis
  (a file-type detector, a checksum). This tool's defining interaction is
  reconciling *two* payloads against each other, which Two-pane compare names
  explicitly and Drop-and-verdict does not.
- **Inspect-and-drill** — this tool does have an explore-the-result element
  (drilling into which columns changed on a given row), but that exploration
  is a second-order interaction *after* the two-pane comparison produces its
  structured result — it's not the primary shape the way exploring a decoded
  JWT or a JSONPath tree is for a single input.
- **Batch queue** — real for "diff many file-pairs in one run" (a CI pipeline
  comparing many table exports), but that's the Processor root's job wrapping
  this same single-pair diff logic (per the Detector/Processor split precedent
  in `line-ending-detect.md` §8) — not a reason to make the primary Comparator
  page a job queue.
- **"Form + button"** — the trap here is exactly what ExtendsClass does:
  reduce two structured tabular files to two plain-text boxes and one generic
  "compare" button with no row-identity concept, producing a diff that is
  technically an answer but not the *right* answer for tabular data. A form +
  button loses the specific things this tool must do — key-column matching,
  column mapping, join-type selection — that only make sense as a real
  two-pane structured comparison, not a text blob compare.

## 9. Our design

### 9.1 Journey

*This brief writes the journey inline in 9.2 Layout rather than as a separate step sequence — carried into §11 as an open item.*

### 9.2 Layout

**Layout** — two-up input, settings panel between input and result, summary-
first result with drill-down, following Datablist's proven shape:

- **Top**: two upload/paste panels side-by-side, labeled **"Original CSV"** /
  **"Updated CSV"** (not "Old/New" — "Original/Updated" reads correctly for
  both the "two versions of the same export" and "before/after a migration"
  use cases). Each accepts drag-and-drop file upload, file browse, or direct
  paste; each shows a live row/column count and detected delimiter/encoding
  the moment content lands (parsed via raw bytes, never a lossy textarea
  round-trip for the upload path — same File-API discipline as
  `line-ending-detect.md` domain know-how #4).
- **Settings panel**, renders once both sides have content:
  - **Key column(s)**: auto-suggested from header names matching a small
    known-good list (`id`, `email`, `sku`, `key`, `uuid`, and case/underscore
    variants), shown pre-selected but always changeable; supports selecting
    multiple columns as a composite key; explicit **"No key — compare by row
    position"** fallback option, selected only when the user picks it (never
    silently defaulted, per domain know-how #1–2).
  - **Column mapping**: a simple paired-dropdown list for renaming detection —
    only shown when header sets differ between the two files (per domain
    know-how #3, #8) — pre-populated with best-guess matches (exact match,
    then case/whitespace/underscore-insensitive match), overridable per pair.
  - **Join type**: Full outer (default) / Inner / Left, as a plain radio group
    — not buried in an "advanced" collapse, since it changes the *meaning* of
    the result (domain know-how #6).
  - **Comparison options**: ignore whitespace, ignore case, treat empty/null-
    like values as equivalent (domain know-how #5) — each an explicit,
    off-by-default toggle.
  - **CSV dialect**: delimiter (comma/semicolon/tab/pipe, auto-detected with
    override), quote character, encoding (auto-detected from the byte
    sample — UTF-8/UTF-8-BOM/UTF-16 LE/BE/Windows-1252/Latin-1 — with
    override), per domain know-how #7.
- **Result**, renders live as settings change (no separate "Run compare"
  button once both files are loaded — changing a setting re-runs the
  comparison immediately, since this is a deterministic in-memory operation
  cheap enough to redo on every change):
  - **Summary strip** up top, always computed in full regardless of file size:
    counts for Added / Removed / Changed / Unchanged, plus a **column-set
    mismatch banner** if the two files' header sets differ beyond the mapped
    pairs (domain know-how #8) — this is the "one clear answer" moment before
    any row-level detail.
  - **Result table** below, grouped/filterable by status (Added/Removed/
    Changed/Unchanged, Unchanged collapsed by default as in AllFileTools'
    model but toggleable, not hidden with no way back). Changed rows show only
    the columns that actually differ, old value directly beside new value —
    never the full row re-rendered as an undifferentiated blob (domain
    know-how #4).
  - **Preview cap for very large results** (matching Datablist's model): the
    summary and full machine-readable result are always complete; the
    in-browser table preview is capped to a bounded row count for render
    performance, with an explicit "showing N of M rows — download full result"
    notice, never a silent truncation.
- **Exit actions**: **Copy summary** (human, for a PR comment/Slack message),
  **Download** as Summary CSV / Changed-rows-only CSV / Full-diff CSV (parity
  with Datablist's three export shapes), and **Copy as JSON** — the JSON shape
  identical to the API response, so a human debugging in the browser and an
  agent calling the endpoint see the same contract.
- **Empty/error state**: with only one file loaded, the settings panel and
  result area stay in a neutral "waiting for the second file" placeholder —
  never a false verdict computed against an empty second input. A parse
  failure (malformed CSV, undetectable encoding) surfaces as a specific error
  naming which file and what went wrong (e.g. "Updated CSV: row 42 has 6
  fields, expected 5 based on the header row") rather than a generic failure.

### 9.3 Must-have

**Must-have features** (without these, a user bounces back to a competitor):
1. Key-column matching with auto-suggestion and visible override, plus an
   honest full-row-comparison fallback (parity with Datablist; closes
   AllFileTools' rigid-first-column trap and ExtendsClass's no-key gap).
2. Four-way row classification (Added/Removed/Changed/Unchanged) with
   cell-level old/new values for Changed rows (parity with Datablist and
   AllFileTools; strictly better than ExtendsClass's positional field diff).
3. Join-type selection (full outer / inner / left) as a first-class, visible
   control (parity with Datablist's ceiling; none of the other three offer
   this).
4. Structured JSON output via API/MCP as a first-class artifact, not an
   afterthought scrape target — none of the four reached competitors expose
   this for CSV-aware diffing.
5. Full summary counts always computed regardless of file size, with a capped
   but clearly-labeled preview and a complete downloadable/API result (parity
   with Datablist; avoids AllFileTools' apparent export dead-end).

### 9.4 Deliberately skipped

**Deliberately skipped** (and why):
- **Load-from-URL fetch** (ExtendsClass's feature) — introduces a server-side
  fetch/SSRF surface for a convenience that doesn't change the core diff
  contract; users can paste or upload instead. Revisit only if there's a
  concrete agent-workflow need to diff two already-hosted files by URL.
- **Multi-file batch diffing** — real value or CI pipelines that diff many
  table pairs at once, but per the Detector/Processor precedent in
  `line-ending-detect.md`, that's the Processor root's async job surface
  wrapping this same single-pair diff logic, not a bespoke feature bolted
  onto this Comparator page.
- **In-browser CSV editing** (turning the diff view into an editable grid) —
  out of scope; this tool diagnoses differences, it does not become a
  spreadsheet editor. A `compose.next` link to a CSV-editing tool (if one
  exists in the catalog) is the right bridge, not an inline feature.
- **Desktop-app-style "your files never leave your machine" marketing** — the
  underlying privacy property (client-side parsing where feasible, no
  persistent storage of uploaded content) is a stated fact per §6.5 gate 8,
  not a separate paid product tier the way Diffchecker frames it.
- **Ad banners, "Support Us" boxes, or doorway-link farms** — ExtendsClass
  carries ad-blocker-disable friction; none of that sits inside or adjacent to
  this tool's workflow.

### 9.5 Differentiator

- **Structured JSON output, not a rendered table, as the primary contract.**
  Every reached competitor's "result" is a page — a table, a highlighted diff
  view, a downloadable CSV. None expose a documented API returning typed
  diff data (only Diffchecker has any API at all, and it is for its generic
  text-diff product, not a CSV-aware row/column diff). Ours returns the same
  shape a human sees and an agent consumes: row-level status arrays, per-cell
  changed-field records, and summary counts — usable directly in a CI gate or
  an eval loop without scraping a UI.
- **Key-column auto-suggestion with visible override, not silent assumption.**
  Closes AllFileTools' first-column trap and ExtendsClass's no-key-at-all gap
  in one move, at Datablist's parity level — auto-suggest by common header
  name, always show the chosen key, always allow override or fallback to
  full-row comparison.
- **Join-type as a first-class semantic choice** (full outer / inner / left),
  matching Datablist's ceiling rather than a competitor that only ever
  computes one join and calls the rest filtering.
- **No ad clutter or ad-blocker gating inside the workflow** — unlike
  ExtendsClass's explicit ad-blocker ask, and no forced desktop-app upsell
  interruption like Diffchecker's framing.
- **Deterministic and `pure`** — no model call; this is parsing plus a keyed
  join plus a cell comparison, priced at server-time cost, reproducible, and
  safely composable into a CI pipeline that wants to fail a build on
  unexpected row changes in a generated CSV artifact.

### 9.6 I/O contract

**I/O contract sketch** (for the OpenAPI/MCP surface, §6.5 gate 2):

```text
input:
  original: string | binary       # CSV text or raw file bytes
  updated:  string | binary       # CSV text or raw file bytes
  keyColumns?: string[]           # header names forming the row-identity key;
                                   # omitted → auto-suggest; empty array →
                                   # explicit full-row comparison fallback
  columnMapping?: Record<string, string>   # originalHeader -> updatedHeader,
                                   # only for renamed-but-equivalent columns
  joinType?: enum<full, inner, left>       # default: full
  options?: {
    ignoreWhitespace?: boolean    # default false
    ignoreCase?: boolean          # default false
    treatEmptyAsNull?: boolean    # default false
  }
  dialect?: {
    delimiter?: enum<",", ";", "\t", "|">   # auto-detected if omitted
    quoteChar?: string
    encoding?: enum<utf8, utf8-bom, utf16le, utf16be, windows-1252, latin1>
                                   # auto-detected if omitted
  }

output:
  summary: {
    added: number
    removed: number
    changed: number
    unchanged: number
    totalOriginalRows: number
    totalUpdatedRows: number
  }
  keyColumnsUsed: string[] | null       # null when full-row fallback was used
  columnSetMismatch: {
    onlyInOriginal: string[]
    onlyInUpdated: string[]
  } | null                              # null when header sets fully reconcile
  rows: Array<{
    status: enum<added, removed, changed, unchanged>
    key: Record<string, string> | null  # null under full-row fallback
    original?: Record<string, string>   # present for removed/changed/unchanged
    updated?: Record<string, string>    # present for added/changed/unchanged
    changedFields?: Array<{             # present only when status = changed
      field: string
      oldValue: string
      newValue: string
    }>
  }>                                     # capped to a bounded preview length;
                                         # full result always available via
                                         # the export/download variant of the
                                         # same endpoint
  truncated: boolean                    # true when `rows` was capped
sideEffect: pure
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — research-only brief |
| 6 | Side-effect class declared | Declared `pure` in this brief |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (named, reached, captured) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

**内部验收状态：** `research-complete` — teardown on file per §6.7.10 gate 11
(4 of 5 named competitors reached and captured; Apify's listed URL 404s and is
recorded as unverifiable, not silently dropped or fabricated); archetype
chosen (gate 12) as Two-pane compare; implementation not started (research-only
pass, no application code touched).

## 11. Gaps and open questions

- [ ] **Apify CSV Diff Tool could not be reached** (HTTP 404 on the listed
      URL; no CSV-diff actor found in a follow-up Apify Store search). It
      stays in §2 as "claimed, unverified" and no feature claim is drawn from
      it. If someone re-runs this teardown, either find a live URL or drop the
      listing rather than letting it linger as a phantom competitor.
- [ ] **Diffchecker's CSV handling is "not confirmed", not "confirmed
      absent"** (§3). This pass's fetch surfaced no dedicated CSV
      parser/key-matching UI in its generic text-compare mode, but the tool
      was not exercised with a real CSV pair. Confirm before citing
      "Diffchecker has no key-column matching" as a competitor gap anywhere
      user-facing.
- [ ] **Mobile behaviour is unverified for all reached competitors** —
      captures were desktop-viewport only. Nothing in this brief's layout
      analysis should be read as a mobile claim.
- [ ] **The journey is written inline in §9.2 rather than as an explicit
      step sequence** (§9.1). Before implementation, write the arrival →
      first-touch → result → exit steps out separately so the §6.5 gate 1
      review has something concrete to check.
- [ ] **Meter id, privacy note and error-code set are not yet decided**
      (§10 gates 5, 7, 8) — the file-upload path in particular needs an
      explicit client-side-vs-uploaded statement before ship. The side-effect
      class is already declared `pure` in §9.6.
