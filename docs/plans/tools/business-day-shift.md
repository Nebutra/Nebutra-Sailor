# Tool brief: `business-day-shift`

Root: **Simulator** (43, per §6.7.2a / §6.7.9). Object: a calendar date + a
signed business-day count + a weekend/holiday rule set.

Tier: `Catalog` — a pure deterministic calendar-rule projection, not a
household-name category (like PDF/image) and not a background job; it belongs
in the same "prediction tool" family as cron-explain, priced and shipped the
same way.

**Status:** `research` — competitor teardown and design only; no application
code touched in this pass.

## 1. Demand

- **JTBD:** "If I start today and it takes 10 business days, what date does
  that land on?" / "How many working days do I actually have between these
  two dates, ignoring weekends and public holidays?" — a deterministic
  calendar projection a person needs before promising a delivery date, filing
  a legal/compliance deadline, or planning payroll/SLA windows.
- **Keywords:** business days calculator, working days calculator, add
  business days to a date, workdays between two dates, 工作日计算器, 工作日
  天数计算.
- **Pain:** Manually counting weekdays on a calendar is error-prone past a
  week or two, gets worse the moment public holidays are involved (a holiday
  falling on what would otherwise be a working day shifts the count by one
  each time), and in China specifically the government's 调休/补班 (holiday
  makeup-workday) scheme routinely turns a **Saturday into a workday and a
  weekday into a rest day** in the same week — a naive "skip Sat/Sun" rule is
  wrong on those weeks even before holidays are considered. Spreadsheet
  users reach for `NETWORKDAYS`/`WORKDAY` but those formulas take a hardcoded
  holiday list the user must maintain by hand and do not model makeup
  workdays at all.

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| GigaCalculator Working Days Calculator | https://www.gigacalculator.com/calculators/working-days-calculator.php | Yes — WebFetch (two passes) + screenshot | [`gigacalculator-working-days.png`](../../research/forge/business-day-shift/gigacalculator-working-days.png) |
| timeanddate.com Business Days Calculator | https://www.timeanddate.com/date/workdays.html | **No — HTTP 403** on both WebFetch and the screenshot script (Playwright `page.goto` reported `HTTP 403`) | *(no capture — blocked)* |
| lddgo.net 工作日计算器 | https://www.lddgo.net/common/workday | Yes — WebFetch + screenshot (upgraded from "not reached" in the initial landscape scan; a direct pass this session got through) | [`lddgo-workday.png`](../../research/forge/business-day-shift/lddgo-workday.png) |

Search phrasings used to surface these: "business days calculator", "working
days calculator", "add business days to a date", "workdays between two
dates", "工作日计算器". timeanddate.com ranks #1 for the plain-English
keyword per the landscape survey but returns HTTP 403 to both an automated
WebFetch and a headless Playwright navigation — its journey/layout claims
below are **not made**; see §11.

Capture command used (the `_TEMPLATE.md` example command names `.webp`, but
Playwright's `page.screenshot()` only supports `png`/`jpeg` output — `.webp`
fails with `unsupported mime type "image/webp"`; both captures on file here
are `.png`):

```bash
node scripts/research-screenshot.mjs "<url>" "docs/research/forge/business-day-shift/<name>.png"
```

`docs/research/forge/` is gitignored: the captures are local reference
material, this brief is the committed deliverable.

## 3. Feature inventory

**GigaCalculator Working Days Calculator** — the clearest single-purpose
match, confirmed via two WebFetch passes plus a screenshot.
- Core strength: **two explicit modes** as tabs — "Count business days"
  (between two dates) and "Add business days" (project N business days
  forward/backward from a start date, negative numbers supported for
  subtraction).
- **"Include last day" toggle** (Yes/No) on the count mode — an explicit
  inclusive/exclusive switch, not a silently-assumed convention.
- **"Days off are" selector** — Weekends only vs. Weekends & Official
  holidays — lets the user turn holiday-awareness on or off rather than
  forcing it.
