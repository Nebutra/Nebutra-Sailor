# Tool brief: isbn

Root: **Verifier** — dense-ish long-tail cell. Object: Text/Identifier. Side
effect: `pure`.

## 1. Demand

- **JTBD:** "I have a 10- or 13-digit number that's supposed to be an ISBN and
  I need to know, right now, whether it's mathematically valid — before I
  publish, list, catalog, or import it." Secondary: "give me the equivalent in
  the other format" (10↔13 conversion) and "check a whole list of ISBNs from a
  spreadsheet/CSV at once."
- **Keywords:** ISBN validator, ISBN checker, validate ISBN-13, ISBN check
  digit calculator, ISBN converter, bulk ISBN validation.
- **Pain:** publishing/library/bookselling workflows (self-publish platforms,
  library catalogers, used-book resellers, metadata import pipelines) need a
  fast correctness check on identifiers that arrive from spreadsheets,
  scanned barcodes, or vendor feeds — often many at once, often with stray
  hyphens/spaces, occasionally with a wrong-length or transposed-digit typo
  that a human eye won't catch but the check digit will.

## 2. Competitors (named, reached, captured)

Verified by direct visit (WebFetch + screenshot) — all five reached.

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| ISBN.co.in Validator | https://isbn.co.in/validator/ | Yes | [isbn-co-in-validator.png](../../research/forge/isbn/isbn-co-in-validator.png) |
| FreeISBN Validator | https://freeisbn.com/validator/ | Yes | [freeisbn-validator.png](../../research/forge/isbn/freeisbn-validator.png) |
| QuantCDN ISBN Validator & Converter | https://www.quantcdn.io/tools/isbn-validator-and-converter | Yes | [quantcdn-isbn.png](../../research/forge/isbn/quantcdn-isbn.png) |
| AnyOnlineTool ISBN Checker | https://anyonlinetool.com/tool/isbn-checker | Yes | [anyonlinetool-isbn-checker.png](../../research/forge/isbn/anyonlinetool-isbn-checker.png) |
| CheckTown ISBN Validator | https://check.town/isbn-validator | Yes | [checktown-isbn-validator.png](../../research/forge/isbn/checktown-isbn-validator.png) |

Demand corroboration (from prior landscape survey, not re-verified here):
WebSearch "ISBN checker validate ISBN-13" surfaces a crowded, fragmented field
of small dedicated tools with no single dominant brand — real, recurring
long-tail demand from publishing/library/bookseller workflows rather than one
category leader.

## 3. Feature inventory

**ISBN.co.in Validator** (the reference case, screenshot-confirmed):
- Single text input, placeholder "Enter ISBN (10 or 13 digits)," green
  "VALIDATE ISBN" button — not live, requires a click.
- Accepts hyphenated or unhyphenated input for both ISBN-10 and ISBN-13; no
  format selector, detects by length/shape.
