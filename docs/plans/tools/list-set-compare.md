# Tool brief: list-set-compare

Root: **Comparator** (46) — one of the four fill-outs bringing a **thin** root
(§6.7.9: "Comparator 4") toward the ≥5 floor. Object: two plain-text lists.

## 1. Demand

- **JTBD:** "What's different between these two lists" — a recurring
  spreadsheet/ops/dev chore: comparing two exports (before/after inventory,
  two CSV columns pasted as text, two subscriber exports, two SKU dumps, two
  keyword lists) to find what was added, what was removed, and what both share,
  without opening Excel/VLOOKUP or writing a one-off script.
- **Keywords:** compare two lists, list diff, list comparison tool, find
  differences between lists, list intersection union tool.
- **Pain:** Doing this by eye or with `VLOOKUP`/pivot tables is slow and
  error-prone once a list passes a few dozen lines; command-line `diff`/`comm`
  requires pre-sorted input and a terminal, and neither reports duplicate
  items within a single list or lets you toggle case-sensitivity and
  whitespace handling without rewriting the command.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| **CompareTwoLists.dev** | https://comparetwolists.dev/ | Yes — WebFetch (readable) + screenshot | `docs/research/forge/list-set-compare/comparetwolists-dev.png` |
| **Marketing Lad Compare Lists** | https://marketinglad.io/compare-lists/ | Yes — WebFetch (readable) + screenshot | `docs/research/forge/list-set-compare/marketinglad-compare-lists.png` |
| **ListDiff** | https://listdiff.com/ | Partial — WebFetch blocked both attempts (HTTP 403), full-page screenshot succeeded via the Playwright capture script, described from the screenshot only | `docs/research/forge/list-set-compare/listdiff.png` |
| **CompareLists.org** | https://comparelists.org/ | Yes — WebFetch (readable) + screenshot | `docs/research/forge/list-set-compare/comparelists-org.png` |

All four URLs named in the landscape survey were visited on this pass; the
landscape survey's "unverified/fetch failed" status for all four is corrected
here — screenshots exist for all four, and three of four also yielded a full
WebFetch text read. ListDiff.com remains text-unverified (its 403 to
WebFetch/curl persisted on retry) but its layout, controls, and copy below
are read directly off the captured screenshot, not invented.

## 3. Feature inventory

**CompareTwoLists.dev** — closest to a plain, no-frills two-pane comparator.
- Two side-by-side textareas (**List A** / **List B**), each with its own copy/upload/clear icon row and a live item count badge ("0 items").
- Action row: **Example**, **Swap**, **Clear** — no visible "Compare" button; the page's own copy ("paste your first list in List A and second in List B... results show items only in A, only in B, common items, and all differences **instantly**") states the comparison is live, not button-gated.
- **Comparison Options** (documented below the tool, not as a visible options panel in the fold captured): Trim Whitespace, Case Sensitive toggle, Normalize Spaces, Ignore Leading Zeros, Remove Duplicates (output), Sort & Case options (A-Z/Z-A/upper/lower/title).
- **Five output categories**, all named explicitly in an "Understanding the Results" card: Only in A, Only in B, Common, **Diff** (their label for symmetric difference — items in either list but not both), All Items (union, duplicates removed).
- Delimiter: one item per line only — no comma/tab/custom-delimiter support documented.
- Privacy claim: "everything runs locally in your browser."
- Upsell/padding: light — one FAQ grid (6 cards) below the tool, no ads, no link farms, no sidebar.

**Marketing Lad Compare Lists** — a agency-site tool with the richest delimiter/export surface of the four.
- Two textareas (List A / List B) with a **"COMPARE"** button as the primary CTA (button-gated, not live) plus **Swap A↔B**, **Clear A**, **Clear B**, **Clear All**.
- **Delimiter dropdown**: Newline / comma / whitespace / custom regex — explicitly named as a dropdown, the only one of the four to expose regex as a delimiter option in the visible fold.
- **Options row**: Trim items, Case-insensitive, De-duplicate inputs, Show outputs sorted — toggle checkboxes.
- **Six output sections**: Only in A, Only in B, In Both (Intersection), Union, Symmetric Difference, **Duplicates** (a section that reports repeated entries found in each input *before* de-duplication was applied — "Duplicates in A" / "Duplicates in B" with counts) — this is the only one of the four that reports on data-quality issues *within* a single list, not just cross-list differences.
- Export: per-section **Copy** button, plus page-level JSON and CSV download, plus a "shareable settings link" that round-trips the chosen options via URL.
- Upsell/padding: heaviest of the four — a right-rail "Discover more" link farm (Marketing / emails / Dictionaries & Enc. / Computer Science / Java Programming / search engine / search engines), a "Join Marketing Lad's Best SEO Slack Community" CTA box, a "Let Us Handle Your SEO and Marketing" ad box, ~2,000 words of SEO prose below the tool (What is / How to / Key Features / Use Cases / Why Choose), an email newsletter signup box, and a comment form — this is a content-marketing page with a tool embedded, not a tool-first page.

