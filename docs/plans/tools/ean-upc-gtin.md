# Tool brief: ean-upc-gtin

**Root:** Verifier (§6.7.9 — thin root, target ≥5; this is a candidate to bring it there)
**Category:** EAN / UPC / GTIN Barcode Checksum Validator
**Status:** research complete (rev. 2 — standards-body reach added), not built

## 0. Revision note (why this brief was redone)

The first pass (5 competitors: EAN Check, LimeConvert, go-upc, BarcodeFinder,
ScanZen) never reached the standards body itself or the barcode-industry
vendors who publish the reference implementation. This revision adds four more
sources — **GS1 US's own Check Digit Calculator**, **Bar Code Graphics'
GTIN Check Digit Calculator** (mirrored at two domains, `gtin.info` and
`barcode.graphics`), and **Morovia's** single-code and bulk calculators — and
changes two things as a direct result:

1. **Scope.** GS1 US's own calculator treats GTIN-8/12/13/14, **SSCC**, and
   **GLN (as GTIN-13)** as one calculator, one page, six input rows. The first
   brief scoped to GTIN-8/12/13/14 only and silently dropped SSCC-18 and
   GLN-13 without ever having seen that the authority bundles them. Same
   mod-10 family, same code path — this revision adds them back. Morovia goes
   further still, bundling UPC-A/EAN-13/EAN-8/SCC-14-GTIN/SSCC-18/ISBN-10/BLN
   on one page (see §2–3 below); ISBN-10 and BLN are treated as **open scope
   questions**, not silently included or excluded (§11).
2. **Differentiator, corrected.** The premise that GS1 US "calculates as you
   type, with no run button" **did not survive direct observation.** The
   captured screenshot (`gs1us.png`) shows an explicit **Calculate** button
   next to every one of its six input rows, paired with a **Clear** button —
   this is a button-gated, one-field-at-a-time design, not a live/bulk one.
   Whatever the intended framing was, "instant, no button" was never actually
   this brief's stated differentiator to begin with (see the original §9,
   preserved below in spirit): the real claims were the machine contract,
   dual verb (Calculate + Validate), bulk with structured per-line output,
   and copy/CSV. Those claims are **strengthened**, not weakened, by this
   round of research — none of the four new sources offer any of them either.
   See §9 for the restated differentiator and §11 for what could not be
   confirmed.

## 1. Demand

- **JTBD:** "Is this barcode number mathematically valid?" and "what's the
  check digit for this incomplete barcode?" — two related but distinct jobs:
  validate a complete code (has someone mistyped/corrupted a GTIN?), or
  calculate the missing final digit (generating labels, populating a catalog,
  Amazon/Shopify listing prep).
- **Keywords:** EAN check digit calculator, UPC validator, GTIN checksum
  calculator, barcode validator, is this UPC valid, EAN-13 check digit, SSCC
  check digit, GLN check digit.
- **Pain:** typo'd product codes rejected by a scanner or an Amazon/marketplace
  listing pipeline, a spreadsheet of SKUs where some check digits are wrong,
  needing to hand-append a check digit to a partial barcode before printing a
  label, bulk-cleaning a product catalog import, computing an SSCC-18 for a
  shipping label or a GLN for a location record — the same math, a less
  commonly-served case.

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| EAN Check | https://eancheck.com/ | Yes (WebFetch + screenshot) | [eancheck.png](../../research/forge/ean-upc-gtin/eancheck.png) |
| LimeConvert Barcode Validator | https://limeconvert.com/barcode-validator | Yes (WebFetch + screenshot) | [limeconvert.png](../../research/forge/ean-upc-gtin/limeconvert.png) |
| go-upc.com Barcode Number Validator | https://go-upc.com/upc-checker-validator | Yes (WebFetch + screenshot) | [go-upc.png](../../research/forge/ean-upc-gtin/go-upc.png) |
| BarcodeFinder Barcode Validator | https://www.barcodefinder.info/barcode-validator.html | Yes (WebFetch + screenshot) | [barcodefinder.png](../../research/forge/ean-upc-gtin/barcodefinder.png) |
| ScanZen Barcode Number Validator | https://scanzen.app/tools/barcode-validator | Yes (WebFetch gave thin/minimal text — likely client-rendered; screenshot fully confirms the page) | [scanzen.png](../../research/forge/ean-upc-gtin/scanzen.png) |
| **GS1 US Check Digit Calculator** | https://www.gs1us.org/tools/check-digit-calculator | Yes (WebFetch + screenshot) | [gs1us.png](../../research/forge/ean-upc-gtin/gs1us.png) |
| **Bar Code Graphics GTIN Check Digit Calculator** | https://gtin.info/check-digit-calculator/ (mirrored, same company/tool, at https://barcode.graphics/check-digit-calculator/) | Yes, both domains (WebFetch + screenshot each) | [gtin-info.png](../../research/forge/ean-upc-gtin/gtin-info.png), [barcodegraphics.png](../../research/forge/ean-upc-gtin/barcodegraphics.png) |
| **Morovia UPC/EAN/SSCC/GTIN/ISBN Utilities** | https://www.morovia.com/education/utility/upc-ean.asp | Yes (WebFetch + screenshot) | [morovia.png](../../research/forge/ean-upc-gtin/morovia.png) |
| **Morovia Bulk Check Digit Calculator** | https://www.morovia.com/bulk-check-digit-calculation/ | Yes (WebFetch + screenshot) — separate page, same company | [morovia-bulk.png](../../research/forge/ean-upc-gtin/morovia-bulk.png) |

