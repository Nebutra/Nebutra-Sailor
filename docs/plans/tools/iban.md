# Tool brief: iban (IBAN Validator)

Root: **Verifier (42)** — thin root, 4/5 tools today (id-card, credit-card-luhn,
hmac-verify, email-validate). Object: Finance/Text. Side effect: `pure`. Per
§6.7.9, Verifier "answers provably, not plausibly" — this fits: IBAN validity
is a deterministic ISO 13616 / MOD-97-10 checksum plus a fixed per-country
structure, not a heuristic guess.

## 1. Demand

- **JTBD:** "I have an IBAN a customer/vendor gave me — is it well-formed
  before I key it into a wire transfer, an invoice, or a SEPA mandate?" Also:
  "what country/bank does this IBAN belong to, and is the length right for
  that country?"
- **Keywords:** IBAN checker, IBAN validator online, validate IBAN, IBAN
  calculator, check IBAN number, IBAN 校验器 (secondary — this is a Western-
  European-market keyword primarily, not a zh-Hans-dense one).
- **Pain:** typos in long alphanumeric strings (IBANs run 15–34 characters);
  confusing print-formatted (spaced) vs digital (unspaced) IBAN forms; not
  knowing which country's IBAN structure rules apply; conflating "checksum
  passes" with "this account actually exists" (it never proves the second
  thing — every competitor below has to manage that expectation).

## 2. Competitors (named, reached, captured)

Verified by direct visit unless noted. `iban.com` was reached via WebFetch
(text extraction succeeded, describing tool copy) but **screenshot capture
failed twice** (headless render returned a fully blank white page both times,
default and `--wait 8000 --viewport 1440x1200`, with an empty page `<title>`)
— consistent with a bot-detection/JS-challenge wall. Its layout below is
described only from the WebFetch text summary and is marked accordingly;
no visual claim is made from a screenshot we do not have.

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| IBAN.com (IBAN Checker) | https://www.iban.com/iban-checker | Partial — text only, WebFetch succeeded, **screenshot capture failed twice (blank render)** | Not captured — see note above |
| Wise IBAN Checker | https://wise.com/gb/iban/checker | Yes | [wise.png](../../research/forge/iban/wise.png) |
| 8gwifi.org IBAN Validator | https://8gwifi.org/iban-validator.jsp | Yes | [8gwifi.png](../../research/forge/iban/8gwifi.png) |
| ibancalculator.com | https://www.ibancalculator.com/iban_validieren.html | Partial — consent/paywall interstitial covers the tool; underlying form partly visible through the modal | [ibancalculator.png](../../research/forge/iban/ibancalculator.png) |
| SwiftRef IBAN Validation | https://www.swiftref.com/en/ibanvalidation | Yes | [swiftref.png](../../research/forge/iban/swiftref.png) |

## 3. Feature inventory