- **Built-in country holiday calendars**: US, UK, Canada, Australia (US
  calendar lists 12 federal holidays for 2026 by the tool's own copy).
- Reference tables ("weekdays until date") and a stated fact that "about 20
  business days" occur per month, 250 working days existed in 2026 for the
  US — this is marketing/explainer copy, not tool output, and is labelled as
  such here.
- Output/export: no copy/download button observed; instead **social-share
  links (Facebook/Twitter/LinkedIn/email), an embed-code snippet, and a
  citation box** (APA/Chicago/IEEE/HTML/BibTeX) — built for the page to be
  linked-to and cited, not for the number to be copied into a workflow.
  Upsell/padding: this citation-and-share block is the tool's own way of
  generating backlinks, not a hostile ad — but it occupies UI space a
  copy-the-number user does not need.
- Explanatory prose ("Quick navigation" menu, usage guidance, reference
  tables) sits below the tool, per the tool's own page structure — not
  confirmed to be ad-monetized; no ads were reported by either WebFetch pass.

**lddgo.net 工作日计算器** — the domain-know-how ceiling; the only competitor
of the three that models China's actual holiday calendar mechanics.
- Core strength: **three modes**, richer than GigaCalculator's two —
  (1) **Range Analysis**: start+end date → workday/rest-day breakdown by
  weekday; (2) **Forward Calculation**: start date + N workdays → landing
  date (mirrors "Add business days"); (3) **Single Date Check**: is this one
  date a workday or a rest day, classified into **four states**, not two —
  "normal workday" (正常工作日), "**makeup workday**" (调休/补班), "weekend
  rest," and "holiday rest."
- That four-way classification is the tool's real edge: it is built directly
  on **"the State Council's statutory holiday arrangements"** (国务院法定节假日
  安排) per the tool's own copy, covering 2015–present, and explicitly
  distinguishes "regular weekends" from "special adjustments (makeup
  workdays during holidays)" — i.e. it knows that a specific Saturday can be
  a workday this year because of a holiday shift, which a generic
  weekend-skip rule cannot know without that data table.
- Convenience shortcuts: "This Month / Last Month / Next Month / This Year"
  quick-range buttons for the Range Analysis mode.
- Output/export: date-list results with numeric summaries, plus copy and
  download actions (screenshot confirms a results panel with export
  controls; exact button labels not extracted from the fetched text).
- Upsell/padding: not assessed in this pass — the WebFetch summary and
  screenshot did not surface ad density; recorded as not observed rather
  than absent (see §11).

