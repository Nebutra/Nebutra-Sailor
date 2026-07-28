# Tool brief: vin

**Root:** Verifier (thin root, §6.7.9 — Editor 3 · Verifier 4 · Simulator 2 · Comparator 4, bring each to ≥5)
**Category:** VIN Check-Digit Validator (ISO 3779 / 49 CFR Part 565 structural check, not a vehicle-history lookup)
**Status:** research complete, not built

## 1. Demand

- **JTBD:** "Is this 17-character VIN structurally valid?" — confirm length, allowed
  characters, and that the position-9 check digit matches the ISO 3779 / North
  American 49 CFR 565.15 checksum, *before* trusting the VIN for a purchase, a
  parts lookup, a DMV form, or feeding it into a downstream decode/history tool.
- **Keywords:** VIN check digit validator, VIN checksum calculator, VIN decoder
  check digit, VIN validator online, VIN 校验位.
- **Pain:** typos when copying a VIN off a title/dashboard/photo, confusable
  characters (`O`/`0`, `I`/`1`, `Q`), cloned/rebuilt-title VINs that are
  mathematically invalid, pasting a VIN into a paid "history report" funnel just
  to find out it was mistyped.

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| FAXVIN VIN Validator | https://www.faxvin.com/vin-decoder/validator | Yes (WebFetch + screenshot) | [faxvin.png](../../research/forge/vin/faxvin.png) |
| NHTSA vPIC VIN Decoder | https://vpic.nhtsa.dot.gov/decoder/ | Partial — WebFetch blocked ("unable to verify domain is safe"), screenshot capture succeeded and was read directly as an image | [nhtsa-vpic.png](../../research/forge/vin/nhtsa-vpic.png) |
| CJ Pony Parts Check Digit Calculator | https://www.cjponyparts.com/resources/check-digit-calculator | No — WebFetch returned HTTP 403 twice via different tools; two screenshot attempts also returned HTTP 403. Only WebSearch snippets (of the page's own described methodology) were retrievable | none — capture failed twice |
| Edmunds "How To Quickly Decode Your VIN" | https://www.edmunds.com/how-to/how-to-quickly-decode-your-vin.html | No — WebFetch returned HTTP 403, two screenshot attempts also returned HTTP 403. Only WebSearch snippets retrievable | none — capture failed twice |
| driving-tests.org VIN Decoder & Checker | https://driving-tests.org/vin-decoder/ | Yes (WebFetch + screenshot) | [driving-tests-org.png](../../research/forge/vin/driving-tests-org.png) |

**Could not verify:** CJ Pony Parts and Edmunds both blocked every fetch and
screenshot attempt (HTTP 403, two tries each, per the "record and move on"
rule). What is reported for these two below comes **only** from WebSearch
result snippets that themselves quote or paraphrase the page's stated
methodology — not from anything we directly saw rendered. Their journey map
and layout are explicitly marked not-observed rather than guessed. NHTSA's
vPIC page loaded and screenshotted cleanly but WebFetch's own text-extraction
step refused the domain ("unable to verify if domain is safe to fetch") — the
description below is read directly off the screenshot image, which is a
reliable substitute here since the page is simple and fully rendered above
the fold.

No stronger dedicated check-digit-only competitor was found beyond these five;
a first candidate, `red-headed.com/vin_check_digit.html`, was fetched in an
earlier landscape pass and found to be Ferrari-model-specific rather than a
general validator — already discarded per the task's supplied context, not
re-verified here.

## 3. Feature inventory

**FAXVIN** (the reference implementation — closest to a pure, honest check-digit tool):
- Single VIN input field with a real example VIN as placeholder text
- "Decode VIN" button (button-gated, not live)
- Output: whether the VIN is structurally correct, specifically calling out the
  9th-character check digit match/mismatch, plus length/character-set errors
- Explicit, prominent limitation statement: validates structural correctness
  only, "doesn't prove the vehicle exists or has a clean history," does not
  check ownership/title/stolen status, may false-negative on pre-1981 or
  imported JDM/European VINs (which don't follow the North American check-digit
  scheme), and warns that cloned VINs can be mathematically valid
- Full worked manual-calculation walkthrough on the page itself: transliteration
  table (letters → digits), the 17-position weight table, a step-by-step
  worked example VIN with intermediate products and final modulo, plus an
  "interesting fact" sanity-check (an all-`1`s VIN sums to 89, 89 mod 11 = 1)
