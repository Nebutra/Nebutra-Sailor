# Tool brief: `csv-columns`

Root: **Editor** (09, per §6.7.2a / §6.7.9). Object: CSV text (header + rows).

Tier: **Catalog** (§6.5 tiering table) — real, confirmed demand (four
single-purpose competitors split across the select/reorder/rename/drop
operations) but niche relative to Core-tier converters; the value here is
breadth-completeness for the Editor root and a genuine sibling to
`data/csv-preview` and `data/json-csv`, not a high-commercial-search magnet.

**Status:** research-complete — teardown of 4 competitors done (one direct
full-scope match found live during research), design below; no code written
yet.

## 1. Demand

- **JTBD:** "I have a CSV with columns in the wrong order / wrong names / too
  many fields, and I need a clean one out — without opening Excel, without a
  spreadsheet macro, and without hand-editing every row." Concretely: trim a
  wide export down to the fields a downstream import expects, put columns in
  the order a target schema wants, rename headers to match another system's
  field names, or strip a sensitive column before sharing a file.
- **Keywords:** csv column editor, reorder csv columns, rename csv columns,
  delete csv column, remove csv column online, csv column manager, keep
  rename reorder csv columns
- **Pain:** A full spreadsheet re-save round-trips the whole file through
  Excel/Sheets just to touch headers and column order — slow, and it silently
  reformats things (dates, leading zeros, encoding) the user didn't ask to
  touch. A raw text/line editor cannot reorder columns at all without manual
  per-row surgery. Command-line tools (`csvcut`, `awk`) solve it but require
  installing a toolchain and remembering flag syntax for a task done once a
  week. The single-operation tools (delete-only, reorder-only) force multiple
  round trips through different sites when a user needs more than one of the
  three operations at once, and none of the free single-purpose sites do
  streaming/large-file handling — table stakes here is one page, one paste,
  three operations available together.

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| **csvkit.org — CSV Column Manipulator** ("Keep / rename / reorder") | https://csvkit.org/csv-columns | Yes — WebFetch + screenshot (found live under csvkit.org's "Rows & columns" menu during this pass; not in the originally supplied competitor list, but reached directly and is the closest scope match of anything examined) | [`csvkit-keep-rename-reorder.png`](../../research/forge/csv-columns/csvkit-keep-rename-reorder.png) |
| **Tabular — Reorder and Select CSV Columns** | https://www.usetabular.com/tools/csv-reorder-columns | Yes — WebFetch + screenshot | [`tabular.png`](../../research/forge/csv-columns/tabular.png) |
| **HappyCSV — Column Manager** | https://happycsv.com/tool/column-manager/ | Yes — WebFetch + screenshot | [`happycsv.png`](../../research/forge/csv-columns/happycsv.png) |
| **csvkit.org — CSV Editor** (general grid editor, cited in the brief request) | https://csvkit.org/csv-editor | Yes — WebFetch + screenshot. **Correction to the brief's premise:** this page returned HTTP 200 and was fully reachable this pass, not unreached as originally listed. | [`csvkit-editor.png`](../../research/forge/csv-columns/csvkit-editor.png) |
| **wtools.io — Delete CSV Column** | https://wtools.io/delete-csv-column | **Partially** — the Playwright capture script failed (`net::ERR_CERT_DATE_INVALID`, the site's TLS certificate has expired) so **no screenshot exists**. Raw page source was retrieved with `curl -sk` (TLS verification disabled) and inspected directly, including the page's own unminified JS logic, so the feature claims below are from real observed code, not marketing copy. No layout claim is made for this competitor — HTML class names shown are a Gentelella-style admin-dashboard template, not a validated visual read. | — (capture attempted, failed: expired certificate; source retrieved via `curl -sk`, see §3/§6) |

Capture command used for the three fully-reached competitors:

```bash
node scripts/research-screenshot.mjs "<url>" "docs/research/forge/csv-columns/<name>.png"
```

(`.webp` output was attempted first and rejected by the script —
`"unsupported mime type \"image/webp\""` — `.png` is the working extension.)

`docs/research/forge/` is gitignored: the captures are local reference
material, this brief is the committed deliverable.

## 3. Feature inventory

**csvkit.org — CSV Column Manipulator** (core strength: this *is* the
category — the only competitor whose single page does all three operations
csv-columns is scoped to).
- Loads via paste or drag-and-drop; a bare textarea, no spreadsheet chrome.
- Columns render as a **list, one row per column** — not a grid. Each row has:
  a checkbox (ticked = kept, unticked = dropped), a text input pre-filled with
  the current header (editing it renames), and ↑/↓ buttons (reorders).