`gtin.info/check-digit-calculator/` and `barcode.graphics/check-digit-calculator/`
are the same tool (same four-row field set, same copy, same company — Bar Code
Graphics, Inc.) mirrored on two domains; treated as one competitor with two
URLs, not two distinct products. All nine URLs above were reached and
screenshotted directly; nothing in this section is inferred from a search
snippet alone.

## 3. Feature inventory

*(Original five — EAN Check, LimeConvert, go-upc, BarcodeFinder, ScanZen —
unchanged from the first pass; preserved below for completeness, then the
four new sources.)*

**EAN Check** (the deepest, most complete implementation of the original five):
- **Two named modes in one page: Calculate and Validate**, run from the same
  input box with two separate buttons — Calculate appends a check digit to an
  incomplete code, Validate confirms/rejects a complete one and reports
  `"GTIN-XX OK"` or `"invalid {barcode}"`.
- **Bulk by default** — paste many barcodes, one per line and/or comma-separated,
  processed in one pass; claims "verified to work with up to 1 million lines
  per call."
- Supports GTIN-8, GTIN-12/UPC-A, GTIN-13/EAN-13, GTIN-14 (ITF-14/SCC-14) with
  a supported-standards reference table on the page itself.
- Explicit client-side/no-server-transmission claim in the FAQ.
- Sister-tool cross-links (ISBN Converter, Barcode Repair, GS1 Digital Link,
  GS1-128 Parser, Barcode Identifier) plus two unrelated utility cross-links —
  the upsell padding named in the original brief.
- No visible copy/download button on the output textarea.

**LimeConvert** (best-in-class UX polish):
- "Mode: Detect automatically" dropdown; live validation, no button.
- Two result tabs (Barcodes / Totals); click-through to full step-by-step
  check-digit math; context-menu row actions; share-results link.