- FAQ section covering common failure questions (why is my VIN showing invalid,
  does a valid check digit prove legality, why is the check digit sometimes
  "X", does this work for motorcycles/ATVs/trailers, "I imported a car from
  Japan/Europe, why is your tool saying the VIN is invalid")
- Cites its own standards: 49 CFR 565.15 and ISO 3779:2009
- Upsell padding: sidebar promo badges ("Free Detailed Specs," "120+ Data
  Points," "No VIN? Search by Plate"), a linked full VIN Decoder and paid
  Sample/History Report products, "Reviewed by [named person], Updated [date]"
  trust signal
- No copy/export button on the result itself

**NHTSA vPIC** (the standards-of-record source, not a checksum-only tool):
- Two inputs: VIN text field ("Partial VINs are also accepted") and an optional
  Model Year field (overrides the year decoded from the VIN if both given)
- "Decode VIN" button plus a separate "Canadian Vehicle Specifications" button
- Does a **full decode** (make/model/plant/etc.) via a live government API —
  not scoped to check-digit validation alone; check-digit correctness is one
  input to the full decode, not a standalone yes/no output
- Directly cites the authoritative sources for the check-digit rule: links to
  the New Manufacturer's Handbook (page 16) and CFR 49 Part 565 by name, right
  next to the input form — the domain-authority anchor for our own brief
- No FAQ, no upsell, no ads — pure government utility page, minimal chrome
- Below the form: two short informational sections (plant-of-manufacture
  guidance, "contact the manufacturer for further questions," EV tax credit
  disclaimer pointing to Treasury/IRS/DOE) then standard NHTSA site footer
- Has a public API (vPIC API) — not used interactively on this page's own UI,
  but it is the one competitor here with genuine machine-callable decode
  infrastructure

**CJ Pony Parts** (per WebSearch snippets only — page itself unreachable):
- Positioned specifically as a **Mustang-enthusiast resource**, one of several
  Mustang-specific VIN/data-plate decoder pages on the same domain
  (1965/1966/1968 Mustang VIN decoders sit alongside it)
- Described methodology matches the standard algorithm: transliterate letters
  to numbers via the standard table, multiply by the 17-position weight table,
  sum the 16 products (position 9 has weight 0), divide by 11, remainder is the
  check digit (10 → "X")
- Framed explicitly as an anti-fraud tool ("make sure your VIN is not
  falsified") rather than a general decode entry point
- Journey, output format, and layout: **not observed**, cannot be described
  beyond the methodology text above

**Edmunds** (per WebSearch snippets only — page itself unreachable):
- Editorial/how-to article format (`/how-to/...`), not a dedicated tool page —
  the URL path itself signals content-marketing rather than a utility
- Snippet confirms it explains position 9 as the DOT-defined "check" digit used
  "to detect invalid VINs, based on a mathematical formula developed by the
  Department of Transportation" — educational framing, not an interactive
  calculator
- Whether an embedded interactive widget exists on the page: **not observed**,
  cannot be confirmed or denied from search snippets alone
- High-authority auto-media brand; its business model (content funnel toward
  vehicle listings/reviews, not a report sale) differs from FAXVIN/driving-tests

**driving-tests.org**:
- Single VIN input, "Decode VIN Free" button, plus a "Try sample VIN" link that
  demonstrates the tool without the user typing their own VIN
- This is a **full decoder**, not a check-digit-only tool: outputs factory
  specs (engine, drivetrain, transmission, fuel type, GVWR), build plant and
  country, wheelbase, body style, **and open NHTSA safety recalls** pulled from
  a live feed
- Check-digit validation is bundled in as one guard inside the full decode: "the
  math has to match the other 16 characters — if it doesn't, the VIN was either
  typed wrong or tampered with" — used to catch typos/tampering, not exposed as
  its own standalone check
- Heavy educational page: VIN-location diagrams, "VIN Decoder vs VIN Check"
  comparison table, feature-comparison graphic (free decoder vs. paid full
  history report), full model-year code tables (1980–2035) and WMI
  country/manufacturer code tables, long FAQ, state DMV practice-test hub links
  (the site's real business, per its own domain name)
- Upsell: paid "Full History Report" for title brands/odometer/lien records;
  no ads observed on the tool page itself

**Core capability vs. upsell padding, across all five:** the capability every
VIN-adjacent tool converges on is *catch a mistyped or fraudulent VIN before
the user acts on it*. FAXVIN is the only one of the five that isolates this as
its **own dedicated page and its own primary deliverable** rather than folding
it into a bigger decode. NHTSA and driving-tests.org both treat check-digit
correctness as an invisible guard *inside* a full decode, not a standalone
answer. Padding is: FAXVIN's report upsells and reviewer trust-badge, NHTSA's
Canadian-spec cross-link (legitimate but adjacent), driving-tests.org's paid
report comparison table and DMV-practice-test cross-sell (its actual monetized
business, unrelated to VIN decoding itself).

## 4. Journey maps

**FAXVIN** (closest structural analogue to what we're building):
1. Arrive → title, one-line subhead ("Confirm the VIN Check Digit and Format"),
   single input field with a real example VIN shown as placeholder, directly
   above the fold
2. Type or paste a VIN → click **"Decode VIN"** — not live, gated behind a
   button click
3. Result states pass/fail on structural correctness, specifically naming the
   check-digit match/mismatch and any length/character errors
4. No visible copy/export button for the result
5. Below the tool: a long explainer (what the result means, common
   character-confusion errors, full manual-calculation walkthrough with a
   worked example, standards citations, FAQ) — the explainer is genuinely
   good pedagogy, not just padding, but it all sits below the fold after the
   single input/button/result block

**NHTSA vPIC**:
1. Arrive → government chrome (USDOT/NHTSA nav), tool title, two fields (VIN,
   optional Model Year) directly below a one-sentence description, both above
   the fold
2. Fill VIN (and optionally Model Year, which overrides the VIN-derived year)
   → click **"Decode VIN"**
3. Per the page's own text, results and the check-digit-rule citation appear on
   a subsequent results view (not captured in this pass — our screenshot shows
   only the pre-submit form state); the CFR/Handbook citation is placed
   *before* submission, at the point of the check-digit-specific claim, which
   is a good pattern regardless of what the results page itself looks like
4. Below the form (pre-submit state): two short informational sections, no FAQ
5. No ads, no upsell, no gating anywhere in this journey

**CJ Pony Parts** (not observed — methodology only):
- Per WebSearch snippet: input a VIN, the calculator applies the
  transliteration/weight/mod-11 algorithm and reports the check digit —
  step-by-step interaction, live-vs-button behavior, and result presentation
  could not be observed and are not asserted here.

**Edmunds** (not observed):
- No interaction sequence can be described; the URL and snippet indicate an
  editorial article, not a tool page, but this could not be independently
  confirmed by direct capture.

**driving-tests.org**:
1. Arrive → title, subhead ("Any VIN, Any Vehicle, Any Country"-style claim),
   single VIN input with a "Try sample VIN" link right next to the button —
   lets a user see the tool work before typing their own real VIN, above the
   fold
2. Click "Decode VIN Free" → full decode result renders (specs, drivetrain,
   plant, recalls) — the check-digit guard is invisible unless it fails
3. Below: "Where is my VIN" diagrams, decoder-vs-check comparison, a visual
   flow diagram (VIN string → categorized colored segments: WMI / vehicle
   descriptor / check digit / model year / plant / serial), full code-lookup
   tables, long FAQ, DMV practice-test cross-sell footer
4. Paid Full History Report offered as a comparison table row, not an
   interstitial or forced click

**Common shape across the three we could actually observe:** single input
field, one button (no live-typing result on any of the three), a single
readable verdict as the immediate payoff, then a long, genuinely useful
educational section pushed below the fold. None of the three observed
competitors offer a copy/export button on the verdict itself.

## 5. Layout + screenshots

- **Above the fold, all three observed:** page title, one short description
  line, a single text input, and a primary action button. No sidebar-of-options
  on any of the three — this category has essentially zero configuration
  surface (there is nothing to configure about validating one string).
- **FAXVIN** places small trust badges (Free Detailed Specs / 120+ Data
  Points / No VIN? Search by Plate) directly under the input — this is the
  upsell-adjacency to avoid; ours should have nothing competing with the
  action at that exact spot.
- **NHTSA** is the sparsest: two fields, two buttons (Decode VIN, Canadian
  Vehicle Specifications), one short citation callout to the right of the
  form — no FAQ, no cross-sell, no visual noise near the action.
- **driving-tests.org** is the most visually elaborate: a colored VIN-segment
  diagram breaking the string into WMI/descriptor/check-digit/year/plant/serial
  bands appears prominently mid-page — a strong idea for *inspect-and-drill*
  detail-on-demand, worth adapting, but it sits well below the fold on their
  page rather than being the first thing shown.
- **Output placement:** on all three observed, output renders in the same
  single column directly below the input/button, not in a separate pane.
  Two-pane layouts do not appear anywhere in this category.
- **Options density:** effectively zero across all five (including the two
  unreachable pages, per their own described methodology — a check-digit
  calculation takes no configurable parameters).
- **Mobile:** not independently verified; all captures were desktop viewport.
  Nothing in the fetched content suggests mobile-specific behavior, and the
  single-column, single-field shape should reflow trivially.

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- [docs/research/forge/vin/faxvin.webp](../../research/forge/vin/faxvin.png)
- [docs/research/forge/vin/nhtsa-vpic.webp](../../research/forge/vin/nhtsa-vpic.png)
- [docs/research/forge/vin/driving-tests-org.jpg](../../research/forge/vin/driving-tests-org.png)

CJ Pony Parts and Edmunds have **no screenshot** — both failed capture twice
(HTTP 403) and are not claimed above.

## 6. Their debt

- **FAXVIN:** button-gated for an operation (17-character checksum) that is
  computationally instant — a step tax the archetype table (§6.7.10) explicitly
  calls out for this shape of work. No copy/export of the verdict text. Sidebar
  upsell badges sit immediately adjacent to the action, a soft dark pattern
  (visual competition for attention right where the user is about to act,
  even though it's not a forced interstitial). To FAXVIN's credit: the
  disclosed limitations (doesn't prove the vehicle exists, cloned VINs can be
  mathematically valid, pre-1981/JDM/European false negatives) are the single
  most honest piece of copy found in this whole research pass — worth copying
  verbatim in spirit.
- **NHTSA vPIC:** not check-digit-only — a user who wants just a yes/no
  structural answer gets a full government decode instead, which is more than
  they asked for and requires a live upstream API call for what could be a
  pure client-side computation. No API key required and genuinely free, but no
  standalone check-digit output mode exists on this page.
- **CJ Pony Parts:** cannot assess debt directly — page unreachable in this
  research pass. The one signal available (its framing inside a
  Mustang-parts-retailer's resource section) suggests the tool exists
  primarily as content-marketing/SEO surface area for a parts e-commerce site,
  not as a general-purpose destination — but this is inference from context,
  not observation, and is flagged as such.
- **Edmunds:** cannot assess debt directly — page unreachable. If it is purely
  editorial (as the URL and snippet suggest), its "debt" relative to a tool is
  simply that it isn't one — a user has to read an article rather than paste a
  VIN, which is the content-marketing-funnel pattern §6.7.10 already names as
  a pattern to differentiate against.
- **driving-tests.org:** the actual business (state DMV practice tests) is
  only tangentially related to VIN decoding — the tool functions as top-of-
  funnel SEO bait for an unrelated product, a real but non-adversarial form of
  debt (no ads or dark patterns observed on the tool page itself, but the site's
  incentive to keep users engaged with unrelated content is structurally
  present in its footer cross-sell).
- **None of the five expose a check-digit-specific API/OpenAPI/MCP contract.**
  NHTSA's vPIC does have a broader decode API, but not a dedicated
  "is-this-check-digit-valid" endpoint separate from a full decode — this is
  exactly the narrow, composable primitive Forge's dual-surface design exists
  to expose (§6.5).

## 7. Domain know-how

**Primary source verified (2026-07-28):** the transliteration table, weight
table, check-digit position, and the "X means 10" rule below were checked
directly against **49 CFR §565.15**, not just against FAXVIN's or CJ Pony
Parts' reproductions of it. Direct HTML access to eCFR (`ecfr.gov/current/...`)
is blocked in this research environment (redirects to a bot-check page at
`unblock.federalregister.gov` that never resolves to content), so the primary
text was retrieved instead via eCFR's own public Versioner API
(`https://www.ecfr.gov/api/versioner/v1/full/2024-01-01/title-49.xml?part=565`),
which serves the same official, current regulatory XML eCFR publishes — this
is the eCFR system itself, not a mirror or a secondary summary. That fetch
returned, and this brief now cites directly:

- **§565.15(c)**: "The third section shall consist of one character, which
  occupies position nine (9) in the VIN. This section shall be the check
  digit whose purpose is to provide a means for verifying the accuracy of any
  VIN transcription."
- **§565.15(c)(1)–(3)**: "Assign to each number in the VIN its actual
  mathematical value and assign to each letter the value specified for it in
  Table III... Multiply the assigned value for each character in the VIN by
  the position weight factor... Add the resulting products and divide the
  total by 11." — confirming the mod-11 formula independently of FAXVIN.
- **Table III** (letter values): A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, J=1,
  K=2, L=3, M=4, N=5, P=7, R=9, S=2, T=3, U=4, V=5, W=6, X=7, Y=8, Z=9 —
  **matches FAXVIN's reproduction exactly**, including the non-sequential
  jump after H (J restarts at 1, skips the reused-letter gaps at I/O/Q, and
  R jumps to 9 rather than continuing from P=7).
- **Table IV** (weight factors): positions 1–8 weight 8,7,6,5,4,3,2,10;
  position 9 (the check digit itself) carries no weight/is excluded from the
  sum; positions 10–17 weight 9,8,7,6,5,4,3,2 — **matches FAXVIN's `8 7 6 5 4
  3 2 10 0 9 8 7 6 5 4 3 2` table exactly**, confirming position 10's
  unusual weight-10 in the primary text itself, not just a secondary
  reproduction of it.
- **Table V** (remainder → check digit): remainders 0–9 map to digits 0–9;
  the fractional remainder equivalent to 10/11 maps to the letter **"X"** —
  confirming FAXVIN's and the brief's own §7.4 claim directly against the
  regulation.

This closes the open question this brief previously carried (§ "Gaps / open
questions," below) about cross-checking FAXVIN's table against 49 CFR
565.15 itself rather than trusting a competitor's reproduction of it. The
values were unchanged by verification — no correction to §7.2–§7.4 below was
required — but the citation is now to the primary regulatory text, retrieved
directly, not inferred from a competitor page.

The non-obvious rules a naive "sum some numbers and check position 9"
implementation gets wrong, cross-referenced from FAXVIN's own published
worked example, NHTSA's cited CFR source, and the CJ Pony Parts snippet's
independently-matching description of the same algorithm (and now confirmed
directly against 49 CFR §565.15 itself, per the note above):

1. **The check digit only applies to North American (17-character, post-1981)
   VINs under 49 CFR 565.15 / ISO 3779.** Vehicles manufactured before 1981,
   and many non-North-American markets (JDM, some European manufacturers),
   either don't use 17-character VINs or don't follow this specific
   check-digit scheme — a validator that reports these as flatly "invalid"
   without this caveat produces a confident false negative. FAXVIN's own FAQ
   names this explicitly ("I imported a car from Japan/Europe, why is your
   tool saying the VIN is invalid?").
2. **The transliteration table is not a simple A=1, B=2 alphabet map.** Letters
   `I`, `O`, and `Q` are excluded entirely from valid VIN characters (too easily
   confused with `1`, `0`, `1` respectively) — they must never appear in a VIN
   at all, not just be handled specially in the checksum. The remaining letters
   map to values that **repeat after 9**: after `H`→8, the sequence continues
   `J`→1, `K`→2, `L`→3 … `P`→7, then skips `Q`, `R`→9, skips `S`? — the exact
   mapping is non-sequential and must be taken from the standard table (as
   FAXVIN's own reproduction shows: A-H map 1-8, then J-N map 1-5, P maps 7,
   R maps 9, S-Z map 2-9) — reimplementing this "from memory" as a straight
   alphabet-position mapping is the single most likely naive-implementation bug.
3. **The weight table is positional and fixed, and position 9 (the check digit
   itself) carries weight 0** — it does not contribute to its own calculation.
   The 17 weights are `8 7 6 5 4 3 2 10 0 9 8 7 6 5 4 3 2` for positions 1–17.
   Position 10 is deliberately given the unusual weight `10` rather than
   continuing the simple descending pattern (7,6,5... then 10, not 1) — an
   implementer pattern-matching "just count down from 8" will get position 10
   wrong.
4. **The formula is `remainder = (sum of value×weight over all 17 positions) mod 11`**,
   and the valid outcomes are the digits `0`–`9` **or the letter `X`** if the
   remainder is exactly `10`. A validator that treats "check digit is X" as an
   error rather than a valid tenth-remainder case is wrong — FAXVIN's FAQ
   explicitly answers "why is my check digit the letter X" as its own question,
   confirming this is a common point of confusion for end users, not just
   implementers.
5. **A mathematically valid check digit does not mean the VIN is real,
   unassigned-collision-free, or free of fraud.** FAXVIN states this directly:
   "scammers can use cloned VINs that are mathematically valid" — a cloned VIN
   copies a real, valid VIN from another vehicle, so the checksum passes
   trivially. Our tool must not imply "valid checksum" means "safe to buy" —
   that claim requires the vehicle-history-report category this tool
   deliberately is not.
6. **Confusable-character normalization is a real, named failure mode**, not a
   hypothetical: FAXVIN calls out `0`/`O`, `1`/`I`/`L`, and `8`/`B` confusion
   as the most common source of a failing validation on an otherwise-correct
   VIN. A good tool should detect and flag "this character is not a valid VIN
   character, but visually resembles one that is" rather than a bare
   "invalid character" message.
7. **Partial VINs are a legitimate, different use case**, not an error to
   reject outright — NHTSA's own tool explicitly supports partial-VIN
   decoding (used when only a VDS/WMI is known, e.g. for pre-production
   research). A pure check-digit validator is different from this — it
   structurally requires exactly 17 characters to compute a position-9
   checksum — but the tool should say "check-digit validation requires the
   full 17-character VIN" rather than a generic "invalid" for a
   shorter-than-17 input, so a user with a partial VIN isn't misled into
   thinking their full VIN is wrong.
8. **VIN length and character-set validation must happen before checksum
   computation, and must be reported as a distinct failure reason.** A VIN
   that is the wrong length, or contains `I`/`O`/`Q`, cannot have its check
   digit meaningfully evaluated at all — collapsing "wrong length" and "check
   digit mismatch" into one generic "invalid VIN" message (which several
   simpler tools do implicitly) hides which of two very different problems
   the user actually has.

## 8. Chosen archetype

**Drop-and-verdict** (§6.7.10) — one input in, one clear answer, detail on
demand.

Why the others are wrong here:
- **Instant transform** — close in spirit (no run button, trivial compute),
  but the output is not "text transformed into other text" — it is a
  pass/fail verdict plus a structured explanation, not a live-editable
  transformed string. The archetype table lists checksum-shaped work under
  drop-and-verdict's sibling category (checksum/EXIF), not instant transform.
- **Configure-then-generate** — there is nothing to configure. All five
  competitors converge on zero options; a configure step would invent a knob
  (e.g., "which standard?") nobody asked for, since 49 CFR 565.15/ISO 3779 is
  the only scheme relevant to a 17-character VIN.
- **Decision wizard** — the user already has a specific 17-character string
  and a specific yes/no question ("is this valid?"); there is no multi-step
  narrowing question to ask them.
- **Two-pane compare** — there is one artifact (one VIN), not two things to
  diff against each other.
- **Inspect-and-drill** — the closest runner-up. driving-tests.org's
  colored-segment diagram (WMI / VDS / check digit / model year / plant /
  serial) is genuinely a structure worth exploring, and our "detail on demand"
  breakdown (transliteration value, weight, product, running sum per position)
  is exactly that kind of drill-down. But the *primary* payoff a user comes for
  is the single verdict — valid or not, and why — with the position-by-position
  math as expandable detail, not the main event. That is precisely
  drop-and-verdict's "one clear answer, detail on demand," not a browsing
  experience where exploring the structure is the point.
- **Batch queue** — single-VIN validation is the core job (checking one VIN
  before a specific purchase/paperwork action); batch VIN validation (e.g., a
  fleet-manager CSV of VINs) is a plausible future extension via the existing
  `/api/v1/jobs` surface per §6.7.9's Processor-root guidance, not the primary
  archetype for this tool.

## 9. Our design

### 9.1 Journey

1. Arrive at `/t/vin` — single text input above the fold, styled to expect
   exactly 17 characters, one-line description ("Validate a VIN's structure
   and check digit — instantly, entirely in your browser, no VIN is sent
   anywhere"), stating the client-side/privacy claim at the point of action
   (matching driving-tests.org's own privacy-first framing, ahead of
   FAXVIN's upsell badges in that same visual slot).
2. User types or pastes a VIN — **no separate "Validate" button.** Validation
   runs on every keystroke once 17 characters are present (debounced/live);
   a partial input (<17 characters) shows a neutral "keep typing" state, not
   an error, per know-how §7.7.
3. On 17 characters, result renders immediately as a structured verdict, not
   prose:
   - **Verdict line**: `Valid` / `Invalid — <specific reason>`, one of exactly
     four reasons per know-how §7.8: `wrong length`, `invalid character at
     position N` (with a confusable-character hint per §7.6, e.g. "did you
     mean `0` instead of `O`?"), `check digit mismatch (expected X, found Y)`,
     or the pre-1981/non-North-American caveat surfaced as a soft notice
     rather than a hard fail when the input is otherwise well-formed but the
     scheme may not apply (§7.1).
   - **Persistent honesty line**, shown on every `Valid` result, not hidden in
     an FAQ: "A valid check digit confirms the VIN is correctly formed — it
     does not confirm the vehicle exists, is unmodified, or has a clean
     history." (§7.5, the FAXVIN pattern made structural.)
   - **Segment breakdown row** (always visible, not gated): WMI (positions
     1–3), VDS (4–8), check digit (9, highlighted), model year code (10),
     plant code (11), serial (12–17) — visually adapted from
     driving-tests.org's colored-segment diagram, but shown by default since
     it costs nothing to compute and orients the user immediately.
   - **"Show the math" disclosure**, collapsed by default: the full
     position-by-position table (character → transliterated value → weight →
     product), the summed total, and the mod-11 remainder — this is FAXVIN's
     worked-example pattern, generalized to the user's own actual VIN instead
     of a fixed example, expandable for the "I don't trust it, show your work"
     user without competing with the verdict for attention.
4. **Copy button** on the verdict line (plain text, pasteable into a
   ticket/note) and on the full math breakdown — closes the gap all three
   observed competitors leave open.
5. Error states: fewer than 17 characters is a neutral in-progress state
   (never a red error); more than 17 characters truncates the visual input
   guide but still validates and reports "wrong length" once a value is
   submitted/blurred; lowercase input is silently uppercased before
   validation (VINs are case-insensitive by convention, and every competitor
   observed accepts mixed case).
6. Clearing the field or pasting a new VIN replaces the result in place — no
   manual reset button needed, matching the file-type-detect precedent.

### 9.2 Layout

- Single column, no sidebar-of-options — none of the five competitors have
  one either, and there is nothing to configure. Forge's standard catalog
  sidebar/nav (station-level chrome) stays.
- Input field above the fold, full width within the content column, styled
  with a 17-character visual guide (e.g., grouped character boxes) so a user
  can see at a glance how many characters remain.
- Result renders directly below the input in the same column — verdict line
  first, persistent honesty line directly under it, segment breakdown next,
  math disclosure last and collapsed by default.
- No ads, no report-upsell, no newsletter capture, no reviewer trust-badge
  sidebar — matches the station-level §6.7.10 commercial rule and is the
  direct rejection of FAXVIN's and driving-tests.org's monetization pattern.
- Below the runner (SEO-value, not workflow-value): a compact, non-gated
  explainer of the algorithm (transliteration table, weight table, the
  formula) — FAXVIN's pedagogy is genuinely good and worth matching for
  organic reach, but it must never sit between the input and the result.

### 9.3 Must-have

**Must-have features** (without which a user bounces back to FAXVIN/NHTSA/driving-tests.org):
- Live, no-button result the moment 17 characters are present (parity +
  improvement over FAXVIN's and NHTSA's explicit click)
- The persistent "valid checksum ≠ clean vehicle" honesty line on every valid
  result (this is the single feature that makes us as trustworthy as FAXVIN
  rather than a shallower copy of it)
- Four-reason structured failure taxonomy, not a collapsed generic "invalid"
  (closes a gap none of the five demonstrably close)
- Copy button on the verdict and the math breakdown
- Client-side-only processing, honored in fact and stated at the point of
  input, not buried in an FAQ

### 9.4 Deliberately skipped

- Full vehicle decode (make/model/engine/plant/recalls) — that is NHTSA
  vPIC's and driving-tests.org's job, and almost certainly a separate future
  Forge tool (`vin-decode`) if pursued; bundling it here would blur
  Verifier's identity against a Decoder/Inspector-shaped tool and reintroduce
  a live upstream API dependency this tool specifically avoids.
- Vehicle-history / title-brand / odometer / lien data — structurally a paid
  report category (FAXVIN's, driving-tests.org's own upsell), and exactly the
  commercial pattern §6.7.10 says never to import.
- A "Validate" button — see archetype and know-how §7.6/§7.7 justification;
  keeping one would copy FAXVIN's and NHTSA's one piece of avoidable friction
  rather than their journey's substance.
- Model-year/WMI country lookup tables as an interactive feature (shown by
  driving-tests.org) — valuable as static reference content below the fold,
  but not part of the live verdict; a separate `vin-decode` tool's job if it
  is ever built, not this Verifier's.
- Batch VIN validation as a bespoke UI — deferred to the existing
  `/api/v1/jobs` surface per §6.7.9's Processor guidance, consistent with the
  file-type-detect brief's precedent.

### 9.5 Differentiator

- **Agent contract.** None of the five competitors expose check-digit
  validation as its own API/OpenAPI/MCP-callable primitive — NHTSA's vPIC API
  bundles it invisibly inside a full government decode call, and the other
  four have no programmatic surface at all for this specific check. A CI
  pipeline validating VINs on intake, or an agent workflow deciding whether to
  proceed to a paid decode, gets a dedicated, fast, no-network-call primitive
  through `/api/v1/jobs` + MCP with one schema.
- **Instant, no-button result** where FAXVIN, NHTSA, and (per snippet) CJ Pony
  Parts all gate behind a click for a sub-millisecond client-side computation
  — this is the archetype-table's own named anti-pattern for trivial compute.
- **Honest, structured failure reasons**, not a single collapsed "invalid VIN"
  message: distinguishes length error, invalid character (with confusable-char
  hint), pre-1981/non-North-American scheme caveat, and genuine check-digit
  mismatch as four distinct, clearly-labeled outcomes — closing the gap
  §7.8 identifies as a common shortcut.
- **FAXVIN's honesty pattern, made structurally explicit rather than prose-only:**
  the "valid checksum ≠ real/clean vehicle" caveat is shown as a persistent,
  always-visible line next to every "valid" result (not just in an FAQ a user
  may not scroll to), and we never bundle or upsell a paid history report —
  the entire commercial-clutter axis FAXVIN and driving-tests.org both carry.
- **No live upstream dependency.** Unlike NHTSA vPIC and driving-tests.org
  (both call a live decode API), check-digit validation is pure arithmetic —
  fully client-side, zero network round-trip, zero data leaves the browser.
- **Copyable, structured output** (pass/fail, decoded check digit, distinct
  failure reason) — none of the three observed competitors offer a copy
  button on the verdict.

*summary*

A live, no-button, fully client-side check-digit verdict with a four-reason
structured failure taxonomy and a persistent, always-visible "valid checksum
does not mean clean vehicle" honesty line — delivered through the same
OpenAPI/MCP contract as every other Forge blade, which none of the five
researched competitors offer as a dedicated, agent-callable primitive.

### 9.6 I/O contract

**I/O contract sketch** (for the `/api/v1/jobs` + MCP surface):
- **Input:** `{ vin: string }` — no options object; per §5/§6, this category
  has zero real configuration surface. VIN is trimmed and uppercased
  server/client-side before validation.
- **Output:** `{ valid: boolean, reason: "ok" | "wrong-length" |
  "invalid-character" | "check-digit-mismatch" | "pre-1981-or-non-na-scheme",
  invalidCharacterPosition?: number, confusableHint?: string,
  expectedCheckDigit?: string, foundCheckDigit?: string, segments: { wmi,
  vds, checkDigit, modelYearCode, plantCode, serial }, math: { positions:
  Array<{ position, char, value, weight, product }>, sum, remainder } }` —
  a fully structured object so an agent caller gets the same four-reason
  taxonomy a human sees, and can branch on `reason` directly without parsing
  prose.

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

- [ ] CJ Pony Parts and Edmunds could not be directly reached in this pass
      (HTTP 403 on both WebFetch and screenshot, twice each). If either
      matters more than currently believed, retry with a different fetch path
      (e.g. an authenticated/interactive browser session) before finalizing
      implementation — do not treat the WebSearch-snippet-only description
      above as equivalent to a direct observation.
- [ ] NHTSA vPIC's post-submit results view (after clicking "Decode VIN") was
      not captured — only the pre-submit form state is confirmed. Its
      check-digit-specific citation placement (pre-submit, next to the form)
      is confirmed; how it's surfaced in results is not.
- [x] **Resolved 2026-07-28.** Confirmed the exact transliteration table,
      weight table, check-digit position, and mod-11/"X" rule directly
      against 49 CFR §565.15 itself, via eCFR's public Versioner API (direct
      HTML access to eCFR is bot-walled in this environment; the Versioner
      API serves the same official current text). All values matched
      FAXVIN's reproduction exactly — see the "Primary source verified"
      note at the top of §7 above for the exact citations and quoted text.
      No table values changed as a result.
- [ ] Decide whether the pre-1981/non-North-American soft-notice (§7.1) should
      be a heuristic (e.g., detect known non-17-char or known-incompatible WMI
      prefixes) or simply a static caveat shown whenever a VIN fails the
      checksum — a heuristic risks false confidence; the static caveat is
      safer and matches FAXVIN's own approach, but this is a product decision
      not yet made.
- [ ] Declare the side-effect class and meter id (§10 gates 5–6) — neither is
      stated anywhere in this brief, and neither is inferable from the design.
- [ ] Write the privacy note and the stable error-code set (§10 gates 7–8).
      A VIN is a vehicle identifier that users may treat as personal data, so
      "what leaves the browser, and what is retained" needs an explicit answer
      rather than an implied one.