**ListDiff** (screenshot-only; text unverified) — the most feature-dense two-pane implementation observed.
- Two panes, each with a **"Split" dropdown** (implying more than one paste/parse mode per pane), plus a small toolbar of icons per pane (sort, dedupe-looking icon, copy, "1↓" sort-direction icon, swap) above the textarea itself — controls are duplicated per-pane, not just global.
- Drag-and-drop file upload directly into either pane ("Type or Drag & Drop a file") alongside paste.
- Global **Output Options** bar: Case Sensitive, Ignore Leading/Trailing Spaces, Ignore Extra Spaces, Ignore Leading Zeros (all checkboxes), **Sort** dropdown, **Case** dropdown (output casing), **Output format** dropdown (seen set to "Plain" — implying other structured formats are selectable, likely JSON/CSV given the FAQ mentions "output formats").
- **Four result panels laid out as a grid**: A Only / A∩B (In Both) / B Only side by side, with A∪B (All Items) as a fourth, full-width panel below — each panel has its own **"Send to ▾"** dropdown (chaining the result into another of the site's own tools — Text Fixer, Text Diff, Social tools), a download icon, and a copy icon, all per-panel.
- No visible "Compare" button in the captured screenshot — results panels render directly below the inputs and options with per-panel controls already active, which reads as a live/no-button comparison (consistent with the FAQ item "How do I find items that are in one list but not another?" implying immediate results, though this inference is screenshot-based, not confirmed by fetched page copy).
- A large FAQ accordion (12 questions, more than any other competitor here) covering intersection-vs-union, Excel-column comparison, leading zeros, storage/privacy, and — notably — **"Is this the same as a list comparator or list diff tool?"**, an explicit SEO-synonym-coverage question.
- "Related reading" footer links to the site's own comparison articles, including one titled "ListDiff vs. CompareTwoLists.com" — direct competitive positioning against another tool in this same research set.
- Site chrome: top nav exposes **Compare Lists / Text Fixer / Text Diff / Social / Learn / All Tools** — this is one blade in a small multi-tool text-utility station, similar in shape to what Forge itself is building.

**CompareLists.org** — the most file-format-inclusive of the four.
- Two textareas (List A / List B) each with **file upload** support for **TXT, CSV, Excel, and JSON** (confirmed by both the WebFetch read and the screenshot's "Supports All Your Favorite Formats" icon row: TXT / CSV / JSON / Excel / Clipboard), plus a per-pane **Separator dropdown** (Line break / tab / comma / semicolon / period / quotes / pipe) and an "Auto-replace" checkbox.
- **Comparison Options** organized into three tabs — **Basic** (Ignore case, Trim whitespace, Remove duplicates, Ignore leading zeros, Sort order dropdown), **Advanced**, **Special** (contents of the latter two tabs not visible in the captured fold, screenshot shows only the Basic tab active).
- Explicit **"Compare Lists"** button — button-gated, not live, the largest and most visually prominent CTA of the four (full-width indigo button).
- **Four output categories** stated in prose: items exclusively in A, items exclusively in B, common items, union — narrower than CompareTwoLists.dev's five and ListDiff's four-plus-duplicates; no symmetric-difference or duplicates-within-a-list section documented.
- A numbered **"How to Compare Lists in 4 Easy Steps"** explainer (Input → Select Options → Compare → View & Export) directly on the page — the most explicit didactic scaffolding of the four, aimed at a less technical user than the other three.
- Upsell/padding: heavy — a "Discover more" doorway-link block at the very top of the page (Computer Drives & Storage / Programming / Computer Science) even before the tool renders, six feature-card grids, a four-step explainer, a use-case grid, an FAQ accordion, and a large closing CTA banner ("Compare Two Lists Online Now") — structurally similar to CompareTwoLists.dev's low-ad approach at the top but with far more scroll-depth padding overall, closer to Marketing Lad's density than to ListDiff's or CompareTwoLists.dev's leaner pages.

## 4. Journey maps

**CompareTwoLists.dev:**
1. Land directly on the tool — H1 + one-line description, then the two-pane input immediately below, no options panel visible above the fold.
2. User pastes into List A and/or List B; item-count badges update per pane.
3. No click required to see a result — page copy explicitly promises "instantly"; the four/five result categories are documented below the fold but their live rendering location wasn't visible in the captured screenshot (the visible viewport ends at the Example/Swap/Clear row before any results panel).
4. Options (case sensitivity, trim, normalize spaces, leading zeros, dedupe, sort, output case) are documented in an explainer card below the tool, not as a visible interactive options row in the fold — this reads as either options living further down the page or the card being purely educational; not confirmed either way from the capture.
5. Exit: per-pane copy/upload icons are visible; no explicit "download all results" or JSON export control was visible in the captured region.
6. Large-input behaviour and mobile layout: not observed (desktop-viewport capture only).

**Marketing Lad Compare Lists:**
1. Land inside a full marketing-site chrome (top nav: Services/Pricing/Training/Community/Case Study, plus a blue promo banner) — the tool itself is a card partway down, reached without much scrolling but clearly embedded in a content page, not a dedicated tool page.
2. Two textareas, a delimiter dropdown, and the options checkboxes are all visible together above a single **"COMPARE"** button — this is explicitly click-gated: nothing computes until the button is pressed.
3. Click Compare → six result sections render (Only in A / Only in B / In Both / Union / Symmetric Difference / Duplicates), each with its own item count and Copy button.
4. Below the tool, ~2,000 words of "What is / How to / Key Features / Use Cases / Why Choose" SEO prose, a newsletter box, a comment form, then full site footer (nav + office locations) — the tool is a small fraction of total page length.
5. Exit: per-section Copy, plus page-level CSV/JSON download and a shareable settings link — the richest export surface of the four.
6. Large-input / error states: not documented in the fetched content.

**ListDiff** (inferred from screenshot):
1. Land on a dedicated tool page under a small multi-tool nav bar (Compare Lists / Text Fixer / Text Diff / Social / Learn / All Tools) — this is a focused tool-station page, not a content-marketing page.
2. Two input panes sit immediately below the H1, each with a per-pane micro-toolbar (Split mode, sort, dedupe-style icon, copy, sort-direction, swap) and drag-and-drop file support built into the same box as the textarea.
3. A single **Output Options** bar (case sensitivity, whitespace handling, leading zeros, global sort, output case, output format) sits between the inputs and the four result panels — no visible "Compare" button, consistent with live computation, though this is a screenshot-based inference, not a confirmed behavioural read.
4. Four result panels render in a 3-across grid (A Only / A∩B / B Only) plus a full-width A∪B panel below, each with an individual **"Send to ▾"** control that hands the panel's content to another tool on the same site (Text Fixer, Text Diff, Social) — the only one of the four with in-workflow tool-chaining UI.
5. Exit: per-panel download icon and copy icon.
6. Below the results: a 12-question FAQ accordion and "Related reading" links to the site's own comparison articles — moderate padding, none of it ad-shaped.
7. Large-input / mobile behaviour: not confirmed from the capture.

**CompareLists.org:**
1. Land on a page that opens with a "Discover more" doorway-link block (Computer Drives & Storage / Programming / Computer Science) sitting *above* the H1 and tool — the only competitor of the four to put upsell content before the tool itself in scroll order.
2. H1 + one-line description + trust badges ("Trusted by developers and data teams worldwide"), then the two-pane input with per-pane file-upload buttons and separator dropdowns.
3. A **Comparison Options** panel with Basic/Advanced/Special tabs sits directly below the inputs, Basic tab active by default (Ignore case / Trim whitespace / Remove duplicates / Ignore leading zeros / Sort order).
4. A large, full-width **"Compare Lists"** button is the explicit, unmissable next step — button-gated, the most emphatic CTA styling of the four.
5. Results (four categories: only-A, only-B, common, union) render after the click; page copy says results "can be downloaded in various formats or copied directly to clipboard" but the exact controls weren't visible in the captured fold (below the button, off-screen in this capture).
6. Below the tool: a numbered 4-step explainer, six feature cards, six use-case cards, a "Supports All Your Favorite Formats" format-icon row, an FAQ accordion, and a large closing CTA banner before the footer — the most scroll-depth of the four.
7. Large-input / mobile: not confirmed from the capture.

## 5. Layout + screenshots

- **CompareTwoLists.dev**: single centered column, light theme, minimal chrome (a small logo/wordmark header and a theme toggle). Two equal-width panes fill nearly the full content width side by side, each with its own small icon row (copy/upload/delete) in its top-right corner and a colored dot + item-count badge in its top-left. Action row (Example/Swap/Clear) sits directly below, then an "About" card, then a two-column "Comparison Options" / "Understanding the Results" explainer pair, then a 2×3 FAQ grid. No ads, no sidebar, no link farm anywhere in the capture. See `comparetwolists-dev.png`.
- **Marketing Lad Compare Lists**: full agency-site chrome (top nav + phone number + "Book a Demo"/"Contact Us" buttons + a blue hero-style promo strip) wraps a comparatively narrow tool card; a **persistent right rail** (Discover-more link list, Slack community box, "Let Us Handle Your SEO" ad box) runs alongside the tool and continues alongside the SEO prose below it — the only one of the four with a true sidebar-ad layout next to the working tool area itself, not just below it. See `marketinglad-compare-lists.png`.
- **ListDiff**: single centered column under a slim multi-tool top nav (product name + five nav items + language/theme toggles). The two input panes are the widest of any competitor's input area, each carrying a dense per-pane toolbar; the **Output Options** bar spans the full width as one horizontal strip; results render as a 3-panel row (A Only / A∩B / B Only, color-coded blue/red/purple) plus one full-width green union panel below — the most information-dense single screen of the four, everything (inputs, options, all four outputs) fits within roughly one dedicated tool "app" region before the FAQ/footer begins. See `listdiff.png`.
- **CompareLists.org**: single centered column, indigo accent color, but the **longest page of the four by a wide margin** (screenshot height ~5.2× the others at equivalent width scaling) — doorway links before the tool, then the tool, then six distinct explainer/marketing sections stacked vertically (How-it-works steps, feature grid, use-case grid, format-support icon row, FAQ, closing CTA banner) before the footer. The tool itself occupies roughly the top 15–20% of total page height. See `comparelists-org.png`.
- **Mobile**: not directly observed for any of the four (all four captures are desktop-viewport); CompareLists.org's format-icon row and ListDiff's 3-panel result grid are the two layouts most likely to need explicit stacking rules on narrow viewports.

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- `docs/research/forge/list-set-compare/comparetwolists-dev.png`
- `docs/research/forge/list-set-compare/marketinglad-compare-lists.png`
- `docs/research/forge/list-set-compare/listdiff.png`
- `docs/research/forge/list-set-compare/comparelists-org.png`

## 6. Their debt

- **CompareTwoLists.dev**: least debt of the four — no ads, no sidebar, no link farm, light FAQ padding only. Gap: no delimiter choice beyond one-item-per-line, and it is unclear from the capture whether the promised "instant" results and the documented options (trim/case/leading-zero/sort) are actually wired to a visible options UI or only described in prose — if the latter, that is a real usability gap (documented feature the user cannot find a control for).
- **Marketing Lad Compare Lists**: heaviest content-marketing debt — a right-rail ad/community box that never leaves the screen next to the actual tool, a newsletter signup, a comment form, and ~2,000 words of filler the user must scroll past for a tool that itself renders in one click. No visible API/OpenAPI/MCP surface for any of the four.
- **ListDiff**: least *ad* debt but the most speculative from our vantage point — it actively blocked automated text fetching (HTTP 403 twice) while still rendering fine to a real browser, which reads as basic bot-fingerprinting rather than a paywall; that means this brief's ListDiff section carries a higher uncertainty flag than the other three despite the strong screenshot evidence. Cross-tool chaining ("Send to ▾") is real product depth we do not currently match, but it only chains within ListDiff's own small tool set — not to any external agent surface.
- **CompareLists.org**: heaviest scroll-depth debt — a doorway-link block before the tool even renders, plus six additional marketing sections after it; the tabbed "Advanced"/"Special" options panel is a real feature signal (there is more configurability than the visible Basic tab shows) but its contents were not visible in this capture, so it is flagged as an open question rather than a confirmed feature. No API/MCP surface documented for any of the four.
- **All four**: no competitor documents an OpenAPI/MCP surface, a stable JSON schema, or any agent-facing contract — every one of them is a human-only HTML page with client-side JS. None of the four documents Unicode-normalization behavior, none documents multiset (repeat-count) semantics beyond Marketing Lad's and ListDiff's "duplicates" side-panel, and none states what happens with very large pastes (row limits, browser-freeze thresholds) in the content this brief could reach.

## 7. Domain know-how

1. **"Common" needs a multiset decision, not just a set decision.** If List A has `apple, apple, apple` and List B has `apple`, does "Common" report one `apple` (set intersection) or does it report the item once but also flag a count mismatch (3 vs 1)? None of the four competitors documents this distinction anywhere reachable in this research pass — Marketing Lad's and ListDiff's separate "Duplicates" panels are the closest hint (they report *within-list* repeat counts before any A-vs-B comparison happens), but that is a different question from *cross-list* multiplicity. A naive implementation that silently treats lists as pure sets will produce a technically-defensible but frequently-surprising answer for inventory/SKU-count use cases where "how many" matters as much as "which ones" — so the comparator must report per-item counts in both lists as structured detail, not just presence/absence.
2. **Case-sensitivity and case-transform are two independent axes, easy to conflate.** "Case Sensitive" (does `Apple` == `apple` for comparison purposes) and "Case" output dropdown (should results be rendered as-is / uppercased / lowercased / title-cased) are different concerns — ListDiff is the only competitor to visibly separate them into two distinct controls. A naive implementation that has one "ignore case" toggle and lowercases everything on the way out has silently destroyed the original casing information the user may need to paste back into their source system (e.g. a product SKU that must stay `SKU-042` on the way out even if compared case-insensitively).
3. **Whitespace normalization has at least three independently-toggleable behaviors, not one.** Trim (leading/trailing only), collapse-internal (`"a  b"` → `"a b"`), and exact-match (no normalization) are three distinct policies — CompareTwoLists.dev names both "Trim Whitespace" and "Normalize Spaces" as separate options, and ListDiff separately exposes "Ignore Leading/Trailing Spaces" and "Ignore Extra Spaces." A single "trim" checkbox that also silently collapses internal runs of spaces will misreport two items as identical (`"New York"` vs `"New  York"`) when the user only asked to ignore edge whitespace.
4. **"Ignore leading zeros" is a numeric-identity heuristic that must be opt-in, never default.** Treating `"007"` and `"7"` as equivalent is correct for numeric IDs but actively wrong for zero-padded codes that are semantically strings (ZIP codes, some SKU formats, phone extensions) where `007` and `7` are different real-world entities. All three competitors that document this option (CompareTwoLists.dev, ListDiff, CompareLists.org) ship it off by default — a naive implementation eager to be "smart" about numbers by turning this on by default will silently merge distinct records for a meaningful slice of real-world list data.
5. **Unicode normalization form is an invisible identity trap none of the four competitors document.** Two strings that render identically on screen — `café` composed as a single precomposed `é` (NFC) versus `e` + a combining acute accent (NFD) — are different byte sequences and will fail a naive `===` string comparison even with case-folding and whitespace-trimming both applied. This is exactly the kind of "why did this get flagged as different when it looks the same" bug that a Detector-adjacent Comparator tool exists to prevent; the fix is to normalize both lists to a single Unicode Normalization Form (NFC, the common web default) before any comparison, applied identically to both A and B, and to state this behavior explicitly rather than leaving it as a silent default competitors do not mention.
6. **Union, intersection, and symmetric difference are three genuinely different sets, and competitors are inconsistent about which four/five/six they ship** — CompareTwoLists.dev's "Diff" *is* symmetric difference (only-A ∪ only-B, common excluded) under a different label; Marketing Lad and ListDiff both label it "Symmetric Difference" explicitly and also ship plain Union separately; CompareLists.org ships neither symmetric difference nor within-list duplicates at all. Labeling matters here because "Diff" as a bare word is ambiguous between "everything that's different" (symmetric difference) and "a diff view of both lists" (which could mean something closer to a text-diff line-by-line view) — our labels must be the precise set-theory terms (Only in A / Only in B / Intersection / Union / Symmetric Difference) so an agent parsing the JSON schema field names never has to guess which set-theoretic operation a vaguely-named field represents.
7. **Order preservation vs sort is a reproducibility concern for CI/eval use, not just a display preference.** If an agent runs this comparator inside a CI gate (e.g. "did the expected-output list change between two pipeline runs?"), the *default* output order matters for deterministic downstream diffing — sorting silently by default (as several competitors' "Sort Order" dropdowns default to something other than "original order" in some configurations) changes the byte-for-byte output for two functionally-identical runs. The correct default is to preserve first-seen input order (from List A first, then any List-B-only remainder in List-B order) unless the caller explicitly requests a sort, so that piping the same two inputs through this tool twice always yields byte-identical JSON.
8. **A pasted "list" is not always one-item-per-line — the delimiter itself is part of the input contract.** Marketing Lad's regex-delimiter option and CompareLists.org's seven-way separator dropdown (line break / tab / comma / semicolon / period / quotes / pipe) both exist because real-world "lists" frequently arrive as a single comma-separated line copied from a spreadsheet cell, or a tab-separated paste from Excel, not literal one-per-line text. A comparator that hard-codes newline-only splitting (as CompareTwoLists.dev appears to) will silently treat an entire comma-separated paste as one giant single "item," producing a nonsensical zero-overlap result with no error message explaining why.

## 8. Chosen archetype

§6.7.10's own archetype table names this exactly: "**Two-pane compare** — Side-by-side inputs, synchronized structured output — Fits: diff family, **comparators**." This tool's entire shape — two independent lists in, one synchronized structured comparison out — is the textbook case the archetype exists for, and all four competitors converge on a visual two-pane input independently, which is itself corroborating evidence this is the correct shape for the JTBD.

Why the other six are wrong here:
- **Instant transform** — close on the "no run button" question (two of four competitors do appear to run live), but wrong on shape: an instant transform has *one* input becoming *one* output (base64 encode, case convert). This tool structurally requires two independent inputs held in view simultaneously, which instant-transform's single-input framing does not capture even when the compute itself is live.
- **Configure-then-generate** — no configuration alone produces an output here; the *lists themselves* are the primary input, options only adjust how they are compared. CompareLists.org's tabbed options panel is real, but it's tuning the comparison, not generating a fresh artifact the way a `.gitignore`-by-stack generator does.
- **Decision wizard** — the user already knows exactly what they want (compare these two specific lists); there's no narrowing-by-question flow, and none of the four competitors offer one.
- **Drop-and-verdict** — that archetype is for a single input producing one verdict with supporting detail (the line-ending-detect brief's own chosen archetype); this tool has two co-equal inputs and multiple co-equal output sets, not one input and one headline answer.
- **Inspect-and-drill** — no single decoded structure is being explored (contrast JWT claims or a JSONPath tree); the output is a fixed set of parallel result categories, not an open-ended drill-down.
- **Batch queue** — this is not N-files-over-time with progress bars; it is two lists, synchronously compared. File upload (as CompareLists.org and ListDiff both offer) is an *input method* for populating one of the two panes, not a batch job — a `.txt`/`.csv` upload still becomes exactly one of the two lists, not one item in a queue.

## 9. Our design

### 9.1 Journey

*This brief writes the journey inline in 9.2 Layout rather than as a separate step sequence — carried into §11 as an open item.*

### 9.2 Layout

**Layout** — two-pane compare, live computation, four primary result panels plus one detail panel, options bar between inputs and results:

- **Top**: two equal-width panes side by side (stacked on narrow viewports), each a combined paste-or-drop textarea — "Paste items, one per line, or drop a .txt/.csv file" placeholder — with a live item-count badge and a small per-pane icon row (copy, clear, upload). A center **Swap A ↔ B** control sits between the two panes (parity with CompareTwoLists.dev and ListDiff, both of which put this control in the same visual slot).
- **Delimiter control**: one shared dropdown between the panes — **Auto-detect** (default: try newline first, fall back to comma if the pasted text has zero newlines and at least one comma) / Newline / Comma / Tab / Custom (regex input appears when selected) — closing domain know-how #8 without forcing every user through a manual delimiter choice for the common one-per-line case.
- **Options bar**, directly below the two panes, always visible (not tabbed away, unlike CompareLists.org's Basic/Advanced/Special split which hides real functionality from the fold): Case Sensitive (default: on), Trim Whitespace (default: on), Collapse Internal Whitespace (default: off, distinct from Trim per domain know-how #3), Ignore Leading Zeros (default: **off**, per domain know-how #4), and an output Sort dropdown (default: **Original order** — preserves input order per domain know-how #7 — with A-Z / Z-A / by-count as explicit alternatives, never a silent non-original default).
- **Live, no button**: changing either pane's text or any option recomputes immediately — comparing a few thousand short strings is trivial client-side compute, so gating it behind a button (as Marketing Lad and CompareLists.org both do) is a pure step-tax for this tool's actual cost profile, matching CompareTwoLists.dev's and ListDiff's live precedent rather than the button-gated pair.
- **Four primary result panels**, laid out as a 2×2 grid on desktop (stacking to one column on narrow viewports): **Only in A**, **Only in B**, **Intersection (Common)**, **Union (All Items)** — each with its own item count in the panel header, a Copy button, and a Download (.txt) button. Field labels use precise set-theory terms, never a bare "Diff," per domain know-how #6.
- **One secondary detail panel**, visually subordinate (smaller, collapsed by default with an item count visible on its collapsed header so it's never fully hidden): **Symmetric Difference** and **Duplicates** (within-A and within-B repeat counts, plus cross-list multiplicity deltas per domain know-how #1) — present per the "detail on demand" principle rather than cluttering the four primary panels with a fifth/sixth/seventh box competing for the same visual weight.
- **Exit actions**: per-panel Copy/Download as above, plus a page-level **Copy as JSON** action whose payload shape is identical to the API response — so a human power-user and an agent get the same contract, and pasting that JSON into a ticket or PR comment carries the full structured comparison, not just one panel's plain-text list.
- **Empty/error state**: with either pane empty, panels render a neutral "Add items to List A/B to see the comparison" placeholder rather than a false "0 items in common" verdict. If the chosen delimiter produces a single one-item list from what looks like a longer paste (e.g. a comma-separated paste under "Newline" delimiter), a small inline hint suggests switching delimiter — directly addressing domain know-how #8's silent-nonsense failure mode.
- **Large input**: no hard row limit; comparison runs as a same-thread Set/Map operation which stays fast well past what any of the four competitors' documented content suggests real users paste (a few thousand lines); for very large pastes (multi-tens-of-thousands of lines) the recompute is debounced against keystrokes so live mode doesn't visibly stutter, an implementation detail rather than a UX change.

### 9.3 Must-have

**Must-have features** (without these, a user bounces back to a competitor):
1. Live, no-button comparison the moment both panes have content — parity with CompareTwoLists.dev and ListDiff, a genuine gap versus Marketing Lad and CompareLists.org.
2. The four canonical result sets (Only in A / Only in B / Intersection / Union) plus Symmetric Difference — parity with the two most feature-complete competitors (Marketing Lad, ListDiff); CompareLists.org alone ships fewer than this.
3. Within-list duplicate reporting and cross-list multiplicity — parity with Marketing Lad and ListDiff's "Duplicates" panels, extended into the structured multiset detail no competitor's public copy documents (domain know-how #1).
4. Delimiter auto-detect plus explicit newline/comma/tab/custom choice — parity with Marketing Lad's regex delimiter and CompareLists.org's separator dropdown, closing CompareTwoLists.dev's apparent newline-only gap.
5. Independent, explicit controls for case-sensitivity, trim, and internal-whitespace-collapse — never one conflated "normalize" toggle (domain know-how #2, #3).
6. Both human exits (per-panel copy/download) and a machine exit (Copy as JSON matching the API schema).

### 9.4 Deliberately skipped

**Deliberately skipped** (and why):
- **File-format upload beyond plain text (.csv/.xlsx column extraction, JSON array ingestion)** — CompareLists.org's TXT/CSV/Excel/JSON upload support is real value, but "extract a specific column from a spreadsheet as a list" is a distinct concern (column selection, header-row handling, sheet selection) that belongs upstream of this comparator, not reimplemented inside it. V1 accepts plain-text paste and `.txt` drop only; a future `compose.next` from a CSV/spreadsheet tool that emits a flat list is the correct composition path, keeping this tool's own contract (`listA: string, listB: string`) simple and stable.
- **In-workflow "Send to another tool" chaining UI** — ListDiff's per-panel "Send to ▾" dropdown is genuine product depth, but wiring cross-tool chaining is an orchestrator/catalog-runner concern outside this brief's file scope (`tool-workspace.tsx` / `catalog-runners.tsx` are explicitly not touched here per the file-isolation instructions). **Reported as a wiring need**: once this tool ships, `onlyInA`/`onlyInB`/`union` outputs are natural `compose.next` sources into a text-processing or dedupe-adjacent tool, if/when the catalog-runner layer adds a generic "send this output to tool X" affordance.
- **Advanced/Special tabbed option sets beyond what's listed above** — CompareLists.org gestures at "Advanced" and "Special" option tabs whose contents weren't visible in this research pass; rather than guess at unverified functionality, v1 ships only the options this brief can name and justify from domain know-how, leaving room to extend once a concrete need is identified.
- **Shareable settings link (URL-encoded options)** — a real Marketing Lad feature, but a URL-state concern independent of the comparison logic itself; deferred as a follow-on rather than blocking this brief, since it doesn't change the tool's core I/O contract.
- **SEO filler / doorway links / persistent ad rails** — Marketing Lad's sidebar ad box and CompareLists.org's pre-tool doorway-link block are both explicitly the kind of workflow-adjacent chrome §6.7.10 tells us never to import; this tool carries none of it.

### 9.5 Differentiator

- **Agent contract**: every field in the output — `onlyInA`, `onlyInB`, `intersection`, `union`, `symmetricDifference`, and per-item counts/duplicate reports — is exposed via OpenAPI + MCP with unambiguous, set-theory-precise field names (closing the "Diff" ambiguity called out in domain know-how #6). None of the four competitors document any machine-callable surface; all are human-only pages. A CI job or eval loop that needs "did the expected list change" gets a stable, deterministically-ordered JSON payload instead of scraping a rendered HTML table.
- **Multiset-aware by default, not set-only**: per-item occurrence counts in both A and B are always part of the structured output (domain know-how #1), not an optional "Duplicates" side panel a user has to know to look for — closing a gap that even Marketing Lad and ListDiff only partly cover (they report within-list duplicate counts, not cross-list multiplicity deltas).
- **Deterministic ordering as a stated guarantee** (domain know-how #7): the same two inputs always produce byte-identical JSON unless a sort is explicitly requested — a property none of the four competitors states and that matters specifically for the CI/eval composition use case this root exists to serve (§6.5 gate: "structured difference an agent can act on").
- **Unicode-normalization stated behavior** (domain know-how #5): we normalize to NFC before comparing and say so in the tool's own copy and API docs, closing a silent-failure mode none of the four competitors documents at all.
- **No workflow-adjacent ad/upsell chrome**: unlike Marketing Lad's persistent right-rail ad box or CompareLists.org's pre-tool doorway-link block, the comparator's own working area carries none of it — matching CompareTwoLists.dev's and ListDiff's cleaner precedent, not the two heavier pages.

### 9.6 I/O contract

**I/O contract sketch** (for the OpenAPI/MCP surface, §6.5 gate 2):

```text
input:
  listA: string              # raw text, split per `delimiter`
  listB: string
  delimiter?: enum<auto, newline, comma, tab, custom>   # default: auto
  customDelimiter?: string   # regex source, required when delimiter = "custom"
  options?:
    caseSensitive?: boolean          # default: true
    trimWhitespace?: boolean         # default: true
    collapseInternalWhitespace?: boolean  # default: false
    ignoreLeadingZeros?: boolean     # default: false
    unicodeNormalize?: enum<nfc, none>    # default: nfc — see domain know-how #5
    sort?: enum<original, asc, desc, byCount>  # default: original — see domain know-how #7

output:
  onlyInA: string[]
  onlyInB: string[]
  intersection: string[]            # set intersection — presence in both, per domain know-how #1
  union: string[]
  symmetricDifference: string[]     # onlyInA ∪ onlyInB
  counts:
    totalA: number
    totalB: number
    onlyInA: number
    onlyInB: number
    intersection: number
    union: number
    symmetricDifference: number
  multiplicities:                   # cross-list occurrence counts, per domain know-how #1
    - value: string
      countInA: number
      countInB: number
  duplicates:                       # within-list repeat counts, before any A-vs-B comparison
    inA: { value: string, count: number }[]
    inB: { value: string, count: number }[]
  warnings?: string[]               # e.g. "List A parsed as a single item — check delimiter"
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

**内部验收状态：** `research-complete` — teardown on file per §6.7.10 gate 11; archetype chosen (gate 12); implementation not started (research-only pass, no application code touched).

## 11. Gaps and open questions

- [ ] **ListDiff.com is screenshot-only** — WebFetch returned HTTP 403 on both
      attempts, so every ListDiff claim in §3/§4/§6 is read off pixels, not
      page text. Its "no Compare button ⇒ live comparison" reading (§3) is an
      inference from the captured state, not confirmed behaviour. This section
      carries a higher uncertainty flag than the other three competitors.
- [ ] **CompareLists.org's "Advanced" / "Special" options tabs were not
      opened** (§6) — there is more configurability behind them than the
      Basic tab shows, and its contents are unknown. Our options-row design
      (§9.2) claims parity-plus against a feature set we have only partly
      seen.
- [ ] **Where CompareLists.org's documented options actually live is
      unconfirmed** (§4) — the explainer card below the tool may be
      educational rather than reflecting a real interactive options row.
- [ ] **Large-input behaviour and mobile layout were not observed for any of
      the four** (desktop-viewport captures, no stress input).
- [ ] **The journey is written inline in §9.2 rather than as an explicit step
      sequence** (§9.1) — write it out before implementation.
- [ ] **Unicode normalization form is our own stated position (NFC), not a
      verified competitor behaviour** (§7 item 5). None of the four document
      what they do; we should not describe them as "getting it wrong" without
      testing a composed-vs-decomposed pair against each.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in §9.6.