- States GEPIR (GS1's own assignment registry) as the distinction between
  "validates" and "is actually registered" — an important point corroborated
  independently by go-upc below.
- No copy/download/export button.

**go-upc.com**:
- Single live field, no button; heaviest worked-example teaching content.
- Explicitly separates "validates" from "is a real, assigned product code,"
  funneling into a paid product-database search — its actual commercial
  moat, a different (heavier) business than checksum math.
- No bulk, no format auto-detect UI, no copy/export.

**BarcodeFinder**:
- Two-pane layout, explicit Format Override dropdown (Auto-detect / manual
  EAN-13, UPC-A, ISBN-13, EAN-8, etc.), explicit Validate button.
- Separate "Barcode Information" panel (format, checksum status, country of
  origin from GS1 prefix). Bundles EAN-13/UPC-A/ISBN-13 (+ISBN-10, ISSN,
  Code 39, ITF) on one page — same GS1/mod-10 family bundling logic this
  revision applies to SSCC/GLN.
- Single-barcode only, no copy/export.

**ScanZen**: consumer-framed companion validator inside a separate AI
product-scanning app; simplest interface of the original five; post-submit
state not independently confirmed (see original gap, unchanged).

**Core capability everyone in the original five actually comes for:** enter a
barcode number (one or many), get a mathematically-grounded valid/invalid
verdict or a computed check digit, instantly or on a click.

---

**GS1 US Check Digit Calculator** (the standards body's own tool):
- **Six input rows, one calculator, one page**: GTIN-12, GTIN-13 or GLN,
  GTIN-14, SSCC, Bill of Lading, GTIN-8 — each row has its own "ID Number"
  field, a read-only "Check Digit" output box, and **both a Calculate button
  and a Clear button** (confirmed directly from the screenshot; this is a
  button-gated, one-code-at-a-time design, not a live/no-button one — see
  Revision note §0).
- No bulk/paste-many mode anywhere on the page — each of the six rows
  computes one code at a time.
- Heavy commercial surface around the calculator itself: a top banner selling
  a $79-value "Free Course with Prefix," a "Get a GS1 Company Prefix" CTA in
  the header, and a "Master the Basics of Product Identification" course
  upsell directly below the calculator fields.
- Links out to a PDF for manual check-digit calculation and to **GS1 US Data
  Hub**, described as calculating the check digit "automatically" — i.e. GS1
  US itself frames its *other* product as the more automated option, not this
  page.
- No copy/download button, no per-code type auto-detection (the row itself
  is the type selection), no privacy/client-side claim found on the page.

**Bar Code Graphics GTIN Check Digit Calculator** (`gtin.info` /
`barcode.graphics`, same tool, same company):
- **Four input rows**: GTIN-12 (UPC-12), GTIN-13 (GLN), GTIN-14, SSCC-18 —
  narrower than GS1 US (no GTIN-8, no Bill of Lading).
- Each row shows **only a "Clear" button in the captured screenshot — no
  visible Calculate button.** This is a real observed difference from GS1 US
  and is consistent with the page's own instruction copy ("simply enter or
  paste the first numbers for the barcode... the free calculator will
  determine the correct check digit"), which reads as live-as-you-type. This
  could **not be confirmed by interaction** (WebFetch/screenshot capture the
  DOM before any typing), so it is reported as an observation, not a proven
  behavior — see §11.
- Heavy commercial surrounding content on both mirrored pages: a
  "Create Digital Barcodes Online 24/7 for $10" cross-sell to
  createbarcodes.com, a "GS1 Barcode Support" consulting upsell, a "UPC
  Barcodes Are Set to Be Replaced Starting 2027" (GS1 Digital Link) content
  block, and (on the `barcode.graphics` mirror specifically) client logos
  (Amazon, Serta, Barnes & Noble, Sears, ECIA) and a blog feed.
- No bulk mode, no copy/export, no format auto-detect beyond the row itself.

**Morovia — single-code calculator** (`education/utility/upc-ean.asp`):
- **The widest single-page format list actually confirmed in this research:**
  UPC-A, EAN-13, SCC-14/GTIN, SSCC-18, EAN-8, ISBN (10-digit only — the page's
  own copy states "13 digit use EAN-13," independently corroborating this
  brief's existing know-how point that ISBN-13 is GS1 mod-10 while ISBN-10 is
  not), and BLN (Bill of Lading). Each row is **button-triggered** ("calculate"
  per row), not live.
- A separate **"Number Converter"** section on the same page: UPC-A → UPC-E
  and UPC-E → UPC-A. This is **not a checksum calculation** — it's a
  format-compression/expansion operation with its own zero-suppression rules,
  bundled alongside the checksum calculators because it's a related but
  distinct job (see know-how §11.9). No separate UPC-E checksum row exists.
- An "Explanation" section below the fields walks the UPC-A mod-10 algorithm
  digit-by-digit with a worked numeric example — comparable to go-upc's and
  LimeConvert's own worked-example content, corroborating that this is
  standard practice across the category, not a novel teaching feature.
- Extensive unrelated-product sidebar ("Our Products": ~23 barcode *font*
  product links — Code 39, Code 128, MICR, OCR-A/B, QRCode, DataMatrix fonts,
  etc.) — the heaviest cross-sell padding of any source in this research,
  though it is at least topically adjacent (barcode tooling generally, not
  unrelated utilities like ScanZen's).
- No copy/download button, no bulk mode on this page.

**Morovia — bulk calculator** (separate page, `bulk-check-digit-calculation/`):
- **A real, distinct bulk tool** confirming the shape this brief's original
  differentiator claims as its primary case exists at at least one competitor
  — but with a real, confirmed gap: the page's own on-page instruction text
  states "Enter your **UPC, EAN, GTIN** numbers below" — **not** the fuller
  SSCC-18/BLN/ISBN/ITF-14/Interleaved-2-of-5 list that a search-engine
  snippet for this same URL suggested (see §11 — that broader list could not
  be confirmed against the actual fetched page and is not asserted here).
- **Textarea in, textarea out**: one number per line (without its check
  digit) in a "Numbers" box, a **Submit** button (button-triggered, not
  live), and a separate empty "Results" textarea below it. The captured
  content does not show the post-submit populated state (same limitation as
  ScanZen in the original research — our tools capture the pre-submit DOM).
- Plain textarea output only — no table, no per-line type column, no
  copy/CSV/download affordance, no visible statement of whether input order
  is preserved.
- Same font-product sidebar cross-sell as the single-code page.

**What the four new sources add to "core capability everyone comes for":**
GS1 US and Morovia both confirm that **SSCC and GLN(-13) are treated as part
of the same mod-10 checksum family as GTIN-8/12/13/14** — GS1 US bundles all
six into one page with no framing distinction between them; Morovia bundles
UPC-A/EAN-13/EAN-8/SCC-14-GTIN/SSCC-18/BLN into one page the same way. None of
the four new sources offer bulk mode across that full family (GS1 US has no
bulk at all; Morovia's bulk tool is scoped narrower — UPC/EAN/GTIN only — than
its own single-code page); none offer a Validate operation (all four are
Calculate-only: enter the code *without* its check digit, get the check digit
back — none accept a complete code and confirm/reject it); none offer
copy/CSV export; none document an API for this specific capability.

## 4. Journey maps

*(Original five unchanged from the first pass — see §3 above for the summary
of each; full step-by-step retained from the prior revision and not repeated
here to keep this section focused on the four new sources.)*

**GS1 US** (button-per-row, one-page bundle):
1. Arrive → page banner (course/prefix upsell), then a short intro paragraph
   ending "...the check digit automatically" (referring to the calculator as
   a whole, not to live-as-you-type behavior — the six rows below all require
   a click).
2. Six labeled rows, each: format name, an "ID Number" input, a read-only
   "Check Digit" box, a **Calculate** button, a **Clear** button.
3. User picks the row matching their format, types the code, clicks
   Calculate; the Check Digit box populates for that row only.
4. Below the calculator: a course-upsell card, then footer links (Terms,
   Privacy, GS1 Global, GS1 Connect, Sitemap).

**Bar Code Graphics** (`gtin.info` / `barcode.graphics`, four-row bundle):
1. Arrive → short intro stating the tool "will determine the correct check
   digit for all forms of GTIN identification," then (on the
   `barcode.graphics` mirror) a large "Create Print-Ready Digital .EPS
   Barcode Files 24/7" promotional block *before* the calculator itself.
2. Four rows (GTIN-12, GTIN-13/GLN, GTIN-14, SSCC-18), each an input field, a
   disabled-looking output field, and a **Clear** button only (no visible
   Calculate button in either capture — see the observation note in §3).
3. Below: a GS1 Barcode Support upsell card, a GS1 Digital Link / "UPC
   Barcodes Are Set to Be Replaced Starting 2027" content block, then
   (barcode.graphics only) a createbarcodes.com product carousel, three
   feature callouts, a news/blog feed, and a client-logo wall.

**Morovia single-code calculator**:
1. Arrive → breadcrumb, page title "UPC/EAN/SSCC/GTIN/ISBN Utilities," a
   "Check Digit Calculator" table with seven format rows (Number / Check
   Digit / calculate button per row), then a "Number Converter" mini-table
   (UPC-A↔UPC-E, two rows, its own calculate buttons) directly beneath it.
2. User picks a row, types the number, clicks calculate; result appears in
   that row's Check Digit field.
3. Below both tables: an "Explanation" section with a fully worked UPC-A
   example (five numbered steps, values inline).
4. A persistent right-rail sidebar of ~23 barcode-font product links runs the
   full height of the page.

**Morovia bulk calculator**:
1. Arrive → page title "Bulk Check Digit Calculator," one instruction
   paragraph ("Enter your UPC, EAN, GTIN numbers below... each number
   occupying one line... Press Submit to receive the results"), a "Numbers"
   textarea pre-filled with two example lines, an empty "Results" textarea
   below it, and a **Submit** button.
2. User replaces the example lines with their own numbers (one per line,
   without check digits) and clicks Submit — the pre-submit DOM is all that
   was captured; the populated-results state is not confirmed (§11).
3. Same font-product sidebar as the single-code page.

**Common shape added by this round:** every one of the four new sources is
either (a) one-code-per-click across several named format rows on a single
page (GS1 US, Bar Code Graphics, Morovia single-code), or (b) one bulk
textarea-to-textarea tool scoped to a narrower subset of formats than the
site's own single-code calculator (Morovia bulk). None combine bulk scale
with the full format family the way this brief's own design (§9) targets.

## 5. Layout + screenshots

*(Original five findings unchanged — see prior revision.)* Adding the four
new sources:

- **GS1 US and Morovia (single-code)** both use a **vertical stack of
  labeled rows**, one row per format, each row self-contained (input → output
  → action button(s)) — a materially different shape from any of the original
  five, none of which used a per-format-row table. This is the layout that
  makes "one calculator, many GS1 identifier types" legible at a glance, and
  is worth adopting the *idea* of (one page, several code families,
  explicitly labeled) even though our own design (§9) folds format
  *detection* into the bulk table rather than pre-selecting a row.
- **Bar Code Graphics** uses the same row-per-format shape but with heavier
  surrounding commercial content interleaved *between* the intro and the
  calculator itself (an .EPS-file sales block sits above the fields on the
  `barcode.graphics` mirror) — the calculator is not the first thing the eye
  lands on the way it is on the other three.
- **Morovia bulk** is the only one of the four new sources with a two-box
  (input textarea / output textarea) shape, matching EAN Check's original
  Input|Output layout rather than the row-per-format shape of its own
  sibling page.
- **Options density:** none of the four new sources expose a format-override
  dropdown or auto-detect toggle — the "option" is simply which row/field the
  user chooses to fill in. This confirms the original brief's finding (§7.7,
  preserved below) that GTIN-length auto-detection is unambiguous and no
  competitor treats it as a configurable option.
- **Mobile:** not independently verified for any of the nine sources now on
  file — all captures remain desktop viewport.

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- [docs/research/forge/ean-upc-gtin/eancheck.png](../../research/forge/ean-upc-gtin/eancheck.png)
- [docs/research/forge/ean-upc-gtin/limeconvert.png](../../research/forge/ean-upc-gtin/limeconvert.png)
- [docs/research/forge/ean-upc-gtin/go-upc.png](../../research/forge/ean-upc-gtin/go-upc.png)
- [docs/research/forge/ean-upc-gtin/barcodefinder.png](../../research/forge/ean-upc-gtin/barcodefinder.png)
- [docs/research/forge/ean-upc-gtin/scanzen.png](../../research/forge/ean-upc-gtin/scanzen.png)
- [docs/research/forge/ean-upc-gtin/gs1us.png](../../research/forge/ean-upc-gtin/gs1us.png)
- [docs/research/forge/ean-upc-gtin/gtin-info.png](../../research/forge/ean-upc-gtin/gtin-info.png)
- [docs/research/forge/ean-upc-gtin/barcodegraphics.png](../../research/forge/ean-upc-gtin/barcodegraphics.png)
- [docs/research/forge/ean-upc-gtin/morovia.png](../../research/forge/ean-upc-gtin/morovia.png)
- [docs/research/forge/ean-upc-gtin/morovia-bulk.png](../../research/forge/ean-upc-gtin/morovia-bulk.png)

## 6. Their debt

*(Original five findings unchanged.)* The four new sources add:

- **GS1 US's calculator page is itself a lead-generation surface** for a
  $79-value course, a GS1 Company Prefix purchase, and GS1 Barcode Support
  consulting — the free calculator sits inside, not beside, that funnel. This
  is a heavier commercial surround than any of the original five (none of
  which is a standards body monetizing prefix/membership sales).
- **Bar Code Graphics cross-sells directly into a paid product** ($10 EPS
  barcode files at createbarcodes.com) from inside the calculator page,
  placed *above* the calculator fields on one of its two mirrored domains.
- **Morovia's sidebar cross-sell (~23 font-product links) is the densest
  cross-sell surface found in this entire research pass**, original or new —
  though it is at least topically coherent (barcode tooling), unlike
  ScanZen's unrelated-utility footer.
- **No bulk-plus-full-family combination exists anywhere researched.** GS1
  US has full family (six GS1 types) but zero bulk. Morovia has bulk, but
  scoped narrower (UPC/EAN/GTIN only, per its own on-page copy) than its own
  single-code page's seven formats. This is the clearest, most directly
  confirmed gap in the entire competitive set — see §9.
- **None of the four new sources offer a Validate operation** — all are
  Calculate-only (input a code *without* its check digit, receive the check
  digit). A user with a complete, possibly-typo'd code has nothing here that
  confirms or rejects it; they would need to strip the last digit themselves,
  recompute, and compare by hand.
- **No copy/download/export affordance on any of the four new sources** —
  the same category-wide gap the original five research pass found, now
  confirmed against the standards body's own tool as well.

## 7. Domain know-how

*(Original eight points, unchanged, preserved from the prior revision — see
git history for the full original text; summarized here for continuity:
1. UPC-A is a special case of EAN-13, not a sibling format. 2. Mod-10
weighting alternates 3/1 from the rightmost non-check digit; position parity
flips at even lengths — the most common naive-implementation bug. 3. "Valid
checksum" ≠ "registered/assigned to a real product" — GEPIR is the only real
assignment-registry check. 4. ISBN-13 shares the GS1 mod-10 family; ISBN-10
uses a distinct mod-11 algorithm with a possible `X` check character. 5. Bulk
mode must preserve line order and per-line addressability. 6. Calculate and
Validate are genuinely different jobs on the same math, not the same button
with two labels. 7. Length-based auto-detect is safe and unambiguous across
GTIN-8/12/13/14 — no length collision exists in this family. 8. Non-digit
input handling (spaces, hyphens) matters at the UX level, not just the math
level.)*

New points confirmed by this round's research:

9. **SSCC and GLN(-13) are the same mod-10 checksum family as GTIN-8/12/13/14,
   confirmed by the standards body itself.** GS1 US's own calculator makes no
   algorithmic distinction between its six rows beyond input length/prefix —
   it is one calculator, one page, treating GTIN-8/12/13/14, SSCC, and GLN as
   siblings. Morovia's independent bundling of UPC-A/EAN-13/EAN-8/SCC-14-GTIN/
   SSCC-18/BLN on one page corroborates this from a second, unrelated source.
   This directly justifies re-adding SSCC-18 and GLN-13 to this tool's scope
   (§9, §11) — the original brief's silent exclusion of both was a scoping
   miss, not a deliberate decision made with this evidence in hand.
10. **Bill of Lading Number (BLN) appears in both GS1 US's and Morovia's
    bundled calculators**, alongside the GTIN/SSCC/GLN family — but its exact
    check-digit algorithm was **not independently derived or confirmed** in
    this research pass (neither source's page shows the worked math for BLN
    the way both show it for UPC-A). Treated as an **open scope question**
    (§11), not silently added: if BLN genuinely shares the mod-10 family, it
    is near-zero marginal cost to add; if its algorithm differs, it needs its
    own verified implementation before being folded into the same code path.
11. **UPC-E is a compressed representation of UPC-A, not a distinct checksum
    algorithm — it is a format-conversion job, not a validation job.**
    Morovia's own page structure makes this distinction explicit: UPC-E lives
    in a separate "Number Converter" section (UPC-A→UPC-E, UPC-E→UPC-A) with
    its own zero-suppression encoding rules, entirely apart from the "Check
    Digit Calculator" table. A naive implementation that tried to give UPC-E
    its own checksum row (the way GTIN-8/12/13/14 each get one) would be
    solving the wrong problem — UPC-E's check digit is UPC-A's check digit
    under a compression scheme, not an independent computation. This is a
    real, distinct future tool (a UPC-A↔UPC-E converter), not a checksum
    validator feature.

## 8. Chosen archetype

**Instant transform** (§6.7.10) — paste → live result, no run button — is
**unchanged** from the original brief. Its justification never depended on
"GS1 US does this too" (it did not claim that), so the correction in §0/§9
does not require re-opening the archetype choice. If anything, this round
reinforces the choice by contrast: GS1 US, Bar Code Graphics, and Morovia's
single-code page are all **row-per-format, button-per-row** — the opposite of
instant-transform — and none of them attempt the bulk-paste shape this tool
is built around. Morovia's bulk tool is button-triggered (Submit), not live,
which is the one place among the nine competitors that comes closest to our
own bulk archetype and still doesn't match it (no live update, no structured
output, narrower format scope than its own single-code sibling).

*(The original's full reasoning against the other six archetypes —
configure-then-generate, decision wizard, drop-and-verdict, two-pane compare,
inspect-and-drill, batch queue — is unchanged and not repeated here.)*

## 9. Our design

### 9.1 Journey

**Journey** — unchanged in shape from the original brief (paste box, no run
button, live results table, operation toggle, per-row expandable math,
aggregate summary, copy/CSV export, permanent "valid ≠ registered" note,
honest large-input caveat, `unrecognized-length` as a distinct failure mode
from `invalid`) — **with the format family widened**:

- **Supported types (revised):** GTIN-8, UPC-A (GTIN-12), EAN-13 (GTIN-13),
  GTIN-14, **SSCC-18** (new), **GLN-13** (new) — added on the direct evidence
  in §7.9 that GS1 US and Morovia both treat these as the same mod-10 family
  as the GTIN lengths already in scope. Auto-detection by length remains safe
  per the original know-how §7.7 for the GTIN-8/12/13/14 set; **SSCC-18 (18
  digits) and GLN-13 (13 digits, same length as EAN-13) need an explicit
  disambiguation rule** — GLN and EAN-13/GTIN-13 are the same length, so
  length alone cannot tell them apart the way GTIN-8/12/13/14 can be told
  apart from each other. This is a real new design requirement introduced by
  widening scope, not a trivial add: either the operation toggle needs a
  GLN-vs-GTIN-13 disambiguator when a 13-digit code is entered, or the tool
  reports both interpretations (the check digit is identical either way,
  since it's the same mod-10 math over the same 13 digits — only the
  *semantic label* differs, so this is a labeling decision, not a
  computation one).
- **Bill of Lading (BLN) is deliberately NOT added in this revision** —
  flagged as an open question (§11) pending independent verification of its
  check-digit algorithm, per know-how §7.10.

### 9.2 Layout

**Layout** — unchanged from the original brief (single column, results
table not two-panel cards, inline expandable math, no ads/cross-sell/sign-up
in the workflow).

### 9.3 Must-have

**Must-have features** — unchanged, plus:
- **Full GS1 mod-10 family (GTIN-8/12/13/14 + SSCC-18 + GLN-13), not GTIN-only**
  — now a must-have, not a nice-to-have, given GS1 US's own scope precedent
  (§7.9). Shipping GTIN-only after seeing this evidence would be a known,
  avoidable gap against the standards body's own tool.

### 9.4 Deliberately skipped

**Deliberately skipped, with reason** — unchanged from the original brief
(product-database lookup, barcode image generation, ISBN-10's mod-11
algorithm, GEPIR live lookup, account/sign-up/sharing), **plus**:
- **UPC-E format conversion** (know-how §7.11) — a genuinely different job
  (compression/expansion with zero-suppression rules, not a checksum
  computation); Morovia's own page structure treats it as a separate feature
  from its check-digit calculator for exactly this reason. Candidate sibling
  tool (a UPC-A↔UPC-E converter), not a feature of this Verifier.
- **Bill of Lading (BLN)** — not skipped outright, but not included in this
  revision's shipped scope either; see §11 for why, and what would need to
  be confirmed before adding it.

### 9.5 Differentiator

*restated*

The original differentiator claims (agent contract, dual verb, bulk with
structured per-line output, copy/CSV, honest scope statement) are
**unchanged and, after this round, more clearly earned** — none of the four
new sources weaken them, and the one framing this revision does retract is
the "instant, no run button" claim, which (a) was never this brief's actual
headline differentiator to begin with (see §8's chosen-archetype reasoning,
which justified the journey shape on its own terms, not as a competitive
claim) and (b) is directly contradicted for GS1 US by the captured screenshot
evidence (§0, §3).

- **Full GS1 mod-10 family, bulk, in one tool.** Confirmed nowhere else in
  nine sources researched: GS1 US has the full family (GTIN-8/12/13/14 +
  SSCC + GLN) but no bulk mode at all; Morovia has bulk, but scoped to
  UPC/EAN/GTIN only — narrower than its own single-code page's seven
  formats. This tool's scope (§9, revised) closes that exact gap: GTIN-8/12/
  13/14 + SSCC-18 + GLN-13, all reachable through the same bulk paste box.
- **Both Calculate and Validate, explicitly separated, in one tool.** Now
  confirmed against *nine* competitors, not five — every single one of the
  four new sources is Calculate-only (append a check digit to a code that
  doesn't have one). None accept a complete code and confirm/reject it.
- **Agent contract.** None of the nine sources — including the standards
  body itself — expose a documented "validate/calculate this checksum" API
  or MCP surface. GS1 US's own more-automated alternative (GS1 US Data Hub,
  linked from the calculator page) is a commercial product requiring
  registration, not a public API for this specific capability.
- **Bulk-first with guaranteed line-order-preserving, structured per-line
  results** (type detected, valid/invalid, corrected code if invalid) —
  Morovia's bulk tool is the closest anything gets to this shape among the
  four new sources, and it returns to a plain, unstructured textarea with no
  documented order guarantee.
- **Copy button on the result** (plain text and CSV-shaped) — closes a gap
  now confirmed across all nine competitors researched, including the
  standards body.
- **Honest scope statement on the "valid ≠ assigned" distinction**, stated
  at the point of the result — unchanged from the original brief; this round
  found no competitor doing this better than LimeConvert/go-upc already do
  (from the original five).
- Client-side by default — still table stakes within the *validator* segment
  of this category (EAN Check, LimeConvert state it explicitly), but **not
  independently confirmed** for GS1 US, Bar Code Graphics, or Morovia — none
  of their pages state a client-side/no-server-transmission claim anywhere
  captured. Worth being honest about this rather than claiming parity we
  didn't observe.

*summary*

Agent-callable, bulk-first Calculate+Validate across the **full GS1 mod-10
family** — GTIN-8/12/13/14, SSCC-18, and GLN-13, not GTIN-only — with
input-order-preserving structured per-line output, copy/CSV export, and an
honest "valid checksum ≠ registered product" distinction stated at the point
of use. Confirmed against nine researched competitors, including GS1 US's own
Check Digit Calculator and two independent barcode-industry vendors (Bar Code
Graphics, Morovia): none combine full-family coverage with bulk mode, none
offer a Validate operation (all are Calculate-only), and none expose this
capability through a documented API or MCP surface.

### 9.6 I/O contract

- **Input:** `{ codes: string[], operation: "validate" | "calculate" }` —
  unchanged shape.
- **Output:** `{ results: [{ input, detectedType: "GTIN-8" | "UPC-A" |
  "EAN-13" | "GTIN-14" | "SSCC-18" | "GLN-13" | "unrecognized-length",
  verdict: "valid" | "invalid" | "calculated" | "unrecognized-length",
  correctedCode?: string, checkDigit?: number }], summary: { total, valid,
  invalid, calculated, unrecognized } }` — `detectedType` gains `SSCC-18` and
  `GLN-13`; a 13-digit input's `detectedType` resolves to `EAN-13` by
  default (consistent with the original brief's GTIN-first framing), with
  the GLN reading available as an explicit per-row relabel rather than a
  second silently-computed result — avoids doubling every 13-digit row in
  the output for a distinction that is purely semantic, not mathematical.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — research-only brief |
| 6 | Side-effect class declared | Not declared in this brief — carried into §11 |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (named, reached, captured) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

## 11. Gaps and open questions

Original open questions, unchanged:
- [ ] ScanZen's post-submit result state was not captured live.
- [ ] Confirm the exact bounded input size before client-side computation
      becomes noticeably slow on typical hardware.

New from this round:
- [ ] **BLN's check-digit algorithm is not independently confirmed.** Both
      GS1 US and Morovia bundle Bill of Lading into the same page as their
      GTIN/SSCC/GLN calculators, which is suggestive but not proof that it
      shares the identical mod-10 computation. Do not wire BLN into the
      shared code path until its algorithm is verified against a primary
      source (a GS1 or carrier-standard spec, not just "it's on the same
      page as the others").
- [ ] **Bar Code Graphics' four-row calculator's live-vs-button behavior is
      unconfirmed.** The captured screenshots (`gtin-info.png`,
      `barcodegraphics.png`) show only a Clear button per row, no visible
      Calculate button — consistent with live-as-you-type, but WebFetch and
      static screenshot capture the pre-interaction DOM only; no actual
      typing was performed. Do not cite this as a confirmed "live, no
      button" precedent without a follow-up interactive check.
- [ ] **Morovia's bulk-calculator format scope is ambiguous between sources.**
      A search-engine snippet for `morovia.com/bulk-check-digit-calculation/`
      described support for "EAN-13, EAN-8, BLN, ISBN, ISBN-13, SCC-14, GTIN,
      SSCC-18, ITF-14, Interleaved 2 of 5" — but the actual fetched page's
      own instruction copy states only "Enter your UPC, EAN, GTIN numbers
      below." This brief treats the directly-fetched, screenshotted page
      content as authoritative and does **not** assert the broader list from
      the snippet, which could not be corroborated against what we actually
      reached.
- [ ] **ITF-14 and Interleaved 2 of 5 as check-digit-calculator formats could
      not be confirmed anywhere in this research pass.** They appear at
      Morovia only as separate barcode *font* product lines (sidebar links:
      "Interleaved 2 of 5 Fonts"), not as rows in either check-digit
      calculator captured. If a future pass finds a primary source that
      genuinely offers these as calculator inputs (not font products), the
      "same mod-10 family, near-zero marginal cost" reasoning in §7.9 would
      need to be re-evaluated specifically for Interleaved 2 of 5, which is
      not a GS1 GTIN-family standard the way SSCC/GLN are — treat any future
      claim here with the same scrutiny applied to BLN above, not as a given.
- [ ] **GLN vs. EAN-13/GTIN-13 disambiguation at the UX/output level** (§9)
      is a real open design question, not yet resolved: report both labels
      for a 13-digit input, default to GTIN-13/EAN-13 with a manual GLN
      override, or something else. Flagging for the build phase rather than
      deciding here, since it's a labeling/UX call, not a research finding.
- [ ] ISBN-13 remains a follow-up scope-extension candidate (unchanged from
      the original brief) — this round's evidence (Morovia's own "13 digit
      use EAN-13" note) reinforces that it's mathematically identical to
      EAN-13, but does not change the original brief's decision to keep the
      first cut GTIN/SSCC/GLN-only.
- [ ] Declare the side-effect class and meter id (§10 gates 5–6) — neither is
      stated anywhere in this brief.
- [ ] Write the privacy note and the stable error-code set (§10 gates 7–8).