- Optional "add row-number column" checkbox prepends a sequential index.
- **No run/convert button** — the output textarea ("Output CSV appears here
  after edits…") updates live as checkboxes/text/order change. This is a
  observed *design decision*, not a missing feature.
- Output actions: Copy, Download .csv.
- Footer states "100% client-side. No upload." — verified by the product's
  own copy, not independently confirmed by network inspection here.
- No ads, no signup, no file-size disclosure, no stated limit.

**Tabular — Reorder and Select CSV Columns** (core strength, per its own
marketing copy: schema-matching for repeated imports — "reorder columns to
match a database table's schema").
- **The functional UI is entirely paywalled.** The page shown to a logged-out
  visitor is 100% marketing: a "Pro feature" banner ("Upgrade to Pro to use
  the Reorder Columns tool and process files up to 50 MB"), a before/after
  example table (static image, not interactive), an FAQ, and links to three
  *other* paywalled sibling tools (Rename Columns — Pro, Remove Empty
  Columns, Filter Rows — Pro). There is no reachable input box, no visible
  reorder mechanism, and no free tier for this specific tool. Everything
  about *how* the drag/select interaction actually works is marketing
  description only ("Toggle columns on or off... Selected columns appear in
  the order you click them") — this is copy, not observed behaviour, and is
  labeled as such.
- Confirmed by copy: dropped columns are excluded entirely; original file
  is never modified; files auto-deleted after 24 hours (implies **server-side
  upload**, contradicting the "no upload" pattern the free competitors use).
- Upsell is the entire product for this operation — reorder AND rename are
  both gated Pro features on this site.

**HappyCSV — Column Manager** (core strength: "select columns" only — the
"manager" label overstates the shipped feature set).
- Upload only (drag-and-drop or file browser), explicit "Max 1 file(s) .csv"
  limit stated on the widget itself.
- Interactive checkboxes to keep/drop columns — confirmed working feature.
- **Reorder: "planned for a future update."** **Rename: "planned for future
  updates,"** with a stated workaround — "use Find & Replace on the header
  row if needed." Both of the tool's own headline claims ("Manage CSV
  Columns - Select, **Reorder**, **Remove** Columns Online") are two-thirds
  unshipped as of this capture; this is the product's own FAQ copy, not an
  inference.
- Output: download only, selected columns in their **original** order (no
  reorder available at all yet).
- No ads, explicitly "Free Forever," privacy-forward messaging
  ("100% private client-side processing," "Built for Privacy").

**csvkit.org — CSV Editor** (general grid editor; the free-form-editor trap
§6.7.2 warns against — kept here as the "what NOT to build" reference).
- Full spreadsheet-style grid: click any cell to edit its value directly (not
  just headers), toolbar buttons add/remove arbitrary rows and columns, header
  cells double as rename inputs.
- Own copy states the honest ceiling: "fast for a few thousand rows, sluggish
  for tens of thousands" because it "keeps every cell in memory and re-renders
  the whole table on each edit" — a real, stated scaling limit, not inferred.
- Own copy states scope explicitly: "If you need formulas, conditional
  formatting, charts, or hundreds of thousands of rows, use a real
  spreadsheet" — the product itself draws the line we are drawing.
- 100% client-side, no upload. No ads.

**wtools.io — Delete CSV Column** (single-operation, index-or-name; read from
page source, not screenshot).
- One text input, labeled "Column number or name," defaulting to `1`; one
  text input for the CSV separator (default `,`); one checkbox, "If the CSV
  separator can occur in the field between double quotes."
- Server logic (read from the page's own unminified JS): if the entered value
  is non-numeric, it is looked up against the **first line only**, matched
  against trimmed header cells (with or without surrounding double quotes),
  and converted to a 1-based index; if that lookup fails, or a numeric value
  is out of range, the tool falls through to `"Couldn't parse your CSV data!
  Invalid column number"` — a real, generic, non-specific error string.
- **Splitting is a plain `String.split(separator)`** unless the quote-aware
  checkbox is ticked, in which case it uses one lookahead regex
  (`sep(?=(?:[^"]*"[^"]*")*[^"]*$)`) — a heuristic, not a real CSV
  tokenizer: it does not handle escaped quotes (`""`) inside a quoted field,
  and it splits on `\n` after only replacing the **first** `\r\n` in the
  whole payload (`text.replace("\r\n", "\n")` has no global flag), so a
  CRLF-terminated file with more than one line is normalized incorrectly for
  every line after the first.
- **One column per run, no rename, no reorder** — narrowest of the four.
- Result panel has its own Copy/Download; two AdSense ad slots are present in
  the page markup (`adsbygoogle`, above and below the working area).

**Cross-competitor read.**
- **Table stakes:** paste-or-upload CSV in, a way to drop columns, download
  or copy the result, no signup wall for the core act of removing/keeping
  columns.
- **What only one does:** csvkit.org's Column Manipulator is the *only*
  competitor reached that ships select + rename + reorder together, live,
  for free, with no upload. Everyone else ships at most one of
  {select, rename, reorder} for free and gates or defers the rest.
- **What nobody free-and-working does:** rename-by-mapping (old-name →
  new-name pairs) as a *pasteable spec* rather than a UI click-through — every
  competitor's rename, where it exists at all, is "click the header, retype
  it," which does not scale to a repeated pipeline task and gives an agent
  nothing structured to call.
- **A confirmed hole in the market, not an inference:** the two products
  whose entire marketing headline is "select, reorder, remove/rename" (Tabular
  and HappyCSV) each ship only a fraction of that claim for free — reorder and
  rename are Pro-gated on one, "planned" on the other. Shipping all three,
  free, on one page is a real gap, verified by reading both products' own
  copy, not assumed.

## 4. Journey maps

**csvkit.org — CSV Column Manipulator.**
1. Arrival: title "CSV Column Manipulator," one-line description, empty
   textarea "Paste CSV here, or drop a file…", a Load button + file chooser
   below it, an "add row-number column" checkbox, and an already-visible
   (empty) output textarea beneath — the shape of the whole interaction is
   visible before any data is entered.
2. First touch: paste or drop; click Load (or the drop triggers it — page
   copy says "Load a CSV to manage columns," implying Load is a required
   step, not fully auto).
3. Result appears: the column list renders in place of the loader — one row
   per column: checkbox, editable name, ↑/↓ reorder controls.
4. Edits: every checkbox/text/order change updates the output textarea live
   — **no button between editing a column and seeing the new CSV.**
5. Exit: Copy or Download .csv from the toolbar above the input.
6. Large/malformed input: not observed — no error state was triggered during
   this pass (only the marketing/empty state was captured; a live edit
   session with a real file was not run against this URL).

**Tabular — Reorder and Select CSV Columns.**
1. Arrival: a marketing page for a Pro feature. No input box is present for a
   logged-out visitor.
2. First touch: the only interactive elements are "See Pro plans" links.
   There is no free first touch with the actual tool.
3. Result / exit: not observable — gated entirely behind a paid plan.
4. Large/malformed input: not observed; not reachable without payment.

**HappyCSV — Column Manager.**
1. Arrival: header + subhead, then a drag-and-drop upload card ("Upload your
   files," "Max 1 file(s) .csv") — upload-first, no paste option shown.
2. First touch: drop or browse for a file.
3. Result appears: (from the product's own "How to" copy) a checkbox list of
   columns in their original order.
4. Edits: check/uncheck to keep or drop; no reorder, no rename possible.
5. Exit: "Download CSV with only selected columns."
6. Large/malformed input: not observed.

**csvkit.org — CSV Editor** (reference journey, not our target shape).
1. Arrival: toolbar (+Row, +Column, Example, Clear, Copy, Download) above an
   empty textarea and a Load control, mirroring the Column Manipulator's
   shell.
2. First touch: paste/drop, Load.
3. Result: a full editable grid renders; clicking any cell edits its value
   in place; the grid re-renders on every edit.
4. Exit: Copy or Download .csv.
5. Large input: the product's own copy states the failure mode directly
   ("sluggish for tens of thousands" of rows) rather than leaving it
   unstated — a rare example of a competitor documenting its own ceiling.

**wtools.io — Delete CSV Column** (from source inspection, not a live run).
1. Arrival: a form embedded in an admin-dashboard-template page — paste/drop
   into an Ace-editor input panel, a CSV-separator field, a "column number or
   name" field, a quote-aware checkbox, a Convert button. This is a
   **click-to-run** journey, not live-as-you-type — the opposite pattern from
   csvkit.org's manipulator.
2. First touch: fill the column field, click Convert.
3. Result appears: in a second Ace-editor panel below, only after the click,
   scrolled into view programmatically.
4. Exit: a "download" link on the result panel, or a "Move to Save" button
   whose own microcopy ("Move to 'Paste Code' for Save it") reads as an
   internal feature name leaking into user-facing text — noted as their debt
   in §6, not adopted.
5. Malformed input: a real, observed failure string exists in source —
   `"Couldn't parse your CSV data! Invalid column number"` — fired whenever
   the column reference is non-numeric *and* not found in row 1, or numeric
   but out of range. This is the only competitor here with source-verified
   error-path behaviour.
6. Large input: not observed/not inferable from source (no chunking or
   truncation logic was present in the reviewed script, so behaviour on a
   very large paste is unknown — flagged in §11).

## 5. Layout + screenshots

- **csvkit.org (both tools):** single column, no sidebar. A dense grey
  toolbar strip sits directly above the input, output sits directly below —
  input and output stacked vertically, both visible without scrolling on a
  standard laptop viewport. Below the tool: a short prose explainer, a
  Privacy line, then a large **sitewide tool directory** (six categories,
  dozens of sibling tools) that dominates the fold below the tool itself —
  the tool card is short; the site's real estate below it is navigation, not
  chrome-for-this-tool. Not verified on mobile — desktop capture only.
- **Tabular:** conventional marketing-SaaS layout — top nav (logo, tool
  index, guides, pricing, sign-in), breadcrumb, H1 + subhead, a boxed
  upsell banner directly under the fold, then explainer/FAQ/related-tools
  sections. No working tool is present in the layout to describe. Not
  verified on mobile.
- **HappyCSV:** centered single-column layout, generous vertical whitespace,
  a gradient-bordered upload card as the sole interactive element above the
  fold, "How to" / "Why use this" / FAQ / related-tools sections stacked
  below in individual white cards on a light-grey page background. Not
  verified on mobile.
- **wtools.io:** not independently verified — the retrieved source shows a
  Gentelella-style admin-dashboard template (fixed left sidebar with a large
  nested tool-category menu, top navbar) wrapping the actual form, with two
  ad slots (`adsbygoogle`) positioned directly above and below the
  input/output panels. No screenshot exists to confirm the rendered visual
  weight of this — the class-name read is a structural inference from HTML,
  not a layout observation.

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/csv-columns/csvkit-keep-rename-reorder.png`
- `docs/research/forge/csv-columns/tabular.png`
- `docs/research/forge/csv-columns/happycsv.png`
- `docs/research/forge/csv-columns/csvkit-editor.png`
- (wtools.io: none — capture failed, expired TLS certificate)

## 6. Their debt

- **Tabular gates the entire operation behind payment** — reorder and rename
  are both Pro-only, with no free trial of the interaction itself, only a
  static before/after image. That is the debt this brief exists to not
  repeat: the single closest-named competitor to "reorder and select" cannot
  actually be used by a non-paying visitor at all.
- **HappyCSV's headline overstates its shipped feature set** — "Select,
  Reorder, Remove Columns" is the H1, but reorder and rename are both
  "planned," an unresolved gap between marketing copy and product, worth
  naming plainly rather than copying the pattern of shipping the title before
  the feature.
- **wtools.io carries page-level ad slots** (`adsbygoogle`) directly framing
  the working area, a Gentelella dashboard-template chrome unrelated to the
  tool's actual job, a naive (non-RFC-4180) CSV splitter as the *default*
  behaviour (quote-awareness is opt-in, and even then it is a regex
  heuristic, not a real parser), a single-`\r\n`-replace bug that mis-handles
  multi-line CRLF input, and an internal-sounding button label ("Move to
  Save") that leaked past copy review.
- **csvkit.org's general Editor** is the pattern we deliberately do not copy
  even though it is the best-executed of the four: a full free-form grid
  (arbitrary cell edits, arbitrary +Row/+Column) is a different, larger
  product than a column-operations tool, and the site's own copy admits its
  scaling ceiling. What we *do* take from it: the live-update-with-no-button
  journey, the paste-or-drop-then-list shape, and the plain "100% client-side"
  privacy framing — copy the journey, not the chrome, per §6.7.
- **None of the four** offer a machine-readable way to *specify* the column
  operation (an API, a JSON spec, a CLI-flag-equivalent) — every one is a
  UI-click-through tool only, which is the opening for our OpenAPI/MCP
  contract (§9.6).

## 7. Domain know-how

1. **A "keep list" and a "drop list" are not symmetric inputs, and mixing
   them is where naive implementations break.** csvkit.org's manipulator
   models every column explicitly (checkbox per known column: kept or
   dropped), never an open-ended "type the names to drop" field — because an
   open drop-list has no way to express *reorder* at all, and a name-based
   drop list breaks silently the moment two columns share a header (see
   know-how #3). Source: our own reasoning, cross-checked against the one
   competitor (csvkit.org) that actually ships all three operations and
   chose the explicit-list-of-known-columns shape over a free-text spec.
2. **Rename and reorder must compose, and the natural place to break is
   applying rename before drop instead of after, silently changing which
   column an index-based drop request removes.** wtools.io's own drop logic
   (§3) proves the risk concretely: it resolves a *name* to an *index* against
   row 1 at request time — if a caller's operation spec renamed column 3 to
   `"email"` and then asked to drop `"email"` by that same request, an
   implementation that resolves names against the *pre-rename* header would
   silently drop the wrong column. The contract must state its resolution
   order explicitly (§9.6: indices always resolve against the *original*
   header; names in a rename map always refer to *original* headers; the
   output order is drop → rename → reorder, applied in that fixed sequence)
   rather than leaving it implicit. Source: our own reasoning, informed by
   observing wtools.io's actual resolution code.
3. **Duplicate header names are common in real-world exports (unnamed
   columns exported as `""`, or two source systems concatenated) and any
   contract keyed on *name* alone is ambiguous the moment two columns share
   one.** Every competitor's UI sidesteps this by keying on **position**
   internally even when the visible control is a name (csvkit.org: the
   editable text box is bound to the row's *position* in the list, not to a
   name lookup; wtools.io: explicitly resolves name → 1-based index before
   acting, and only ever finds the *first* match). Source: our own reasoning
   plus wtools.io's observed first-match-only resolution.
4. **CSV row-splitting must be RFC 4180-aware (quoted fields may contain the
   delimiter, `\r\n`, and escaped `""`) or the column count silently drifts
   per row.** wtools.io's own source is the concrete counter-example: its
   default splitter is a bare `String.split(",")` with quote-awareness as an
   opt-in checkbox, and even that opt-in path is a lookahead regex that does
   not handle an escaped quote (`""`) inside a quoted field. Source: RFC 4180
   §2 (fields containing the delimiter, CRLF, or double-quote must be
   enclosed in double quotes, and a double-quote inside such a field is
   represented by two double-quotes), cross-checked against wtools.io's
   actual (non-compliant) implementation.
5. **A single `\r\n` → `\n` normalization must be global, not first-match —
   applying it once (as wtools.io's source literally does,
   `text.replace("\r\n", "\n")` with no `/g` flag) corrupts every line after
   the first line of a CRLF file.** Source: observed bug in wtools.io's own
   retrieved source, cross-checked against JavaScript's documented
   non-global `String.prototype.replace` default behaviour.
6. **Ragged rows (a data row with more or fewer fields than the header) must
   have a stated policy, because a positional column-drop/reorder is
   undefined the moment row length disagrees with header length** — none of
   the four competitors document (or, from what was reached, appear to
   implement) an explicit ragged-row policy; this is a genuine, source-backed
   gap in the market (§3), not just an inference, since it means every
   reached competitor's behaviour on a ragged CSV is unknown/unstated. Our
   contract needs a documented default (pad short rows with empty string,
   truncate/report long rows) rather than silently misaligning columns.
   Source: our own reasoning — flagged because no competitor's own copy
   states a policy either way.

## 8. Chosen archetype

**Configure-then-generate** — the column list (kept/dropped, renamed,
ordered) *is* the product; the output CSV regenerates as the list changes,
with no separate "run" step. This mirrors the one competitor
(csvkit.org's manipulator) that reached the full three-operation scope and
independently arrived at the same no-button, live-regenerate shape.

- **Instant transform** — close, and arguably a valid alternate reading, but
  "instant transform" implies a single dial (case, encoding) with one
  obvious output; here there are three independent, composable knobs
  (keep/drop, rename, order) per column, which is what makes it a
  configuration surface rather than one dial. Chosen mainly because the
  *domain-know-how* interactions between drop/rename/reorder (§7 know-how
  #2) mean the tool must show the user their current configuration as a
  structured list, not just one instant-flip control.
- **Decision wizard** — wrong: the user already knows exactly which columns
  they want and in what shape; there is no narrowing-by-question flow to run,
  and forcing one would add steps to a task every competitor treats as a
  single screen.
- **Drop-and-verdict** — wrong: there is no single pass/fail verdict to
  render; the output is a full transformed file, not a diagnosis.
- **Two-pane compare** — wrong: there is nothing to hold side-by-side and
  diff; one file goes in, one file comes out, csvkit.org's own
  before/after example notwithstanding (that's a static marketing aid, not
  the working tool's shape).
- **Inspect-and-drill** — close cousin (a structure the user explores), but
  this root's job per §6.7.9's own Editor guidance is a *transform*, not just
  exploration/grounding; `data/csv-preview` already owns the pure-inspection
  half of this object, so csv-columns should not re-do read-only inspection
  and should instead own the "then act on it" half.
- **Batch queue:** wrong: single file, single pass, no queue/progress/webhook
  semantics apply to a page-scale CSV edit.

## 9. Our design

### 9.1 Journey

1. **Arrival:** one page, one input surface — a paste box with "Paste CSV
   here, or drop a file…" placeholder text, matching the parity bar set by
   every competitor reached. Empty state: no column list rendered yet, output
   area shows a quiet placeholder ("Load a CSV to manage its columns"),
   mirroring csvkit.org's manipulator (§4) rather than forcing a modal or a
   separate "start" screen.
2. **First touch:** paste, or drop a `.csv` file, or use file-picker (all
   three, matching table stakes from §3). Header row is parsed on input —
   no separate "Load" click is required once text is present (a small,
   deliberate improvement over csvkit.org's Load-button step, since the
   textarea already has the data the moment it's pasted).
3. **Result / column list appears:** each detected column renders as one
   row: an on/off toggle (`@nebutra/ui/primitives` Checkbox, keep/drop), a
   rename `Input` pre-filled with the original header, and up/down
   `IconButton`s to reorder (Geist icon-set arrows, per icon governance —
   never lucide, never inline SVG). This is the whole configuration surface;
   there is no separate "options panel."
4. **Live regenerate:** every toggle/rename/reorder change updates the
   output preview immediately — no run button (§8), matching the one
   competitor that reached full scope. A small first-N-rows preview (not the
   full output) renders under the column list so a large file doesn't stall
   typing; the full transformed CSV is only materialized on Copy/Download.
5. **Exit:** Copy-to-clipboard and Download `.csv`, matching every
   competitor's exit pattern (§4 table stakes).
6. **Error state:** a header-less or empty paste shows an inline message
   ("No header row detected — first line is used as column names") rather
   than wtools.io's generic "Couldn't parse your CSV data!" (know-how #6 —
   name the actual condition, don't collapse every failure into one string).
7. **Large-input path:** parsing runs against the pasted text directly (no
   forced upload for "local" work, unlike Tabular's implied server-side
   handling in §3); the row-count and estimated output size are shown once
   parsed, and the live preview is capped to a bounded number of rows so
   typing in the rename boxes never becomes sluggish on a wide/long file —
   directly answering the pain named in §1 about naive full-grid editors
   degrading (csvkit.org's own Editor's stated ceiling, §3/§6).

### 9.2 Layout

Single column, two-pane-within-one-screen: input/paste area at top (same
placement as every competitor reached), the column-configuration list
directly below it as the primary interactive block (this *is* the tool, so it
gets the most vertical weight — not buried under an options accordion), and
the output/preview + Copy/Download actions below that, all visible without
excess scrolling on a standard laptop viewport, following csvkit.org's
stacked-vertical precedent (§5) rather than Tabular's marketing-first layout
or wtools.io's dashboard-template chrome. No sidebar, no ads, no upsell
banner. Tonal background shift (not a border) separates the paste area from
the column-list block from the output block, per house rules. Mobile: column
rows stack with the toggle/rename/reorder controls staying on one row each
(no horizontal scroll needed — three compact controls per row fits down to a
narrow viewport); not yet verified against a real device, flagged in §11.

### 9.3 Must-have

- **Keep/drop per column** — *parity*, every competitor reached has this.
- **Rename per column** — *parity* against csvkit.org's manipulator, but
  *edge* against Tabular (Pro-gated) and HappyCSV (unshipped) — free rename
  is a real edge relative to two of the four competitors.
- **Reorder per column** — same split: *parity* against csvkit.org, *edge*
  against Tabular (Pro-gated) and HappyCSV (unshipped).
- **Paste-or-upload, no forced upload for local work** — *parity* against
  the three client-side competitors, *edge* against Tabular's implied
  server-side/24h-retention model.
- **Live regenerate, no run button** — *parity* against csvkit.org's
  manipulator, *edge* against wtools.io's click-to-convert pattern.
- **RFC 4180-correct parsing** (quoted fields, embedded delimiters, escaped
  quotes, real global CRLF normalization) — *edge*: know-how #4/#5 show this
  is a genuine, source-verified gap even in a live competitor (wtools.io).
- **Explicit ragged-row policy, stated in the UI** — *edge*: know-how #6 shows
  no competitor states one.
- **Explicit, fixed operation order (drop → rename → reorder) documented in
  the I/O contract** — *edge*: know-how #2 shows this is exactly where a
  naive implementation diverges silently.

### 9.4 Deliberately skipped

- **Cell-content editing** — csvkit.org's own general Editor already owns
  this, and it is explicitly the free-form-editor trap §6.7.2 warns against;
  csv-columns stays a pure structural transform (header/column-shape only),
  never touching row values.
- **Add/remove rows, add new columns from scratch, formulas, joins on a key
  column** — all out of scope; these belong to other Editor/Processor tools
  or are explicitly the general CSV Editor's territory, not this tool's.
- **Multi-file batch processing** — one file in, one file out; a queue
  UI/webhook contract is a `Processor`-root concern (§6.5 Tier A note), not
  this Editor-root tool.
- **Column-name-mapping across two different files** (Datablist-style schema
  matching) — that is a `Comparator`-root concern (csv-diff already owns
  cross-file column matching); this tool only reshapes one file's own
  columns.
- **Ads, signup gates, Pro paywalling of any of the three operations** —
  refused on purpose; this is precisely the debt named in §6 for Tabular and
  the overstatement named for HappyCSV.
- **Server-side upload/retention model** — refused; matches the "100%
  client-side, no upload" pattern of three of the four competitors, not
  Tabular's implied 24-hour-retention model.

### 9.5 Differentiator

- **Only reached tool that ships all three operations (keep/drop, rename,
  reorder) together, free, live, with no upload** — checked directly against
  §3/§6: Tabular gates two of the three behind Pro, HappyCSV has shipped only
  one of the three (the other two are "planned"), wtools.io does one
  operation only, csvkit.org's general Editor does all of this but as a much
  larger, heavier, cell-editing surface with its own documented scaling
  ceiling. csvkit.org's *dedicated* manipulator is the one true peer in scope
  — our edge over it specifically is the machine contract below (it has none)
  and RFC-4180-correct parsing with a stated ragged-row policy (know-how
  #4–#6, which its page makes no claims about either way).
- **One declared, spec-first machine contract** (§9.6) where every reached
  competitor is UI-only — an agent can post `{ csv, keep/drop, renames,
  order }` and get structured CSV back in one call, instead of driving a
  browser.
- Structural edges that generically apply per house policy (no ad clutter,
  composition with `data/csv-preview` and `data/json-csv` as siblings) are
  real here but are not the headline claim — the headline is the completeness
  + correctness gap named above, verified against actual competitor copy and
  source, not asserted.

### 9.6 I/O contract

```text
input: {
  csv: string,                       // raw CSV text, header row required
  delimiter?: string,                // default ","; single char
  operations: {
    // Indices/names below always resolve against the ORIGINAL input header,
    // never against a partially-transformed intermediate state (know-how #2).
    keep?: (number | string)[],      // column indices (0-based) or original
                                      // header names to retain; if omitted,
                                      // all columns are kept by default
    drop?: (number | string)[],      // indices or original header names to
                                      // remove; applied before `keep` is
                                      // interpreted as a final allow-list
    rename?: { from: string, to: string }[],  // `from` = ORIGINAL header name;
                                      // ambiguous (duplicate) `from` matches
                                      // the first occurrence only, and a
                                      // `duplicateHeaderWarning` is returned
                                      // (know-how #3)
    order?: (number | string)[],     // final column order, by original index
                                      // or ORIGINAL name; columns omitted
                                      // from `order` but present after
                                      // keep/drop are appended in their
                                      // original relative order
  },
  raggedRowPolicy?: "pad" | "truncate" | "reject",  // default "pad" — short
                                      // rows padded with "", long rows
                                      // truncated to header length, or the
                                      // whole request rejected with an error
                                      // (know-how #6)
}
output: {
  csv: string,                       // transformed CSV, drop -> rename ->
                                      // reorder applied in that fixed order
                                      // (know-how #2)
  columns: string[],                 // final header, post-transform
  rowCount: number,
  warnings: {
    duplicateHeaders?: string[],     // original header names that occurred
                                      // more than once, if `rename`/`keep`/
                                      // `drop` referenced one by name
    raggedRows?: { line: number, expected: number, actual: number }[],
  },
}
sideEffect: pure
meterId: forge.editor.csv-columns
roots:   [Editor]
objects: [csv-text]
```

Sketch, not a final schema — the exact TypeScript/Zod shape is for
implementation, but the fixed-order semantics (drop → rename → reorder,
original-header-relative indexing) are load-bearing decisions from §7 and
must survive into the real schema unchanged.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — design specified in §9.1/§9.2, mobile behaviour not yet verified against a real device |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — sketch in §9.6, no schema file written |
| 3 | MCP tool registration (Agent-eligible tools) | Not started |
| 4 | SKILL.md (what / when / how / limits) | Not started |
| 5 | Meter id + wallet hooks | Not started — id proposed (`forge.editor.csv-columns`) in §9.6 |
| 6 | Side-effect class declared | **Met** — `pure`, §9.6 |
| 7 | Stable error codes; `request_id` on server paths | Not started — only the ragged-row/duplicate-header *conditions* are named (§9.6); no error-code table written |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — design commits to client-only (§9.4) but the actual privacy copy is not written |
| 9 | Decl/ads: intent title, unique value, related tools | Not started |
| 10 | Decl engine metadata: upstream SOTA name + version | N/A — pure function, no upstream model/engine dependency |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6, four competitors reached (one via source-only inspection), one screenshot gap disclosed (wtools.io, expired TLS cert) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8, Configure-then-generate, other six argued away |

## 11. Gaps and open questions

- [ ] **wtools.io was not screenshotted.** `scripts/research-screenshot.mjs`
      failed with `net::ERR_CERT_DATE_INVALID` (the site's TLS certificate has
      expired). Its feature/behaviour claims in this brief come from
      `curl -sk` raw source inspection (including reading its own unminified
      JS), which is a stronger source than marketing copy but still not a
      verified visual layout — §5's layout note for wtools.io is explicitly
      labeled a structural inference, not an observation.
- [ ] **Tabular's actual interaction mechanics are marketing copy, not
      observed behaviour** — the entire working tool is Pro-gated, so
      "Toggle columns on or off... appear in the order you click them" is
      quoted from the product's own FAQ, never exercised.
- [ ] **csvkit.org's manipulator was not exercised with a real large or
      malformed CSV during this pass** — the empty/marketing state was
      captured, but no live edit session was run against it, so its actual
      error-state text and its behaviour on a ragged or very wide CSV are
      unverified (contrast with wtools.io, where the error string comes from
      real source).
- [ ] **Mobile layout is unverified for all four competitors and for our own
      design** — every capture in §5 is desktop-only; §9.2's mobile claim is
      a design intent, not a tested layout.
- [ ] **The original competitor list supplied for this task said csvkit.org's
      general CSV Editor was "not reached" and wtools.io "not reached."**
      This pass found csvkit.org's Editor fully reachable (HTTP 200) and
      wtools.io reachable via `curl -sk` (though not via the standard
      screenshot pipeline, due to its expired certificate) — both corrections
      are recorded in §2 rather than silently overwritten.
- [ ] **csvkit.org's dedicated `/csv-columns` manipulator was not in the
      originally supplied competitor set at all** — it was found live during
      this pass by following csvkit.org's own "Rows & columns" navigation
      menu, and turned out to be the single closest scope match of anything
      examined; flagged here so a future reader knows it was discovered, not
      handed to us.
- [ ] **Duplicate-header collision behaviour (know-how #3) is a design rule,
      not yet implemented or tested** — no competitor's actual duplicate-name
      handling was observed in a live run (csvkit.org's manipulator wasn't
      exercised with a duplicate-header file; wtools.io's first-match
      behaviour is read from source, not from a duplicate-header test case
      run against it).
- [ ] **The pain named in §1 about command-line tools (`csvcut`/`awk`)
      requiring installed tooling is answered by §9's client-only, no-install
      web page** — but no comparison against actual `csvcut` output was run;
      this is asserted as a reasonable inference about the CLI alternative's
      friction, not a verified head-to-head.
- [ ] **Every §9 subsection is written** (9.1–9.6); no open subsection.