- Result stated as a plain valid/invalid verdict (examples shown in the FAQ
  copy: "ISBN-10: 0-306-40615-2 → Valid", "Invalid: 0-306-40615-3 → Fails
  check digit test") — no visible confidence/detail breakdown beyond pass/fail.
- **No bulk mode** — FAQ explicitly states "Currently, our tool processes one
  ISBN at a time. For bulk validation requests, reach out to us" — bulk is
  gated behind contact, not self-serve.
- **No API.**
- Heavy content-marketing scaffold around the tool: "What is an ISBN
  Validator," "How to use," "About ISBNs," "Why validate," "How ISBN
  validation works" (explains the mod-11/mod-10 algorithms in prose), FAQ,
  and a "Similar ISBN Tools" cross-sell list (Hyphenator, Barcode Generator,
  Check Digit Calculator, Converter, Lookup) — the validator itself is a
  small block above a large SEO article; the tool occupies roughly the top
  15% of the page, the rest is content and internal cross-links.
- Core strength = clean single-purpose validator + honest algorithm
  explanation. Upsell padding = the "Similar ISBN Tools" list steering
  traffic to five sibling single-purpose pages instead of unifying them.

**FreeISBN Validator** (bulk leader):
- Two modes: single-ISBN field, and a bulk textarea accepting **up to 50
  ISBNs, one per line**, with a live "0/50 ISBNs" counter as you type.
- Separate buttons per mode: "Validate ISBN" (single) vs "Validate All
  ISBNs" (bulk) — not unified into one form.
- Bulk results render as a **table**: ISBN | Type | Status columns — this is
  the right shape for scanning many results at once.
- Auto-detects ISBN-10 vs ISBN-13 per row; strips non-numeric characters
  before validating (hyphen/space tolerant).
- Explicitly scopes itself: "validates the mathematical correctness of the
  ISBN format and check digit" — does **not** verify the ISBN is actually
  registered/assigned to a real book (an important, honest scope statement).
- Separate Converter tool exists in nav (not bundled). No API mentioned, no
  ads found. Core strength = the 50-row batch table; padding = none obvious,
  this is a lean, honest tool.

**QuantCDN ISBN Validator & Converter** (validate+convert combined):
- Single "ISBN" field, "Validate" button, note "Hyphens and spaces are
  ignored."
- Auto-identifies which format was entered, then performs the check-digit
  validation **and** bidirectional conversion in the same result: ISBN-10
  always converts to ISBN-13 with a 978 prefix; explicitly states the
  asymmetry that **ISBN-13 numbers with a 979 prefix cannot convert back to
  ISBN-10** (979-prefixed ISBNs were never assigned a 10-digit form — this is
  a real domain constraint, not a tool limitation to work around).
  - States mod-11 for ISBN-10 and mod-10 for ISBN-13 as the two check-digit
    algorithms, matching the real spec.
- "Powered by a QuantCDN Edge Function" — implies a real backend/API exists
  behind the page, though no public API docs were surfaced in the fetch. No
  ads found. Core strength = validate+convert unified in one result, and the
  979-prefix caveat stated up front rather than silently failing.

**AnyOnlineTool ISBN Checker**:
- Text input, hyphen/space auto-strip, **explicit auto-detect vs
  manual-format-selection choice** — offers a control to override the
  auto-detected format rather than trusting auto-detect blindly, useful if a
  user has a malformed number that could be ambiguous.
- "Validate ISBN" button. Output reports "checksum status, format type, and
  any errors," and for invalid input **suggests possible corrections based on
  checksum calculations** — going beyond pass/fail into "did you mean" territory,
  a genuinely useful feature not seen elsewhere in this set.
- Ships **"Call tool by API"** and **"Embed on your site"** with a
  configurable embed snippet — the only competitor here with a visible,
  self-serve API/embed surface.
- Page also promotes an unrelated "AI Web Tool Generator" upsell alongside
  the checker and a related-calculators carousel — padding around a solid
  core tool.

**CheckTown ISBN Validator**:
- Single input field, keyboard shortcuts (Ctrl+Enter to run, Ctrl+Shift+C to
  copy results) — the only competitor here exposing keyboard-driven usage.
- Reports four checks: format verification, length validation (10 or 13
  digits), check-digit calculation/verification, and automatic
  10↔13 conversion — auto-detects format.
- Free, no account, mobile-compatible per its own copy; no API found.
- Part of a **broader validator-family site** (Email Validator, IBAN Checker,
  plus Developer Tools / Converters / Data Tools / Generators / Image Tools
  sections) — the "check.town family" pattern flagged in the landscape
  survey is confirmed: this is a generic multi-identifier-validator platform
  with an ISBN page as one leaf, not a specialist ISBN product. A blog post
  explaining "how ISBN validation works" sits alongside the tool as SEO
  scaffold, same pattern as ISBN.co.in.

## 4. Journey maps

**ISBN.co.in:** land on page → hero image of a bookshelf → single input box
→ click "VALIDATE ISBN" → verdict shown (valid/invalid) → below the tool,
several screens of static SEO prose (what/how/about/why/algorithm/FAQ) → a
"Similar ISBN Tools" list at the bottom routes to five sibling pages
(Hyphenator, Barcode Generator, Check Digit Calculator, Converter, Lookup).
No copy/download action visible in the fetch. Bulk validation is explicitly
not self-serve — FAQ tells the user to "reach out."

**FreeISBN:** land on page → choose single or bulk mode → single: type one
ISBN, click "Validate ISBN," see one result → bulk: paste up to 50 ISBNs
(one per line) into a textarea, watch a "n/50" counter, click "Validate All
ISBNs" → a table appears with one row per ISBN (ISBN | Type | Status). No
button-less live mode found; both paths are click-to-run.

**QuantCDN:** land on page → tool sits at the top of the page (screenshotable
above educational content) → type an ISBN (any hyphenation) → click
"Validate" → result reports validity **and** the converted equivalent in the
other format in the same response, with an explicit note when 979-prefixed
ISBN-13 cannot be converted back to ISBN-10 (rather than silently omitting a
result or erroring opaquely).

**AnyOnlineTool:** land on page → choose auto-detect or manually pick
ISBN-10/ISBN-13 → type ISBN → click "Validate ISBN" → result shows checksum
status + format type + errors; on failure, the tool proposes a corrected
ISBN candidate based on checksum math. Separately, an "API" tab/link and an
"Embed on your site" flow with a copyable `<iframe>`/script snippet exist
for site owners who want to embed the checker rather than call a JSON API.

**CheckTown:** land on page → type/paste ISBN → press Enter (Ctrl+Enter
shortcut) or click the validate button → result reports format/length/check
digit/conversion → Ctrl+Shift+C copies the result. Site-level nav offers
jumping to sibling validators (Email, IBAN) for other identifier types.

## 5. Layout + screenshots

- **ISBN.co.in:** single-column, centered card containing input + button +
  a light "About ISBNs" info box, sitting below a full-width bookshelf photo
  hero and an orange top bar (Shop/Account/nav). The tool itself is compact
  and occupies roughly the top 15% of a very long page; the remaining ~85%
  is stacked SEO sections (What is/How to/About/Why/How-it-works/FAQ/Similar
  Tools) down to a three-column footer. No options beyond the one text
  field — options density is effectively zero.
- **FreeISBN:** mode switch (single vs bulk) above the input; bulk textarea
  is the dominant above-the-fold element with a live counter; results table
  appears directly below on submit. Options density: a binary mode toggle
  only, no other configuration.
- **QuantCDN:** validator positioned prominently at the very top of the
  page, single field + button, with educational sections (formats,
  validation mechanics, conversion process, use cases) following below —
  same "tool-then-article" shape as ISBN.co.in and CheckTown, which appears
  to be the house pattern for this whole competitor category.
- **AnyOnlineTool:** input + auto-detect/manual toggle + validate button
  above the fold, followed by a description section, FAQ, and a related-tools
  carousel; API/embed controls are a secondary, non-default-visible section
  (not part of the primary above-the-fold flow).
- **CheckTown:** input field with visible keyboard-shortcut hints, main
  content area, FAQ, and a "related tools" sidebar pointing to sibling
  identifier validators on the same platform.
- Mobile behaviour: not independently verified for any of the five (static
  WebFetch does not render responsive breakpoints); CheckTown claims
  "mobile compatible" in its own copy but this is unverified here.
- **Common pattern across all five:** every competitor puts a small,
  single-field validator at or near the top of a much longer content page —
  none treat the tool itself as the whole page. This is a strong, consistent
  signal that the *tool* should be compact and instant, with any explanatory
  content (if we add any) kept clearly secondary and below the fold.

## 6. Their debt

- **ISBN.co.in**: no self-serve bulk mode (explicitly deflects bulk requests
  to a "contact us" — a real usability gap for cataloging/library workflows
  that are the JTBD's most demanding segment); no API; the tool-to-content
  ratio is very low (a five-screen SEO article wrapped around one input box);
  cross-sells to five separate single-purpose sibling tools (Hyphenator,
  Barcode Generator, Check Digit Calculator, Converter, Lookup) instead of
  offering one consolidated tool — this fragmentation is itself an
  opportunity for us (one tool that validates, converts, and reports the
  check-digit math, rather than five separate pages).
- **FreeISBN**: no API; no converter bundled (separate tool in nav); bulk
  cap of 50 may be limiting for a real library import job (hundreds/thousands
  of rows) but is still the strongest self-serve batch offering found.
- **QuantCDN**: no visible public API documentation despite "Powered by a
  QuantCDN Edge Function" implying one exists internally — a real API that
  isn't exposed to users is a bigger miss than not having one at all; no
  bulk mode found.
- **AnyOnlineTool**: pushes an unrelated "AI Web Tool Generator" product
  alongside the checker (upsell padding, not a dark pattern but noise); no
  bulk mode found despite having the most developer-facing surface (API +
  embed) of the five — odd gap given the audience an API implies.
- **CheckTown**: generic multi-validator platform, not an ISBN specialist —
  the ISBN page is a leaf of a much larger identifier-validator catalog
  (Email, IBAN, etc.), so ISBN-specific depth (bulk, 979-prefix conversion
  nuance) is thin compared to purpose-built competitors; no API found for
  this specific tool despite the site clearly having engineering capacity
  (keyboard shortcuts, embed-style features elsewhere on the platform).
- **Across all five**: none combine bulk + convert + API + no-ads-in-workflow
  in one tool. Each has at most two or three of these; the full set is open.

## 7. Domain know-how

1. **ISBN-10 and ISBN-13 use different check-digit algorithms, not the same
   one with a different modulus.** ISBN-10: weight each of the first 9
   digits by 10 down to 1, sum, and the check digit is `(11 - sum mod 11) mod
   11`, where a result of 10 is written as the literal character `X` (never
   the digit "10"). ISBN-13: weight digits alternately by 1 and 3, sum, and
   the check digit is `(10 - sum mod 10) mod 10` — always a plain digit 0-9,
   never `X`. A naive implementation that reuses one modulus/weight scheme
   for both formats will silently pass or fail the wrong inputs.
2. **The `X` check digit is case-sensitive-tolerant but position-fixed.**
   `X` (or `x`) is only valid as the 10th character of an ISBN-10, never
   anywhere else, and never in ISBN-13 at all. Treating `X` as a generic
   "any position" wildcard is a common bug.
3. **979-prefixed ISBN-13 numbers cannot be converted to ISBN-10 — this is
   not a limitation to route around, it's the actual rule.** Only
   978-prefixed ISBN-13s have a valid ISBN-10 equivalent (978 is the legacy
   Bookland EAN prefix that predates the 2007 ISBN-13 transition; 979 is a
   newer prefix range with no 10-digit predecessor). QuantCDN states this
   correctly; a tool that always attempts to strip the prefix and recompute
   a 10-digit form regardless of 978 vs 979 will produce a mathematically
   well-formed but meaningless "ISBN-10" for 979 numbers.
4. **Converting ISBN-10 → ISBN-13 is not just prepending "978" — the check
   digit must be recomputed.** Strip the original ISBN-10 check digit, add
   `978` in front of the remaining 9 digits, then compute a fresh ISBN-13
   check digit using the mod-10/alternating-1-3 algorithm. Reusing the
   original ISBN-10 check digit as-is is a classic off-by-one-algorithm bug.
5. **"Mathematically valid" is not "assigned to a real book."** FreeISBN's
   explicit scope statement is correct domain practice: check-digit
   validation only proves the number is internally consistent, not that it
   was actually issued by an ISBN agency to a real title. A tool should not
   imply registry-level verification (which would require querying ISBN
   agency databases, e.g. via isbnlib/openlibrary/worldcat-style lookups —
   out of scope for a pure validator) — state the limitation explicitly
   rather than let users over-trust a "Valid" verdict.
6. **Hyphenation is not part of the check-digit math and must be stripped
   before computing, but hyphen *position* is itself informative
   (registration-group, publisher, title, check-digit segments) — not
   required for validity, but useful metadata if displayed.** All five
   competitors strip hyphens/spaces before validating; none of them appear
   to validate that a *given* hyphenation matches the correct GS1/registrant
   boundaries (a hyphenated ISBN can have "valid digits, wrong hyphen
   placement" — worth flagging as informational, not an error, since hyphen
   placement rules require the full ISBN registration-range tables, not
   just arithmetic).
7. **Length ambiguity: 9 or 12 digits after stripping non-digits is not
   automatically "add a check digit for them" — it's an invalid-length
   input, full stop.** A defensive implementation must reject anything that
   isn't exactly 10 or 13 characters (after normalizing `x`/`X`) rather than
   guessing the user meant to omit the check digit.
8. **Bulk input needs per-row error isolation, not all-or-nothing failure.**
   FreeISBN's row-level table (ISBN | Type | Status) is the correct shape:
   one malformed line in a 50-line paste must not abort the whole batch —
   each row validates independently and reports its own status.

## 8. Chosen archetype

**Instant transform** (paste → live result, no run button) for the single-ISBN
case, escalating to **batch queue**-flavored table output for the multi-ISBN
case — but since ISBN validation is a synchronous, sub-millisecond
computation (not an async job), the "batch" here is a **larger instant
transform** (one paste, one live table), not a literal queued/async job
surface.

Why not the others:
- *Configure-then-generate* — wrong: there are no options that reshape the
  output; the ISBN itself is the only input, nothing "generates" from
  settings.
- *Decision wizard* — wrong: the user already has a specific ISBN (or list of
  them) in hand; they are not choosing between abstract paths.
- *Drop-and-verdict* — close (a verdict is exactly what's produced), but
  "drop" implies a file-upload-first pattern (à la file-type detect, EXIF);
  here the input is always short pasted text, never a file, so instant
  transform's "no run button, live as you type" framing fits the actual
  input mode better than a file-drop metaphor.
- *Two-pane compare* — wrong: there's one ISBN (or a list of independent
  ISBNs) being checked against a fixed rule, not two artifacts being diffed
  against each other.
- *Inspect-and-drill* — wrong: the output structure is shallow (verdict +
  type + optional converted form + optional correction suggestion), not a
  deep nested tree to explore like JWT or JSONPath.
- *Batch queue (literal, async)* — wrong for the core tool: validating even
  hundreds of ISBNs is microseconds of pure computation with no I/O, so a
  progress bar / job-tier surface would be theater, not function. A genuine
  async batch-file (thousands of rows via CSV upload) could live on the J
  surface later per §6.7.9 Processor, but is out of scope for Core.
- Plain *form + button* — rejected for the single-ISBN case because the
  computation is instant and pure; a button is a step tax exactly as it is
  for base64/case-convert. (A button remains reasonable, not required, for
  the bulk textarea, to avoid re-validating on every keystroke while the
  user is mid-paste of a long list — debounce-on-blur/paste is the practical
  middle ground and is what we specify below.)

## 9. Our design

### 9.1 Journey

1. Land on page: **one `Textarea`**, not a single-line `Input` — accepts
   either one ISBN or many, one per line (or comma/whitespace-separated;
   normalize on parse). No mode toggle, no tab switch between "single" and
   "bulk" (FreeISBN's two-mode split is unnecessary complexity — one field
   that scales from 1 to N rows is simpler and matches how a user actually
   pastes from a spreadsheet column).
2. As soon as content lands (paste event, or debounced ~150ms on typing, or
   on blur for long multi-line input to avoid re-validating every keystroke
   mid-paste), each line is parsed and validated **live, no run button** —
   this is the instant-transform slice, extended to N lines.
3. **Per-row result** (rendered as a table, matching FreeISBN's correct
   shape, even for a single row): columns = Input (as typed) · Normalized
   (hyphens/spaces stripped) · Detected type (ISBN-10 / ISBN-13 / invalid
   length) · Valid (✓/✗) · Converted equivalent (the other format, when
   convertible) · Note (e.g. "979 prefix — no ISBN-10 equivalent," "short
   input," "did you mean `<corrected>`?").
4. **Correction suggestion on failure** (AnyOnlineTool's differentiator,
   worth matching): when an ISBN fails only the check digit (right length,
   right character set, wrong final digit), compute and display what the
   correct check digit *would* be for the given prefix — this is cheap to
   compute (it's the same formula run in reverse) and turns a bare "Invalid"
   into an actionable "Invalid — check digit should be `7`, not `3`."
5. **Output actions:** Copy results as a formatted table/CSV, and Copy as
   JSON (array of per-row result objects) for agent/script consumption —
   nothing in the competitor set offers a structured JSON copy. No forced
   download, no forced upload — this is pure text in, text out.
6. **Error/edge states:** empty input → empty/skeleton table, no error
   styling. Line with wrong length after stripping non-digits → reported as
   "invalid length" (not silently treated as valid-9-digits-needs-a-check-
   digit). Mixed valid/invalid lines in a paste → each row reports
   independently (FreeISBN's per-row isolation, generalized to n rows rather
   than capped at 50).
7. **No forced mode split, no forced upload:** everything happens from one
   textarea; there is no file-upload path for Core (a CSV-column
   upload/bulk-file variant could be a J-surface Processor tool later per
   §6.7.9, out of scope here).

### 9.2 Layout

- Above the fold: the textarea (full width, ~4-6 rows tall, expandable) and
  the results table directly beneath it, both visible without scrolling —
  matching the "tool is compact and immediate" signal that is consistent
  across all five competitors (each puts the working tool at the very top,
  ahead of any explanatory content).
- Options density: zero required options — no format selector (auto-detect
  always; AnyOnlineTool's manual-override toggle is not needed since our
  auto-detect is unambiguous by length/prefix, and offering it would be a
  control users never need to touch).
- No SEO-article scaffold competing with the tool for above-the-fold space —
  unlike all five competitors, who bury a compact tool under multiple
  screens of "What is/How to/Why" prose before any content of genuine
  educational value (the algorithm explanation) appears. If we want that
  content, it goes clearly below the tool, not instead of a clean landing.
- Mobile: single-column stack — textarea, then results table (horizontally
  scrollable within its own container if columns don't fit, per repo
  convention for wide tabular output).

### 9.3 Must-have

*without these, users bounce back to a competitor*

- Bulk input (matching/exceeding FreeISBN's 50-line cap — no artificial cap,
  or a generously high one, since it's pure computation).
- Per-row error isolation in a table (FreeISBN's shape) rather than one
  verdict for the whole paste.
- Bidirectional 10↔13 conversion with the 979-prefix caveat stated
  explicitly, not silently dropped or wrongly computed (QuantCDN's
  correctness bar).
- Correction suggestion on check-digit-only failures (AnyOnlineTool's
  differentiator).
- Auto-detection of ISBN-10 vs ISBN-13 with no manual format selector
  required (matching the cleanest of the five).

### 9.4 Deliberately skipped

- Registry/"is this ISBN actually assigned to a book" lookup — would require
  querying external ISBN-agency/OpenLibrary-style databases, is a different
  JTBD (bibliographic lookup, not format validation), and none of the five
  competitors do it either; state the limitation in-UI instead (per know-how
  #5).
- Separate "ISBN Hyphenator" / "Barcode Generator" / "Check Digit
  Calculator" as standalone pages the way ISBN.co.in splits them — our
  version folds check-digit display and conversion into the one validator
  result instead of routing users to five separate tools.
- A file-upload/CSV-column bulk mode for Core — the textarea handles the
  realistic paste-from-spreadsheet case; a true multi-thousand-row async
  file job is Processor-root, J-surface territory (§6.7.9), not this tool.
- Ads or upsell content inside the workflow — per house differentiator
  table in §6.7.10, never inside the tool journey.
- A manual format-override control — auto-detect is unambiguous here
  (length + prefix fully determine ISBN-10 vs ISBN-13), so the control
  AnyOnlineTool offers would be a dead affordance for us.

### 9.5 Differentiator

**Our differentiator:** one tool that does what five competitors split
across bulk-only, convert-only, correction-only, and API-only variants —
bulk paste + per-row table + bidirectional conversion with the 979-prefix
rule stated correctly + check-digit correction suggestions + JSON copy, all
in one field with zero required options, plus OpenAPI + MCP callability
that none of the five expose as a documented, self-serve API (AnyOnlineTool
has an API/embed surface but it's tied to that platform's generic
tool-builder, not a specialist ISBN contract).

### 9.6 I/O contract

*for the implementer*

```
input:  { text: string }
        // one or more ISBNs, one per line (or whitespace/comma separated)

output: {
  results: Array<{
    input: string,                      // as typed, verbatim
    normalized: string,                 // hyphens/spaces stripped, uppercase X
    detectedType: "isbn10" | "isbn13" | "invalid-length",
    valid: boolean,
    checkDigitExpected?: string,        // present when valid=false and length/charset are otherwise correct
    converted?: { type: "isbn10" | "isbn13", value: string },
                                         // absent when source is 979-prefixed ISBN-13 (no ISBN-10 form exists)
    note?: string                       // e.g. "979 prefix has no ISBN-10 equivalent"
  }>
}
```
Side effect: `pure`. Engine: implement the two check-digit algorithms
directly (mod-11/weighted-10-to-1 for ISBN-10, mod-10/alternating-1-3 for
ISBN-13) — this is closed-form arithmetic per the ISO 2108 spec, not a
statistical/heuristic problem, so hand-implementing the two formulas is
appropriate and is not what 手搓禁止 (手搓禁止 targets components with
existing battle-tested wheels like icons/UI/statistical detectors — a
documented ISO check-digit formula is closer to "trivially deterministic,"
same framing §6.7.9 uses for Template).

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

Per §6.5: this brief satisfies gates 11 (competitor teardown, this document)
and 12 (archetype chosen deliberately, §8 above). Gates 1–10 (implementation,
OpenAPI/MCP wiring, meter id, error codes, privacy note, SKILL.md) are
implementation work, out of scope for this research-only brief.

## 11. Gaps and open questions

- [ ] **No competitor was exercised with a real ISBN.** All five were captured
      in entry state, so their result rendering, error copy, and (for
      AnyOnlineTool) the correction-suggestion behaviour we single out as
      worth adopting (§9.3) are described from page copy, not observed output.
- [ ] **Mobile behaviour is unverified for all five** (§5) — static desktop
      captures; one competitor claims "mobile compatible" in its own copy and
      that claim is not checked here.
- [ ] **The registry-assignment limitation is stated, not sourced** (§7 item
      5 / §9.4): "none of the five do a real registry lookup" is an absence
      inferred from their pages, not confirmed against their backends.
- [ ] **Hyphenation ranges are the hardest correctness dependency and no
      source is pinned.** ISBN hyphenation depends on the ISBN International
      range file, which changes; this brief does not name where we would get
      it, how often it updates, or what we display when a prefix falls outside
      the ranges we hold. Decide before claiming correct hyphenation.
- [ ] **Bulk-paste ceiling is undefined** (§9.2) — the textarea case is
      described as "realistic paste-from-spreadsheet", but no row count is
      fixed, and the hand-off point to the Processor J surface is therefore
      unspecified.
- [ ] **The demand corroboration in §2 is carried over from the prior
      landscape survey and not re-verified this pass.**
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in this brief.