**IBAN.com** (owns the generic `iban.com` domain; *inferred* to be the
category's default destination on that basis — **no traffic or rank
measurement was performed in this pass**, so treat "leader" as an unverified
inference, not a finding; see §11):
- Per its own tool copy (WebFetch text, not screenshot-verified): checksum
  validation (MOD-97-10), country support/length verification for **116
  countries**, BBAN structural validation for **48 countries**, and **BIC
  lookup** ("identify the Bank Identifier Code for the respective bank and
  branch"). Upsell: a prominent Wise-affiliate promotion for international
  transfers sits directly on the results flow — an ad-like partner push, not
  a neutral utility, even though the checker itself appears free. Broader
  paid "IBAN SUITE" API product is referenced in the earlier landscape survey
  but not independently re-confirmed here.
- Core strength = breadth (most countries, most structural depth) + brand
  recognition. Upsell padding = the Wise referral placement inside the result
  flow.

**Wise IBAN Checker** (screenshot-verified, full page):
- Single IBAN input field, one **"Check IBAN"** button (not live) — this is
  a *button-gated* checker, not instant-transform, contrary to what a "high-
  authority fintech, live-feeling" assumption might suggest.
- Above the fold: a labeled example-IBAN breakdown card (Country code / Check
  digits / Bank code / Sort code / Bank account number) shown **before** any
  input — this is a strong "teach the shape before you ask for input" pattern.
  We could not observe the actual submitted-result panel in the static
  capture (no IBAN was submitted), so we do not claim what the post-submit
  result layout looks like — the landscape-survey claim of "adds bank/branch/
  address lookup" is Wise's own marketing copy in the page body ("we'll tell
  you if it's the right format... show you what each part represents") but
  the screenshot itself does not show a bank-name/address result card, so
  that specific claim is unverified from our direct evidence and should be
  treated as plausible, not confirmed.
- The bulk of the page (below the fold) is educational content: "When do you
  need an IBAN," "What happens if you enter the wrong number," "Common
  mistakes" (typos, incorrect formats, recipient details), and a hard
  disclaimer that a correct checksum is **not** proof the account exists —
  this expectation-management content is the single most reusable insight
  from any competitor here.
- Heavy brand upsell at the bottom ("A cheaper, faster way to send money
  abroad" CTA banner) — outside the immediate tool workflow, but present on
  the same page/scroll.

**8gwifi.org IBAN Validator & Generator** (screenshot-verified, full page):
- Two-input-field layout: "IBAN Number (to validate)" text field **and** a
  "Generate Test IBAN (Country)" dropdown covering 50+ countries with the
  required length shown inline (e.g. "United Kingdom (GB) — 22"). Four
  one-click sample buttons (UK / Germany / France / Italy Sample).
- Three explicit buttons: **Generate Test IBAN**, **Validate IBAN**, **Clear**
  — not live, button-gated.
- Two result panels side by side: "Validation Result" and "IBAN Information"
  (parsed country code / check digits / BBAN once valid).
- Explicit privacy claim, twice: "Validation runs entirely in your browser;
  IBANs are not stored on our servers" and a footer "Trust & Privacy" line
  repeating client-side-only. Generated test IBANs are explicitly labeled
  "for testing only... should not be used for real payments."
- Below the tool: a genuinely useful **reference table** — IBAN length by
  country (15 to 34 characters), the MOD-97-10 check-digit algorithm spelled
  out step by step, and validation rules as a checklist.
- **Debt, directly in the workflow:** a full-width third-party ad modal
  (an Infineon "AURIX for Smarter Vehicles" interstitial) renders directly
  over the Validation Result / IBAN Information panels in our capture —
  ad content sitting on top of the actual output the user came for. Below
  that: a "Support This Free Tool" donation/monetization block (Buy me a
  coffee, a $9 book bundle, follow-on-X).
- Core strength = paired validator+generator with an honest client-side
  privacy claim and a genuinely didactic reference section. Debt = the
  interstitial ad directly obscuring the result.

**ibancalculator.com** (screenshot-verified, but obstructed):
- A full-page **consent/paywall modal** ("Continue with ads..." vs "...or
  with contentpass," €3.99/month to remove ads/tracking across 500+ sites)
  covers the entire tool on first load — this is the loudest dark-pattern
  moment across all five competitors: the user cannot even see the input
  field without first making a monetization choice.
- Behind the modal (partially visible + confirmed by WebFetch text): a single
  "IBAN:" input field and a **"validate IBAN, look up BIC"** button — BIC
  lookup is bundled into the primary CTA copy itself, not a separate step.
  Per WebFetch: "For some countries, we check not just the IBAN checksum, but
  also the validity of the bank code and account numbers" — i.e. deeper than
  checksum-only for some countries, a real differentiator if true.
- A premium upsell section separately targets corporate users: bulk CSV
  processing, a REST API, SSL, and a free-trial "welcome bonus points"
  mechanic — a real API product exists here (paid), which none of Wise or
  8gwifi expose.
- Core strength = country-specific bank/account-number validation beyond
  bare checksum, plus a genuine (if paid) API. Debt = the ad/paywall gate
  sitting in front of the tool itself, and multi-language chrome (DE/EN/ES/
  IT/NL/PL/中文) suggesting a EU-market-first audience with a Chinese option
  bolted on.

**SwiftRef IBAN Validation** (screenshot-verified, full page):
- Single "IBAN" input + a plain **"Validate"** button — button-gated, no
  live update, minimal chrome.
- The page's actual visual centerpiece is **not** the tool but a large
  interactive-looking **world map** shaded by "Countries where IBAN is
  mandatory (64%) / not mandatory (36%)" with a donut-chart legend — an
  authority/reference display, not a validation aid. This screenshot shows
  the map with no post-submit result state (we did not submit an IBAN), so
  we make no claim about what a result looks like.
- Framing leans hard on authority: "As Swift is the ISO Registry for IBAN
  (and BIC) formats, the data is provided directly from the source" — this
  is the one competitor whose validation data can credibly claim to be
  the ISO-registry source of truth rather than a third-party reimplementation.
  (Separately, an earlier WebFetch pass on this same URL returned a "you have
  exceeded the limit of free searches... purchase a subscription" paywall
  message instead of the form — this may be a rate-limited or randomized
  server response, a stale cache, or content that varies by session; we
  report both observations rather than pick one, since we cannot reconcile
  them from a single visit.)
- Core strength = authoritative-source claim (SWIFT operates the ISO 13616
  registry). Debt/uncertainty = inconsistent access across visits (paywall
  vs free form), thin visible feature set (no visible BIC/bank-name output
  in the state we captured), and a page that spends more visual weight on a
  marketing map than the tool itself.

## 4. Journey maps

**IBAN.com** (from text only, not screenshot-verified): land on page → type
or paste IBAN → (submission mechanism unconfirmed — button vs live not
established from WebFetch text alone) → checksum + country + BIC/bank result
+ a Wise-affiliate promotion appears in or near the result area.

**Wise:** land on page → see the example-IBAN breakdown card *before* typing
anything (teaches the format up front) → type IBAN into the single field →
press "Check IBAN" → (result state not captured — no submission was made in
our static pass) → scroll past extensive "why this matters / common mistakes"
educational content → hit a large brand CTA banner at the very bottom.

**8gwifi.org:** land on page → two clear paths side by side: paste an IBAN to
validate, or pick a country + click "Generate Test IBAN" to get a synthetic
one first → click "Validate IBAN" → two result cards populate (Validation
Result, IBAN Information) → **an ad interstitial can appear directly over
the result region** → user scrolls to a lengthy reference/education section
below.

**ibancalculator.com:** land on page → **blocked immediately by a consent/
paywall modal** → dismiss it (accept ads, or subscribe) → single "IBAN:"
field visible → click "validate IBAN, look up BIC" → result state not
observed (modal still open in our capture) → premium CSV/API upsell section
sits elsewhere on the page for business users.

**SwiftRef:** land on page → single "IBAN" field + "Validate" button visible
immediately, no modal → (result state not observed — no submission made) →
below the tool, a large decorative world map of IBAN-mandatory countries
dominates the page, functioning as authority marketing more than a working
aid.

## 5. Layout + screenshots

- **Wise:** input card is centered, narrow, and sits inside a colored hero
  band — very "instant-use" *looking* even though it is button-gated. The
  example-breakdown card directly beneath the hero is the standout above-
  the-fold element; heavy scroll-length educational content follows.
- **8gwifi.org:** classic dense dev-tool layout — two-column input row at
  top, three stacked action buttons immediately below, two side-by-side
  result panels directly under that (all above or near the fold on a tall
  viewport), then a long single-column reference article. A right-hand
  sidebar of unrelated tool links (Discover more / Quick Access) competes
  for attention the whole way down. Mobile behavior not verifiable from a
  desktop-viewport capture.
- **ibancalculator.com:** normally a compact top-of-page tool (title, single
  field, single button, per the DOM visible behind the modal) — but the
  modal being the *first* thing rendered means the effective "above the
  fold" experience for a first-time visitor is a monetization choice, not
  the tool.
- **SwiftRef:** two-column above the fold — form on the left (roughly a
  third of the width), two promotional cards on the right ("Want to know
  more about SwiftRef," "What is an IBAN number?"); the map is a full-width
  section below, clearly the largest single visual element on the page.
- **IBAN.com:** not independently verifiable from either channel we had —
  no layout claim is made.
- Mobile: not verifiable for any of the five from static desktop-viewport
  captures; not claimed.

## 6. Their debt

- **8gwifi.org** — third-party ad interstitial renders directly over the
  result panels, i.e. inside the workflow, not beside it. Heavy monetization
  chrome (donation asks, book-bundle upsell) crowds the page below the tool.
- **ibancalculator.com** — the loudest dark pattern here: a full-page
  ad-vs-paid-subscription consent wall gates the tool itself before a user
  can even see the input field. A genuine paid API exists but is bundled
  behind the same friction.
- **SwiftRef** — inconsistent access (paywall message on one visit, free
  form on another) makes it an unreliable dependency for a human, let alone
  a documented behavior an agent could rely on; no visible self-serve API
  despite being the authoritative data source.
- **Wise** — button-gated rather than live for a computation this cheap;
  all value-add (bank/branch detail) is asserted in marketing copy, not
  demonstrated in the static page, so its actual result depth is uncertain
  from outside a real submission.
- **None of the five expose an OpenAPI/MCP/agent-callable contract** on the
  free tier — ibancalculator.com's API is a separate paid business product,
  not something an agent could discover or call without a subscription.
  This is exactly the gap §6.7.5 requires Forge to close.

## 7. Domain know-how

**Primary source verified (2026-07-28):** the general IBAN structure and the
MOD-97-10 check-digit procedure below were checked directly against
**ISO 13616-1:2020(E), "Financial services — International bank account
number (IBAN) — Part 1: Structure of the IBAN"** — not just against
iban.com's or 8gwifi.org's reproductions of it. `iso13616.org` (the registry
site named in the standard's own Clause 7 as where national formats are
registered) and `swift.com` (which mirrors/hosts the registry PDF) both
timed out on every fetch and screenshot attempt in this research
environment and could not be reached at all — this is recorded as an
infrastructure-level failure, not a decision to skip them. What *was*
reachable is the ISO document itself: a preview copy of **ISO 13616-1:2020**
served by `standards.iteh.ai` (an authorized ISO standards reseller) returned
the standard's normative front matter — Scope, Terms and Definitions,
Conventions, **Clause 5 (Structure)**, and **Clause 6 (Check digits, in
full: 6.1 General, 6.2 Checking the check digits, 6.3 Generating the check
digits)** — verbatim, which is the primary text this brief needed. Quoted
directly from that source:

- **Clause 5 (Structure)**: "The format of the IBAN shall be: `2!a2!n30c`"
  — two letters (country code, ISO 3166-1 alpha-2), two digits (check
  digits), then up to 30 alphanumeric characters (the BBAN) — confirming the
  IBAN's own top-level shape independent of any competitor's description.
  Clause 5(d) further specifies the BBAN "shall... have one fixed length per
  country" and "include within it a bank identifier with a fixed position
  and length per country" **for the corresponding IBAN format to qualify for
  inclusion in the ISO IBAN registry** — i.e. the standard itself confirms
  that per-country length/structure is a *separate registered dataset*, not
  something derivable from the standard's own text. This directly justifies
  the scope decision below.
- **Clause 6.2 (Checking the check digits)**, quoted in full: "6.2.1 If the
  IBAN is in paper format..., delete all blank spaces. 6.2.2 Move the first
  four characters to the right-hand end of the IBAN. 6.2.3 Convert upper-
  and lower-case letters to digits in accordance with the following: A=10,
  B=11, C=12 ... Z=35 [full A–Z table, sequential from 10]. 6.2.4 Apply the
  check character system MOD 97-10 (see ISO/IEC 7064). 6.2.5 If the
  remainder is 1 (one), the number is valid." — this confirms, from the
  primary standard itself, exactly the procedure item 1 below describes
  (rearrange, transliterate, mod-97, check for remainder 1), independent of
  any competitor's reproduction.
- **Clause 6.3 (Generating the check digits)**: "6.3.1 Add the country code
  (2!a) and '00' to the right-hand end of the BBAN. 6.3.2 Convert letters...
  in accordance with 6.2.3. 6.3.3 Apply the check character system MOD
  97-10... NOTE From this, the check digits can only be in the range
  [02..98]." — confirming item 2 below's generation procedure and the valid
  output range directly from the standard (the standard states the range as
  `[02..98]` rather than spelling out the "remainder 0 → check digits 97"
  edge case in prose, but the range confirms 00/01 are excluded outcomes,
  consistent with the 98-minus-remainder derivation).

1. **The checksum algorithm is MOD-97-10 per ISO/IEC 7064, applied to a
   rearranged string — not applied to the IBAN as typed.** The correct
   procedure, per ISO 13616-1:2020 Clause 6.2 quoted above: move the first
   four characters (country code + 2 check digits) to the *end* of the
   string, convert every letter to its numeric value (A=10, B=11, ..., Z=35),
   then compute the numeric string mod 97; a valid IBAN gives remainder 1.
   Applying mod-97 directly to the original character order, or forgetting
   the letter→number conversion, is the single most common naive-
   implementation bug (this matches both 8gwifi.org's reference section and,
   now directly, the primary ISO text).
2. **The check digits themselves are separately generated, not just
   checked**, per ISO 13616-1:2020 Clause 6.3 quoted above: append the
   country code and "00" to the BBAN, transliterate, compute mod-97, then
   check digits = 98 − remainder, zero-padded to 2 digits (the standard's own
   note confirms the valid output range is `[02..98]`, i.e. never `00` or
   `01`). A remainder of 0 must map to check digits "97" — an off-by-one a
   naive generator will get wrong.
3. **IBAN length is fixed *per country*, not a single global length, and
   this per-country dataset is a separate registered artifact from the
   standard itself.** ISO 13616-1:2020 Clause 5(d) (quoted above) states the
   BBAN "shall have one fixed length per country" as a *registration
   requirement*, but the standard's own Clause 7 ("Registration of IBAN
   formats") defers the actual per-country lengths/structures to the ISO
   IBAN registry (maintained via SWIFT/`iso13616.org`), not to the structure
   document itself. **That registry could not be reached in this research
   pass** — `iso13616.org` and `swift.com` (including the SWIFT-hosted
   registry PDF) both timed out on every attempt — so the specific per-
   country lengths and BBAN masks below remain sourced from 8gwifi.org's
   published reference table (a secondary, non-primary source), consistent
   with the existing competitor research in §2 rather than newly verified
   here. See the scope decision at the end of this section.
   Lengths range from 15 (Norway) to 32 (Saint Lucia), per the reference
   table 8gwifi.org publishes (matching the IBAN Registry). Checksum can
   pass on a string of the wrong length for its claimed country only if you
   fail to check the length first — length + BBAN structure must be
   validated per-country before or alongside the checksum, not instead of
   it. Structure is more than length: many countries also constrain which
   BBAN positions must be digits vs letters (e.g. `4!n6!n10!n` style
   country-format masks) — a string of the right length but wrong internal
   shape (letters where the BBAN expects digits) should fail structurally,
   not just numerically.
4. **A passing checksum only proves the IBAN is *well-formed*, never that
   the account exists or is reachable.** This is the one insight every
   competitor here independently arrives at (Wise dedicates an entire
   section to it: "we can tell whether your IBAN is in the right format, but
   we can't guarantee that it exists"). A Forge tool that returns `{valid:
   true}` without this caveat invites a user to over-trust the result before
   wiring money — the output schema and the UI copy both need to carry this
   distinction explicitly, not bury it in a footnote.
5. **BIC/bank identification from the BBAN is a *separate*, country-specific
   dataset lookup, not derivable from the checksum math.** Some countries
   embed a recognizable bank code in fixed BBAN positions (enabling BIC
   lookup, per IBAN.com and ibancalculator.com's marketed feature); many do
   not, or the mapping requires an actual bank-code registry, not
   arithmetic. Treat "checksum + structure valid" and "bank identified" as
   two independently-gated pieces of the response — never imply the second
   from the first.
6. **Real-world input is messy and must be normalized before validation,
   not rejected on sight.** IBANs are commonly copy-pasted in *print format*
   with spaces every 4 characters (e.g. `GB33 BUKB 2020 1555 5555 55`) as
   well as *electronic format* with no spaces — both 8gwifi.org and Wise's
   example card show the compact form, but real user input regularly
   includes spaces, and sometimes lowercase letters or stray hyphens.
   Uppercase + strip whitespace/hyphens before any structural check; only
   then reject on genuinely invalid characters.
7. **Country coverage is a real, disclosed number, not "all countries."**
   IBAN is not universal — SwiftRef's own map shows only 64% of countries
   have it as mandatory, and the ISO 13616 registry (the actual source of
   truth SwiftRef claims to draw from) lists a specific, finite country set
   (in the 80-ish range depending on how "officially registered" is
   counted; 8gwifi covers 50+, IBAN.com claims 116 which likely includes
   non-ISO "IBAN-like" formats some banks accept unofficially — a Forge
   implementation must be explicit about which list (strict ISO 13616
   registry vs a broader "used in practice" set) it validates against, and
   say so in the response, rather than silently picking one.

### Scope decision, made in this pass

Per the task's own instruction — "if the full per-country BBAN rule set
cannot be primary-sourced, then say so and scope the tool to what CAN be
verified" — this brief now makes that call explicitly:

**What is primary-sourced and safe to ship as guaranteed-correct:**
- The generic IBAN structure (`2!a2!n30c`) — ISO 13616-1:2020 Clause 5.
- The MOD-97-10 checking procedure (rearrange, transliterate A=10..Z=35,
  mod 97, valid iff remainder 1) — ISO 13616-1:2020 Clause 6.2.
- The MOD-97-10 generation procedure (append country+"00", transliterate,
  mod 97, check digits = 98 − remainder, valid range `[02..98]`) —
  ISO 13616-1:2020 Clause 6.3 — needed for the companion test-IBAN generator
  (§9 below).
- Basic charset validation (BBAN is letters+digits only, no separators) —
  ISO 13616-1:2020 Clause 5(c).

**What is NOT primary-sourced in this pass, and why:** per-country BBAN
length, the exact position/length of the bank identifier within the BBAN,
and any country-specific structural mask (e.g. `4!n6!n10!n`-style formats)
live in the **ISO IBAN registry**, a document ISO 13616-1:2020 Clause 7
explicitly defers to and does not itself contain. That registry is
maintained and published via `iso13616.org` / `swift.com`, and **both
were unreachable in this research pass** (repeated timeouts on WebFetch and
on the local screenshot tool, distinct from a deliberate skip). The
per-country figures currently in this brief (§6.2a/§3 competitor writeups,
the length range "15 (Norway) to 32 (Saint Lucia)," etc.) remain sourced
from 8gwifi.org's and iban.com's own published tables — real,
internally-consistent-looking secondary sources, but not the registry
itself, and iban.com in particular could not even be screenshot-verified
(see §2's existing note on its blank-render screenshot failure).

**Resulting scope for the shipped tool:** validate what the primary
standard actually specifies — format shape, charset, and the MOD-97-10
checksum over the rearranged string — as the tool's core, always-correct
guarantee. Per-country length/BBAN-structure checking is included as a
**best-effort secondary layer**, explicitly labeled in both the UI copy and
the API response as sourced from a third-party table rather than the ISO
registry, with a `structureSource: "third-party-reference"` (or equivalent)
field so an agent caller can distinguish "this IBAN failed the ISO-primary
MOD-97-10 checksum" (authoritative) from "this IBAN's length looks wrong for
its country per a secondary reference table" (best-effort, not guaranteed
against the actual registry). This is deliberately less than the "48
countries" or "116 countries" competitors claim, but every claim it does
make is either primary-sourced or explicitly labeled as not — matching this
task's own framing: "a tool that verifies less but correctly beats one that
claims 48 national checksums it cannot source."

## 8. Chosen archetype

**Instant transform**, with a **drop-and-verdict**-shaped result panel.

Why instant transform fits: the computation (normalize → length/structure
check → MOD-97-10 checksum) is sub-millisecond and fully client-computable —
exactly the "the button is a step tax when compute is trivial" case §6.7.10
describes. Every competitor above gates this behind a button anyway (Wise,
8gwifi, ibancalculator, SwiftRef all require a click); that is their shared
missed opportunity, not a reason to copy them. Once the user has typed a
plausible-length string, validating live costs nothing and removes a
needless click from the single most common use case (paste-and-check).

The result panel itself borrows drop-and-verdict's shape — "one clear answer,
detail on demand" — because the primary thing the user wants is a single
pass/fail verdict, with the parsed breakdown (country, check digits, BBAN,
bank code if identifiable) available as expandable detail rather than a wall
of fields up front.

Why the others are wrong here:
- *Configure-then-generate* — wrong for the primary validator; there is no
  configuration that changes the checksum result. (A secondary *test-IBAN
  generator* feature, borrowed from 8gwifi's "Generate Test IBAN" dropdown,
  is genuinely configure-then-generate in shape — but it is a distinct,
  smaller companion feature, not the tool's main archetype. See §9.)
- *Decision wizard* — wrong: the user already holds a concrete IBAN string;
  they are not choosing between abstract options.
- *Two-pane compare* — wrong: one input, not two things to diff against
  each other.
- *Inspect-and-drill* — close but not quite it: the parsed structure here
  (country/check-digits/BBAN/bank code) is genuinely shallow — a handful of
  flat fields, not a deep nested tree like a JWT payload or JSONPath result.
  Drop-and-verdict's "one clear answer, detail on demand" fits a flatter
  structure better than inspect-and-drill's exploration framing.
- *Batch queue* — wrong for the Core synchronous single-IBAN case; a future
  bulk-validate variant (paste one-per-line, mirroring the existing
  `email-validate` tool's batch pattern) is plausible as a **should-have**,
  not a reason to make the primary tool async.
- Plain *form + button* — rejected for the same reason every competitor's
  button-gate is listed as debt in §6: this computation is cheap enough that
  live update is strictly better and free to implement once the engine is
  pure/synchronous, which it already is precedent-wise (`credit-card-luhn`
  and `email-validate` are both pure/synchronous siblings in the existing
  Verifier root).

## 9. Our design

### 9.1 Journey

1. Land on page: a single, wide text `Input` above the fold, placeholder
   showing a realistic example in *print format* with spaces (e.g.
   `GB33 BUKB 2021 5555 5555 55`) so the user immediately sees an accepted
   shape — echoing Wise's "teach the format before asking for input" pattern
   without requiring a separate static example card to take up vertical
   space.
2. **Live validation, no button:** on every keystroke (debounced ~120ms),
   normalize input (uppercase, strip spaces/hyphens) and run: (a) basic
   charset check (letters+digits only), (b) country-code lookup against the
   supported registry, (c) length check for that country, (d) BBAN structure
   mask check for that country where we hold one, (e) MOD-97-10 checksum.
   Each stage short-circuits the next with a specific failure reason — never
   a bare "invalid."
3. **Result card** (always visible, skeleton/empty state before input,
   matching the `encoding-detect` house pattern of "always-visible skeleton"):
   - Primary verdict: pass/fail, rendered with an explicit caveat line
     ("well-formed — this does not confirm the account exists") whenever the
     verdict is pass, never omitted (domain know-how #4).
   - Parsed breakdown, expandable/secondary: country name + code, check
     digits, BBAN, and — where our per-country bank-code table can identify
     one — bank code / bank name. No claim of a bank code where the country's
     BBAN format doesn't encode one; the field is simply absent, not a
     placeholder guess.
   - Failure reasons are specific and enumerable (`country_unsupported`,
     `wrong_length_for_country`, `bad_charset`, `structure_mismatch`,
     `checksum_failed`) — mirroring the stable-error-code discipline the
     existing `credit-card-luhn`/`email-validate` tools already follow
     (`reason: "luhn_failed"`, `reason: "format"`), so this fits the house
     shape rather than inventing a new error style.
4. **Companion feature (should-have, not must-have):** a small, secondary
   "Generate a test IBAN" control (country picker + button) below the main
   validator, borrowed from 8gwifi's dual-purpose page — explicitly labeled
   "for testing only, not a real account" per 8gwifi's own disclaimer
   pattern, and visually and functionally *secondary* to the validator, not
   competing with it above the fold.
5. **Output actions:** Copy (plain text summary) and Copy JSON — the JSON
   copy is the thing none of the five competitors offer at all, and is what
   makes this tool agent-consumable the same way the human copies it.
6. **Error / edge states:** empty input → skeleton dashes, no error styling
   (never show "invalid" for an empty field). Partial input while typing
   (below the target length for the detected country) → a neutral "keep
   typing" state, not a premature fail, so the live-update behavior doesn't
   flash red on every keystroke. Unsupported country code → a specific
   `country_unsupported` reason rather than a generic failure, since that is
   a different problem than a bad checksum.
7. **No ad, no affiliate CTA, no consent-wall gate** sits between the input
   and the result — directly closing the ibancalculator.com and 8gwifi.org
   debt items in §6.
8. **Compose-next:** the parsed BBAN/account-number output is a natural
   input to a future bank-code/BIC lookup dataset tool if/when one is built;
   until then this tool does not fabricate a bank-name field it cannot
   support for a given country (domain know-how #5) — honest partial
   coverage over a guessed answer.

### 9.2 Layout

- Above the fold: input field + always-visible result skeleton, no scroll
  needed to see the tool is live before typing — matching the
  `encoding-detect` house precedent.
- Options density: zero required options before output — no country picker
  needed for validation itself (country is *derived* from the IBAN's own
  prefix, not chosen), keeping "instant use" (§6.5 gate 1) intact. The only
  optional control is the secondary test-IBAN generator's country dropdown,
  visually and spatially separated from the primary validator.
- Mobile: single-column stack — input, then result card, then (below a
  fold break) the secondary generator — no tabs, no modal gates.

### 9.3 Must-have

*without these, users bounce back to a competitor*

- Live validation, no button — the one thing zero competitors do, and the
  cheapest win available given the sub-millisecond compute cost.
- Per-country length + structure check, not checksum-only — matching
  ibancalculator.com's stated "beyond checksum" depth for at least length/
  structure, ideally bank-code where the format supports it.
- The explicit "well-formed, not proof of existence" caveat on every pass
  result — the one universally-agreed-on piece of domain know-how; omitting
  it is a trust failure, not just a UX gap.
- Specific, enumerable failure reasons (not a bare boolean) — parity with
  the existing `credit-card-luhn`/`email-validate` house pattern.
- JSON copy / agent-schema parity with the human result — the gap every
  competitor here leaves open on their free tier.

### 9.4 Deliberately skipped

- Full BIC/bank-name lookup as a *guaranteed* field for every country —
  IBAN.com and ibancalculator.com market this, but it requires a maintained
  bank-code registry per country; shipping it as "sometimes present, always
  honest about absence" is correct-by-construction, shipping it as "always
  present" without the dataset behind it would be the over-promising this
  brief explicitly warns against (domain know-how #5).
- Ads, affiliate CTAs, or a consent-wall gate in the workflow — direct,
  deliberate rejection of ibancalculator.com's and 8gwifi.org's debt.
- A paid "IBAN SUITE"-style separate premium API product — Forge's own
  meter/wallet model already covers agent access; a second, separate paid
  tier duplicating that would fight the house billing model (§6.9).
- Full CSV/bulk upload as the *primary* interaction — a should-have batch
  variant (one-per-line, mirroring `email-validate`'s existing batch
  pattern) is plausible later, but the primary tool stays single-IBAN
  instant-transform; bulk-first is ibancalculator.com's B2B upsell shape,
  not the free/human-first shape this brief targets.

### 9.5 Differentiator

**Our differentiator:** live (no-button) validation where all five
competitors require a click; an explicit, always-shown "well-formed ≠
verified" caveat that only Wise states at all (and only in prose, not in a
structured field); honest partial bank-code coverage instead of an
all-or-nothing promise; zero ads/consent-walls/affiliate CTAs inside the
workflow (directly against ibancalculator.com's and 8gwifi.org's worst
patterns); and the same JSON result schema available via OpenAPI + MCP with
one wallet — a machine contract none of the five free tiers offer at all.

### 9.6 I/O contract

*for the implementer*

```
input:  { iban: string }
        // raw user input; normalization (uppercase, strip spaces/hyphens) happens server/client-side before checks

output: {
  valid: boolean,
  normalized: string,              // e.g. "GB33BUKB20201555555555"
  formatted: string,               // print format, spaced every 4 chars
  country: { code: string, name?: string } | null,
  checkDigits?: string,
  bban?: string,
  bankCode?: string,               // present only where the country's BBAN format identifies one
  reason?: "country_unsupported" | "wrong_length_for_country"
         | "bad_charset" | "structure_mismatch" | "checksum_failed",
  caveat: string                   // always present when valid: true — "does not confirm the account exists"
}
```
Side effect: `pure`. Engine: MOD-97-10 per ISO 7064/13616, plus a static
per-country length/structure table (own dataset — this is exactly the kind
of small, well-defined lookup table that does not require a third-party
library per 手搓禁止's "hand-craft is last resort" test, since the algorithm
and the table are both fully specified by the ISO standard and there is no
existing Forge engine that already wraps it, unlike e.g. chardet for
`encoding-detect`). Declare explicitly, in the SKILL.md and the response
shape, which country list is validated against (ISO 13616 registry) so the
country-count claim is never fuzzier than IBAN.com's unverified "116."

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

**Resolved 2026-07-28 — primary-source gap on checksum math.** The MOD-97-10
algorithm and the generic IBAN structure (`2!a2!n30c`) are now verified
directly against **ISO 13616-1:2020(E)**, Clauses 5, 6.2, and 6.3 (quoted in
full in §7 above), retrieved via an authorized ISO standards-reseller preview
(`standards.iteh.ai`) after the registry's own hosts — `iso13616.org` and
`swift.com` — timed out on every direct-fetch and screenshot attempt in this
environment. Per-country BBAN length/structure rules remain **not**
primary-sourced (the registry that holds them was unreachable, not skipped)
and the brief now scopes the tool accordingly — see "Scope decision, made in
this pass" at the end of §7: ship the ISO-primary structure+checksum check
as the guaranteed-correct core, and expose any per-country length/structure
checking as an explicitly-labeled, non-authoritative secondary layer sourced
from 8gwifi.org/iban.com's public tables. This directly follows the task's
own instruction that a tool verifying less but correctly beats one claiming
coverage it cannot source.

## 11. Gaps and open questions

- [ ] **Per-country BBAN length and structure rules are not primary-sourced.**
      The ISO IBAN registry hosts (`iso13616.org`, and the SWIFT-hosted
      registry PDF at `swift.com`) timed out on every WebFetch and screenshot
      attempt in this environment — a timeout, not a 403, so this reads as an
      outbound network restriction or host slowness rather than bot
      detection. The generic structure and MOD-97-10 checksum *are*
      primary-sourced (ISO 13616-1:2020(E), Clauses 5, 6.2, 6.3, quoted in
      §7); the per-country table is not, and the tool is scoped accordingly
      (§7, "Scope decision, made in this pass"): the ISO-primary check ships
      as guaranteed-correct, per-country checking ships as an explicitly
      labelled, non-authoritative secondary layer built from
      8gwifi.org/iban.com's public tables. An implementer with a different
      network path should reach the registry before finalizing that table.
- [ ] **`iban.com` could not be visually verified** — screenshot capture
      failed twice with a blank render, consistent with bot detection. Its
      feature claims (checksum + BIC + per-country rules) are sourced from
      WebFetch text only and flagged as such in §3. Not blocking: four other
      competitors, three screenshot-verified in full, establish the pattern
      space this brief designs against.
- [ ] **The "category leader" framing for IBAN.com is an inference, now
      marked as one in §3** — it rests on the generic domain name and on the
      site appearing in search for the plain keyword, not on any traffic or
      rank measurement this pass performed.
- [ ] **No competitor was exercised with a real IBAN**, so their result
      rendering, error copy and per-country feedback (§3, §4) are described
      from page copy and entry-state captures rather than observed output.
- [ ] **BIC/bank-name lookup is out of scope but adjacent** — competitors
      bundle it, we do not; if users arrive expecting it, the hand-off target
      does not exist yet.
- [ ] **Mobile behaviour unverified** for all reached competitors.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in this brief.