**timeanddate.com Business Days Calculator** — **not reached** (HTTP 403 to
both WebFetch and the screenshot script). No feature, journey, or layout
claim is made about it. Its existence and general shape (a business-days
calculator ranking #1 for the plain-English keyword) is corroborated only by
the search-result snippet and by the equivalent GigaCalculator tool actually
reached — carried into §11 as an inference, not a fact.

**Cross-competitor read:**
- **Table stakes** (both reached competitors do this): a "project N business
  days from a date" mode, a "count business days between two dates" mode,
  weekend exclusion, some form of holiday-awareness toggle or data source.
- **Worth adopting, only one does it**: lddgo's four-state single-date
  classification (workday / makeup-workday / weekend-rest / holiday-rest) —
  strictly more informative than GigaCalculator's binary "is it a holiday"
  check, and the only one of the two that models makeup workdays at all.
  GigaCalculator's inclusive/exclusive "Include last day" toggle is also
  worth adopting — it makes an easy-to-get-wrong convention explicit instead
  of silent.
- **Nobody does, possible edge**: neither reached competitor accepts a
  **custom/arbitrary holiday list** as direct input (both are fixed to
  built-in country calendars); neither exposes the calculation as an API;
  neither supports a **custom weekend definition** (e.g. Friday–Saturday
  weekends, used in several Middle Eastern countries) — both assume
  Saturday/Sunday.

## 4. Journey maps

**GigaCalculator** (confirmed via two WebFetch passes; no screenshot-only
guessing):
1. Arrival: title + two mode tabs ("Count business days" / "Add business
   days") above the fold; the active mode's input fields render immediately
   below.
2. First touch: start date (defaults to today), end date (or day-count for
   the "add" mode), "Include last day" toggle, "Days off are" selector,
   country dropdown.
3. **Button-gated, not live**: a dedicated **Calculate** button sits below
   the configuration block; the tool does not recompute as fields change.
4. Result appears directly below the Calculate button, same viewport area —
   no page reload, no separate results page.
5. Exit: no copy/download button reported — instead social-share links
   (Facebook/Twitter/LinkedIn/email), an embed-code snippet, and a
   multi-format citation box (APA/Chicago/IEEE/HTML/BibTeX). A user who
   wants the number copied into an email or ticket has to read it off the
   screen and retype it, or use the awkward path of grabbing it out of the
   citation/embed markup.
6. Error/large-input behaviour: **not described by the tool's own copy** in
   either WebFetch pass — end-date-before-start-date and invalid-date
   handling are unconfirmed; recorded as not observed rather than assumed
   graceful.
7. Below the tool: a "Quick navigation" menu, a "weekdays until date"
   reference table, and extensive usage-guidance prose — explanatory
   content, not ad filler, and not blocking the tool itself.

**lddgo.net** (from WebFetch summary + screenshot; interaction-level detail
not confirmed):
1. Arrival: the page presents three mode entry points — Range Analysis,
   Forward Calculation, Single Date Check (exact tab/toggle mechanism not
   confirmed from the screenshot alone).
2. First touch: date picker(s) appropriate to the selected mode, plus
   quick-range shortcuts (This Month / Last Month / Next Month / This Year)
   for Range Analysis.
3. Result: a date-list with numeric summary (count of workdays vs.
   rest-days, or the single landing date for Forward Calculation, or the
   four-way classification for Single Date Check).
4. Exit: copy and download actions are present per the WebFetch summary;
   exact placement and format not confirmed from the screenshot.
5. Error/large-input behaviour: **not observed** in this pass.

**timeanddate.com**: no journey claim — not reached (§2).

## 5. Layout + screenshots

- **GigaCalculator**: single centered column. Tool card (tabs → inputs →
  Calculate button → result) sits at the very top, before any explanatory
  content. A "Quick navigation" menu and a "weekdays until date" reference
  table follow, then longer usage-guidance prose. No sidebar. Mobile
  behaviour: not verified — desktop capture only.
- **lddgo.net**: per the screenshot, a single-page tool with the three modes
  presumably switched via tabs or a segmented control near the top, date
  pickers and quick-range shortcuts in the working area, and a results panel
  below. Exact input/output split and options density are visible in the
  capture but not independently confirmed via page text (WebFetch summary
  only, no follow-up query on layout specifics). Mobile behaviour: not
  verified — desktop capture only.
- **timeanddate.com**: no layout claim — not reached.

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/business-day-shift/gigacalculator-working-days.png`
- `docs/research/forge/business-day-shift/lddgo-workday.png`

## 6. Their debt

- **GigaCalculator**: no ads observed by either WebFetch pass, but the
  "output" is optimized for the page to be shared/cited rather than for the
  number to leave the page cleanly — a social-share bar and a five-format
  citation box stand in for a plain copy button. Button-gated (no live
  update). No custom weekend definition, no custom holiday list, no API.
- **lddgo.net**: ad density and dark patterns not assessed in this pass —
  recorded as unknown rather than clean (§11). Structurally: fixed to
  China's statutory calendar with no visible option to layer a company's own
  extra holidays on top, and (like GigaCalculator) no API surface.
- **timeanddate.com**: undeterminable — not reached.
- **All three**: none expose a documented API/OpenAPI/MCP surface; all are
  human-only pages. None accept an arbitrary custom weekend definition
  (Friday–Saturday, etc.).

## 7. Domain know-how

1. **A "business day" is not just "not Saturday/Sunday" — China's 调休/补班
   scheme actively moves work onto specific Saturdays and moves rest onto
   specific weekdays, every year, around every multi-day holiday.** Source:
   lddgo.net's own stated basis — "the State Council's statutory holiday
   arrangements" (国务院法定节假日安排), which produces both holiday closures
   *and* compensatory workdays (调休/补班) on what would otherwise be a
   weekend. A naive rule of "skip Sat/Sun, skip a fixed holiday-date list"
   is wrong on every 调休 week: it will report a makeup-workday Saturday as
   a rest day, and (if the shifted weekday is not separately modeled) may
   also mis-report the weekday that became a holiday-adjacent rest day. This
   requires a genuine **year-by-year lookup table** of statutory adjustments,
   not a formula — the same reason lddgo.net scopes its own coverage to
   "2015 to present" rather than claiming it works for any year.
2. **Inclusive vs. exclusive endpoint counting is a real, silently-different
   convention across tools — make it an explicit switch, not a buried
   default.** Source: GigaCalculator's own "Include last day" (Yes/No)
   toggle. "How many business days between Monday and Friday" can mean 4
   (exclusive of the end date) or 5 (inclusive) depending on convention, and
   a tool that picks one silently will disagree with a user's spreadsheet
   formula (`NETWORKDAYS` is inclusive of both ends) without explaining why.
3. **Holiday-awareness must be an on/off toggle, not baked in.** Source:
   GigaCalculator's "Days off are: Weekends only / Weekends & Official
   holidays" selector. Some users explicitly want the pure weekend-only
   count (e.g. matching a spreadsheet `WORKDAY` call with no holiday list)
   and would be surprised by an unannounced holiday adjustment changing
   their number.
4. **A single fixed-country holiday calendar is a scoping decision, not a
   completeness guarantee — and the tool must say which calendar it used.**
   Source: both reached competitors ship a small fixed set of countries
   (GigaCalculator: US/UK/Canada/Australia; lddgo.net: China only). Neither
   claims global coverage. A tool that silently defaults to one country's
   calendar (or none) without stating so in the output risks a user trusting
   a number computed against the wrong holiday set — the honest answer is to
   surface the exact ruleset used (which calendar, which year, weekend
   definition) alongside the result, not just the number.
5. **Custom weekend definitions exist and neither reached competitor handles
   them.** Reasoning (not sourced from either competitor, since neither
   supports it): several countries use a Friday–Saturday or
   Thursday–Friday weekend rather than Saturday–Sunday. A tool hardcoded to
   Sat/Sun is wrong out of the gate for those locales — this is this brief's
   own reasoning about a gap, not an observed competitor rule, and is called
   out as an edge in §9.5/§9.4 rather than asserted as demand-verified.
6. **Negative day-counts must subtract, not error.** Source: GigaCalculator's
   own copy: "negative numbers supported for backward calculations" in "Add
   business days" mode. A user asking "10 business days *before* this date"
   is a real, named use case, not an edge case to reject.

## 8. Chosen archetype

**Configure-then-generate** — per §6.7.10's own table: "The options *are*
the product; output regenerates as they change," with the design doc's own
example set including "password rules, QR" as siblings; the weekend
definition + holiday-calendar choice + inclusive/exclusive toggle here play
exactly that role — the calculation is trivial arithmetic once the rule set
is fixed, but the *rule set itself* (which days count as "off") is the part
the user must actively decide, and changing any one of those options changes
every subsequent result, the way changing a QR tool's error-correction level
regenerates the code.

Why the other six are wrong here:
- **Instant transform** — close, but the options (weekend definition,
  holiday calendar on/off, inclusive/exclusive) are not incidental to a
  transform of the date — they *are* the calculation rule, and getting them
  wrong silently produces a wrong-but-plausible date. Instant transform fits
  when there is nothing to configure (base64, case convert); here the
  configuration is the whole domain-know-how problem (§7 items 1–5).
- **Decision wizard** — the user already knows exactly what they want (a
  date N business days out, or a count between two dates); they are not
  uncertain about the goal the way a LICENSE-chooser user is uncertain which
  license fits. A multi-step Q&A would be a step-tax on a task the user can
  state in one sentence.
- **Drop-and-verdict** — there is no file being dropped and no single
  pass/fail verdict being rendered about an artifact; this tool produces a
  computed date or count from typed inputs, not a diagnosis of an uploaded
  object.
- **Two-pane compare** — nothing is being diffed side-by-side; there is one
  computation, not two inputs being contrasted.
- **Inspect-and-drill** — there is no decoded structure to explore (no tree,
  no claims list); the output is a single date or count plus its supporting
  rule breakdown, not an open-ended structure a user drills into.
- **Batch queue** — a single date computation is sub-millisecond and
  synchronous; there is no async job, no progress bar, and no multi-item
  queue here (a bulk "shift 500 dates at once" variant would be a Processor-
  root job wrapping this same logic, per §6.7.9's own Processor framing —
  not this tool's job).
- **"Form + button"** — the trap both reached competitors partly fall into
  (GigaCalculator explicitly gates even the trivial recompute behind a
  Calculate button). Because the underlying arithmetic is cheap once the
  rule set is chosen, gating it behind a button is a pure step-tax; the
  right shape is the options panel driving a live-updating result, which is
  exactly what "Configure-then-generate" names, not "form + button."

## 9. Our design

### 9.1 Journey

1. **Arrival**: single page, no tabs required for the two directions — one
   mode switch (segmented control) between **"Shift a date"** (start date +
   signed day count → landing date) and **"Count between dates"** (start +
   end date → business-day count), defaulting to "Shift a date" since it is
   the more common single-answer JTBD (§1).
2. **First touch**: start date (defaults to today), the count field (or end
   date, depending on mode) — signed integer accepted directly (a leading
   `-` subtracts, per know-how #6, no separate "direction" radio needed).
   Below the primary fields, an options panel: weekend definition (default
   Sat–Sun, with a "custom" option per know-how #5), holiday calendar
   toggle (off by default, or a named calendar once available — see §9.4 for
   what ships first), and an inclusive/exclusive end-date switch for "Count
   between dates" mode only (know-how #2).
3. **Result — live, no button**: the moment start date + count (or start +
   end date) are both present and valid, the result renders immediately and
   re-renders on every option change (weekend definition, holiday toggle,
   inclusive/exclusive) — this is the "Configure-then-generate" shape from
   §8, deliberately not gated behind GigaCalculator's Calculate button.
4. **Result composition**: the headline answer first (the landing date, or
   the count), then — always visible, not hidden behind a details toggle,
   per know-how #4 — a one-line statement of exactly which rule set produced
   it: "Sat–Sun weekends · China statutory holidays 2026 · 8 makeup-workdays
   applied" or "Sat–Sun weekends · no holiday calendar applied." This closes
   the "which calendar did you use" trust gap named in know-how #4.
5. **Exit**: copy-the-date / copy-the-count as plain text, plus copy-as-JSON
   for the same machine shape the API returns (mirrors the
   `line-ending-detect` precedent of a human-copy and a JSON-copy sharing one
   schema).
6. **Empty state**: no start date yet → a neutral placeholder ("Pick a start
   date to begin"), never a false "0 business days" result.
7. **Error state**: end date before start date (count-between mode) is
   accepted and reported as a **negative count with a clear sign**, not
   rejected — mirroring know-how #6's own logic (negative is a real answer,
   not an error) but the copy makes the direction explicit ("−12 business
   days — end date is before start date") so it is never ambiguous.
8. **Large-input path**: "Count between dates" spanning many years is still
   O(days) arithmetic — no visible latency at any realistic date range
   (year 1 CE–9999 CE bound only by JS `Date` range); no async/progress UI
   needed, consistent with the archetype choice (§8, "Batch queue" argued
   away).

### 9.2 Layout

- **Single column, no sidebar.** Mode switch at the top (Shift a date /
  Count between dates), primary date+count fields directly below (using
  `@nebutra/ui/primitives` `Field` + `Input`/date picker — no raw
  `<input type="date">`), options panel below that as a visually distinct
  but border-free block (tonal background shift, per the house no-borders
  rule — not a bordered card), result panel below the options, always
  visible once inputs are valid.
- **No two-pane split** — there is one computation, not an input/output pair
  needing side-by-side comparison (§8 rules out Two-pane compare).
- **Options density**: three controls (weekend definition, holiday toggle,
  inclusive/exclusive) is deliberately kept low — GigaCalculator's four
  controls (start, end, include-last-day, days-off, country) is the density
  ceiling observed; we do not add a fourth unless a real holiday-calendar
  dataset ships (see §9.4).
- **Mobile**: single column stacks naturally (mode switch → fields →
  options → result), same order as desktop; no side-by-side layout to
  collapse, unlike lddgo's likely tab/segmented layout (not independently
  verified, §5).
- **compose.next**: a "Shift another date from this result" affordance
  chains the output landing date back into the "Shift a date" mode's start
  field — the one composition hook this Simulator-root tool can offer
  without pulling in another root.

### 9.3 Must-have

1. **Both directions in one tool** — shift-forward-from-date and
   count-between-dates (parity with GigaCalculator's two-tab shape; splitting
   these into two separate tools would fragment a single JTBD).
2. **Signed day counts, no separate direction toggle** (parity with
   GigaCalculator's "negative numbers supported"; know-how #6).
3. **Explicit inclusive/exclusive end-date switch** (parity with
   GigaCalculator's "Include last day" toggle; know-how #2) — without this,
   our count silently disagrees with a user's spreadsheet formula and they
   have no way to reconcile it.
4. **Custom weekend definition** (edge — neither reached competitor offers
   this; know-how #5). Ships as a simple day-of-week multi-select
   (default Sat+Sun), not gated behind a "custom" toggle that hides the
   option.
5. **The rule-set-used line always visible with the result** (edge over both
   reached competitors, who show the number without restating which
   calendar/weekend rule produced it; know-how #4).
6. **Live recompute, no Calculate button** (edge over GigaCalculator, which
   is explicitly button-gated).

### 9.4 Deliberately skipped

- **Full holiday-calendar data for every country** — lddgo.net's China-only
  depth (a hand-maintained statutory table with makeup-workdays, know-how
  #1) and GigaCalculator's four-country set both represent real, ongoing
  data-maintenance work (a calendar has to be updated every year a
  government publishes a new holiday schedule). This brief does **not**
  commit to shipping any specific pre-built country calendar in v1 — instead
  the tool ships with **user-supplied custom holiday dates** (a plain list
  the user pastes or picks) as the v1 holiday mechanism, and a specific
  named calendar (starting with China's, since it is the one competitor-
  verified mechanism with makeup-workdays, know-how #1) is a follow-up
  scoped and dated separately once a maintained data source is chosen. This
  is a scope cut, not a silent omission — see §11.
- **Social-share bar / embed code / citation box** — GigaCalculator's own
  differentiation strategy (built to be linked-to and cited) is not this
  tool's job; per §6.7.10's own stated edge, our output leaves via copy/API,
  not via a backlink-generation UI.
- **Multi-date / bulk shifting ("shift these 500 dates at once")** — real
  potential value, but per §6.7.9's own Processor framing this is "the same
  tools, over many files [here: many dates], without blocking" — a Processor-
  root job wrapping this same rule engine, not a feature bolted onto this
  Simulator tool.
- **Single-date classification as a standalone third mode** (lddgo's "is
  this one date a workday" check) — this is a strict special case of "Count
  between dates" with start=end=the date in question, or equivalently
  "Shift a date" with count=0; exposing it as a separate UI mode would
  duplicate the same rule engine behind a third button for no new
  capability. The four-state classification (know-how #1) is instead
  surfaced as the *label* on any single day the result touches (e.g. the
  landing date itself is annotated "makeup workday" when applicable), not as
  a separate page section.

### 9.5 Differentiator

- **Custom weekend definition** — genuinely absent from both reached
  competitors (§3, §6); a structural edge, not a polish edge.
- **Live, button-free recompute** — GigaCalculator is explicitly
  button-gated; this closes that gap directly (§8, §9.1 step 3).
- **The rule-set-used line travels with every result** — neither reached
  competitor restates which calendar/weekend rule produced a given number;
  this is a trust mechanism in the same spirit as line-ending-detect's byte-
  delta reporting (docs/plans/tools/line-ending-detect.md §7 item 6) applied
  to a different domain.
- **Agent contract**: OpenAPI + MCP with a stable JSON schema for both modes,
  which neither reached competitor offers at all (both are human-only pages,
  §6). An agent building a project-timeline or SLA-deadline feature can call
  this directly instead of hand-rolling weekend/holiday arithmetic.
- **No ad clutter, no citation/share-bar tax on the result** — structural
  edge per §6.7.10's own "where our edge actually is" table; checked against
  §6 (GigaCalculator's share/citation UI, lddgo's unassessed density).
- **What this brief does NOT claim as a differentiator**: the China
  statutory makeup-workday calendar itself (know-how #1) is lddgo.net's own
  established strength, not ours, until a maintained data source for it is
  actually built and shipped (§9.4) — claiming it now would be table stakes
  we do not yet have, not an edge.

### 9.6 I/O contract

```text
input:
  mode: enum<shift, countBetween>
  startDate: string (ISO 8601 date, e.g. "2026-07-30")
  days?: number            # required for mode=shift; signed integer, negative = backward (know-how #6)
  endDate?: string          # required for mode=countBetween (ISO 8601 date)
  includeEndDate?: boolean  # countBetween only; default false (know-how #2), explicit either way
  weekendDays?: number[]    # 0=Sunday..6=Saturday; default [0,6] (Sat+Sun); custom per know-how #5
  holidays?: string[]       # optional user-supplied ISO dates treated as non-working (v1 mechanism, §9.4)
  makeupWorkdays?: string[] # optional user-supplied ISO dates treated as working despite falling on a weekendDay (models know-how #1's mechanism generically, without a bundled calendar)

output:
  mode: enum<shift, countBetween>
  result:
    date?: string           # mode=shift: the landing date
    count?: number          # mode=countBetween: signed business-day count (negative if endDate < startDate)
    dateClassification?: enum<workday, weekend, holiday, makeupWorkday>  # for the mode=shift landing date, per know-how #1's four-state model (§9.4)
  ruleSetUsed:
    weekendDays: number[]
    holidayCount: number
    makeupWorkdayCount: number
    includeEndDate?: boolean   # echoed back only for mode=countBetween
sideEffect: pure
meterId: forge.simulator.business-day-shift
roots: [Simulator]
objects: [date, day-count, weekend-rule, holiday-list]
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — research-only brief (id proposed in §9.6) |
| 6 | Side-effect class declared | Declared `pure` in this brief (§9.6) |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (2 of 3 named competitors reached, named, captured; the third's non-reach is stated, not hidden) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

**内部验收状态：** `research-complete` — teardown on file per §6.7.10 gate 11
(with one honest non-reach); archetype chosen (gate 12); implementation not
started.

## 11. Gaps and open questions

- [ ] **timeanddate.com was not reached** — HTTP 403 on both WebFetch and
      the Playwright screenshot script. No feature, journey, or layout claim
      is made about it anywhere in this brief; its inclusion in §1's demand
      framing rests on the search-result ranking snippet plus the equivalent
      GigaCalculator tool actually reached, not on firsthand observation —
      this is an explicit inference, not a fact.
- [ ] **lddgo.net's journey and layout are read from a WebFetch summary plus
      one screenshot, not from an interactive pass** — exact tab/toggle
      mechanics between its three modes, its export button labels, and its
      ad density are not confirmed. Recorded as "not observed" rather than
      assumed clean or dirty (§6).
- [ ] **No competitor was tested with a live 调休/补班 (makeup-workday)
      scenario** — lddgo.net's own copy states it models this, but this
      brief did not exercise the tool with a specific date known to be a
      makeup workday to confirm the four-state classification in practice.
- [ ] **No source holiday-calendar dataset has been chosen** for the eventual
      "named calendar" follow-up (§9.4) — v1 ships with user-supplied
      holidays/makeup-workdays only. The trigger to reopen this: a
      maintained, licensable statutory-holiday data source (e.g. an official
      government API or a versioned open dataset) is identified and
      verified reachable.
- [ ] **Custom weekend definition (know-how #5, §9.3 must-have #4) is this
      brief's own reasoning, not a demand-verified need** — no competitor
      offers it and no search evidence of demand for it was gathered in this
      pass; it is included because it is cheap to build correctly and closes
      an obvious correctness gap, not because search volume was measured.
- [ ] **Mobile behaviour unverified** for both reached competitors (desktop
      captures only, §5).
- [ ] **Meter id, error codes, and privacy note (§10 gates 5, 7, 8) are
      proposed/undecided** — meter id is proposed in §9.6 but not wired to
      any wallet; side effect is declared `pure`.
- [ ] **The pain named in §1 about spreadsheet `NETWORKDAYS`/`WORKDAY`
      requiring a hand-maintained holiday list is answered by §9.3 must-have
      #4 (custom weekends) and the §9.6 `holidays`/`makeupWorkdays` inputs,
      but the "hand-maintained" pain is only partly closed** until a named
      calendar ships (§9.4) — until then, a user still maintains their own
      holiday list, just inside our tool instead of a spreadsheet formula.
