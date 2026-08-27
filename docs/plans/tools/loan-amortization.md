# Tool brief: `loan-amortization`

Root: **Simulator** (43, per §6.7.2a / §6.7.9). Object: loan/payment schedule
(numeric projection over time, not a document, not a file).

Tier: **Core** (§6.5 tiering table) — very high commercial search demand, and
the projection is a pure formula an agent can call deterministically.

**Status:** research-complete — teardown of 3 competitors done, design below;
no code written yet.

## 1. Demand

- **JTBD:** "How much of my payment goes to interest vs principal, and when
  does that flip" / "what will my loan balance be after N payments" / "will
  paying extra each month actually shorten my loan and by how much" — before
  signing a loan, or mid-loan deciding whether prepayment is worth it.
- **Keywords:** loan amortization schedule calculator, amortization calculator,
  amortization schedule, mortgage amortization calculator, loan payoff
  calculator, extra payment calculator, principal and interest breakdown.
- **Pain:** Lenders quote a single monthly payment number; borrowers cannot
  see how that payment splits between interest and principal over time, so
  they cannot judge whether an extra payment is worth it, cannot verify a
  lender's own schedule, and cannot answer "what's my balance in month 60"
  without redoing the loan math by hand. A naive spreadsheet formula also
  drifts on the final payment (floating-point rounding leaves a few cents of
  balance) — a pain answered in §9 (know-how #4) and §9.3.

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| Calculator.net Amortization Calculator | https://www.calculator.net/amortization-calculator.html | Yes — WebFetch + screenshot | [`calculator-net.png`](../../research/forge/loan-amortization/calculator-net.png) |
| Bankrate Amortization Calculator | https://www.bankrate.com/mortgages/amortization-calculator/ | Yes — WebFetch + screenshot (this pass; the brief that seeded this task had marked it unreached, superseded here) | [`bankrate.png`](../../research/forge/loan-amortization/bankrate.png) |
| amortization-calc.com | https://www.amortization-calc.com/ | Yes — WebFetch + screenshot (this pass; the brief that seeded this task had marked it unreached, superseded here) | [`amortization-calc-com.png`](../../research/forge/loan-amortization/amortization-calc-com.png) |

Search phrasings used to surface these (from the task brief, not
re-run independently this pass): "loan amortization schedule calculator" —
calculator.net, bankrate.com, amortization-calc.com, calculatorsoup.com,
transunion.com/tools/amortization-calculator all rank. calculatorsoup.com and
transunion.com were named as ranking but not individually visited — carried to
§11, no feature/journey/layout claim made about either below.

## 3. Feature inventory

**Calculator.net** — core strength: the most complete extra-payment surface
of the three. Inputs: loan amount, term (years + months), interest rate,
start month; optional extra monthly / extra yearly / extra one-time payments
(the one-time kind expandable to 10 separate entries via a "more one-time
payments" toggle). Output: a summary block (monthly payment, a pie chart of
principal-vs-interest share, total payments, total interest), then **two**
schedule tables — a monthly table (month, interest, principal, ending
balance, with an "end of year" marker every 12 rows) and a collapsed annual
table (year, annual interest, annual principal, year-end balance). Has a
print button and a year-vs-balance line chart. Upsell: cross-links to
specialized calculators (mortgage, auto, personal, FHA, VA, annuity) and
educational copy on amortization — these are marketing, not features, and are
called out as such. Observed: no ads, no signup gate.

**Bankrate** — core strength: framing the calculator inside mortgage context
(current average rate hints, "compare mortgage rates" cross-sell) rather than
raw math depth. Inputs: loan amount, term (with 10/15/20/30-year presets
called out in copy), interest rate, start date, optional extra payments.
Output: a chart plus a "Schedule" tab with month-by-month principal/interest/
balance; summary figures for monthly P&I and total interest. Explicitly scopes
itself to **principal and interest only** — no escrow (taxes/insurance) in
the schedule, stated as a limitation in the page's own copy, not observed
behavior. Upsell: the marketplace link ("compare current mortgage rates") is
the business model — the calculator is lead-gen for a lender marketplace, not
a standalone free tool. Their core strength (rate-shopping context) is also
their debt (§6): the calculator is secondary to the marketplace.

**amortization-calc.com** — core strength: the most flexible input set —
loan-type dropdown (purchase/refinance/reverse/auto/personal/business), term
in years **or** months **or** weeks, and a start-date picker spanning
1991–2027. Output: fixed monthly payment, a per-payment schedule table
(payment #, calendar date, interest, principal, balance) grouped by year with
expand/collapse, and a balance-over-time chart that **marks the crossover
point** — the payment where principal first exceeds interest, a feature none
of the other two surfaces explicitly. Also offers a downloadable Excel
template and a light/dark/system theme toggle. Upsell: cross-links to more
specific calculators (mortgage-with-escrow, auto-with-trade-in, payoff
calculator) — same pattern as the other two, pointing depth-per-loan-type to
a family of pages rather than one page with mode switches.

**Cross-competitor read.** Table stakes across all three: loan amount + rate
+ term + start date in; a full per-period principal/interest/balance schedule
out; support for optional extra/prepayment amounts. Worth adopting from one:
amortization-calc.com's crossover-point marker (a genuinely useful single
number most people are actually trying to find when they ask "when does most
of my payment become principal"). Nobody offers: a machine-readable
(JSON/CSV) export of the schedule on the calculator page itself, or an
explicit "what payment frequency" control (all three default silently to
monthly).

## 4. Journey maps

**Calculator.net.** Arrival: a form with all fields visible above the fold,
loan amount pre-filled with a plausible default. First touch: user edits loan
amount/rate/term, optionally opens the extra-payment fields. Result: pressing
"Calculate" produces a results block below the form (summary + pie chart +
schedule tables) — this is a submit-driven journey, not live-as-you-type.
Getting the result out: print button; no CSV/JSON export observed. Large/
malformed input and error behavior: not observed in this pass — no error
state was surfaced by WebFetch's rendering.

**Bankrate.** Arrival: form embedded in an editorial mortgage-content page,
loan amount/term/rate/start date, extra-payment fields below. Result appears
in a chart plus a separate "Schedule" tab — a tab switch, not scroll, to get
from summary to full detail. Getting the result out: not stated in the
fetched content — no export/print called out. Error/large-input behavior:
not observed.

**amortization-calc.com.** Arrival: loan-type dropdown first (purchase /
refinance / reverse / auto / personal / business), then amount/rate/term/
start-date, then an explicit "Calculate" button — again submit-driven, not
live. Result: monthly payment shown prominently, then a year-grouped,
expand/collapsible schedule table plus a balance chart annotated with the
crossover point. Getting the result out: a downloadable Excel template of the
schedule — the only one of the three offering a file export. Error/large-input
behavior: not observed in the fetched content.

All three: **no live/instant journey** — every one requires an explicit
calculate action, because the schedule needs several validated fields before
a projection is meaningful (an incomplete loan amount+rate+term has no
sensible partial answer) — this is a real constraint on the archetype choice
in §8, not an omission by any of the three.

## 5. Layout + screenshots

All three are single-column, top-to-bottom: inputs first, "Calculate" action,
then results below (calculator.net and amortization-calc.com) or in a tabbed
results panel (Bankrate). None use a two-pane input/output split — the
schedule table is wide (5 columns × up to hundreds of rows) so it runs the
full content width beneath the compact input form, not beside it. Options
density is moderate: 4–6 primary fields, extra-payment fields collapsed or
visually secondary. Bankrate additionally frames the tool inside long-form
editorial content (definitions, FAQs) above and below the calculator itself,
pushing the actual tool further down the page. Mobile behavior: not verified
— all three captures are desktop-viewport screenshots.

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/loan-amortization/calculator-net.png`
- `docs/research/forge/loan-amortization/bankrate.png`
- `docs/research/forge/loan-amortization/amortization-calc-com.png`

## 6. Their debt

Bankrate: the calculator is instrumented as lead-gen for a mortgage-rate
marketplace — "compare current mortgage rates" is the real product, the
calculator is the hook; the page is also padded with long-form editorial
content the user did not come for, pushing the tool below the fold on first
scroll. All three: submit-button-gated (no live recompute as you type), no
machine-readable export of the schedule (Excel template on
amortization-calc.com is the closest, and it is a download, not an API), and
none exposes a payment-frequency control — they silently assume monthly.
Calculator.net's two separate schedule tables (monthly + annual) plus a pie
chart plus a line chart is feature-complete but visually dense for a "give me
the number" visit. None observed to have hard ad interstitials or signup
gates in this pass, so that specific debt (common elsewhere in Forge
teardowns) does not apply here.

## 7. Domain know-how

1. **Standard amortization formula** — fixed payment
   `M = P·r·(1+r)^n / ((1+r)^n − 1)` where `P` = principal, `r` = periodic
   interest rate, `n` = number of periods. Source: standard financial
   mathematics, consistent with the "monthly P&I payment" figure all three
   competitors compute and the formula language Bankrate's own copy
   references. This is the engine; nothing here is competitor-specific.
2. **Interest accrues on the remaining balance each period, not the original
   principal** — every period's interest = `balance × r`, and principal paid
   = payment − interest; balance decreases each period, so interest share
   shrinks and principal share grows monotonically. Source: reasoning,
   confirmed by the shape of calculator.net's own table description
   ("interest falls, principal grows").
3. **Periodic rate is the nominal/simple convention**, `r = annualRate / 12`
   for a monthly schedule — **not** the effective monthly rate
   `(1+annualRate)^(1/12) − 1`. This is the convention every US lender/
   calculator in this teardown uses (loans quote APR, not effective annual
   rate); a naive implementation reaching for the "mathematically correct"
   compounding formula would produce numbers that disagree with every
   competitor and every real loan statement. Source: reasoning from the
   consistent "monthly rate" language across all three competitors' own
   descriptions of their formula.
4. **Final-payment rounding must be forced, not accumulated.** Iterating the
   formula in floating point for hundreds of periods leaves a residual
   balance of a few cents (or a negative one) at the scheduled final period
   because `M` is rounded to cents each period but the true payment is not an
   exact multiple. The correct rule: on the last period, principal paid =
   whatever remaining balance is (not the formula's principal share), so the
   schedule always ends at exactly `0.00`. Source: reasoning — this is the
   single most common naive-implementation bug in amortization schedules and
   is why calculator.net and amortization-calc.com both show a clean
   `$0.00` final balance rather than a residual.
5. **Extra/prepayments reduce principal immediately and either shorten the
   term or lower the payment — the interest rate is never affected.** Applying
   an extra payment in a given period reduces that period's ending balance
   beyond the formula amount, which reduces every subsequent period's
   interest (since interest is `balance × r`, know-how #2), producing runoff
   before the nominal term. Source: reasoning, matches the "extra payment"
   feature description on calculator.net and Bankrate ("additional payments
   to the principal can help you pay off your mortgage faster").
6. **The crossover point (principal payment first exceeds interest payment)
   is a derived, not input, value** — it is a read of the generated schedule,
   not a separate calculation, and it moves earlier as the rate drops or the
   term shortens. Source: amortization-calc.com's own feature (the only
   competitor of the three surfacing it), reasoning added for why it moves.
7. **The loan start date shifts calendar labels on the schedule but changes
   no monetary amount** — it purely maps period 1..n to calendar
   month/year for display. Source: amortization-calc.com's own copy, "noted
   as affecting only calendar dates, not payment amounts."
8. **Term units are not interchangeable input by input** — a term entered as
   "30 years" and a term entered as "360 months" must produce identical
   schedules; naive parsing that treats years and months as separate,
   non-combinable fields (calculator.net's own years+months pair) risks
   double counting if not summed correctly into one period count `n` before
   the formula runs. Source: reasoning from calculator.net's dual year/month
   input.

## 8. Chosen archetype

**Configure-then-generate** — the options (loan amount, rate, term, start
date, optional extra payments) *are* the product; the output is a full
schedule that regenerates whenever any input changes. This matches the
observed reality in §4: none of the three competitors runs live-as-you-type
(know-how: a partial loan amount+rate+term has no meaningful partial
schedule), but all three *do* fully regenerate the entire schedule from
scratch on every recalculation — there is no incremental/stateful "edit one
cell" mode anywhere in this category.

- **Instant transform** — wrong: there is no single deterministic
  transform of one paste into one output; five interdependent numeric inputs
  must all be valid before any schedule number is meaningful, so a
  no-button live view would just flash errors as the user types the second
  field.
- **Decision wizard** — wrong: the user already knows what they want (a
  schedule for a specific loan); there is no branching "help me choose"
  question here, unlike a LICENSE chooser where the *shape* of the answer is
  unknown up front.
- **Drop-and-verdict** — wrong: there is no file being dropped and no
  single pass/fail verdict; the output is a full table of derived numbers
  the user reads across, not a single verdict.
- **Two-pane compare** — wrong: there is exactly one loan being projected,
  not two inputs being diffed side by side. (A future "compare two loan
  offers" tool would be Two-pane compare — a related but distinct tool, not
  this one; noted in §9.4.)
- **Inspect-and-drill** — close but not quite: the output *is* a structure
  the user explores (the schedule), but the defining action here is
  changing the inputs and getting a wholly new structure back, not drilling
  into a fixed structure that was handed to the user already-computed (as in
  JWT decode). The generation step, not the exploration step, is the point.
- **Batch queue** — wrong: this is a single, synchronous, sub-second
  computation (`pure`, no async job needed) — no queue, no progress bar, no
  multi-file input.

## 9. Our design

### 9.1 Journey

1. **Arrival** — a compact input panel above the fold: loan amount,
   interest rate (annual %), term (single numeric field + a unit toggle —
   years / months, summed into one `n` per know-how #8, not two independent
   fields), start month/year, and a collapsed "extra payments" section
   (monthly / one-time / yearly amounts). Sensible defaults pre-filled
   (matching the "instant use" ship-gate §6.5 gate 1) so a first-time visitor
   sees a real schedule immediately, not a blank form.
2. **First touch** — user edits any field; the schedule recomputes on
   change (debounced), no separate "Calculate" button — this is the one
   place we deliberately improve on all three competitors' submit-gated
   journey (§4), because the computation is `pure` and sub-millisecond, so
   the "step tax" of a button is unjustified even though the archetype is
   Configure-then-generate rather than Instant transform.
3. **Result** — a summary strip (monthly payment, total interest, total
   paid, crossover-point payment number per know-how #6) directly under the
   inputs, then the full per-period schedule table (period, date, payment,
   interest, principal, balance) below it, plus a compact annual roll-up
   view toggle. A balance-over-time chart sits beside or under the summary
   strip, annotated at the crossover point.
4. **Exit** — copy-to-clipboard and CSV download of the full schedule (the
   machine-readable export §3 found nobody in this category offers); the
   OpenAPI/MCP contract (§9.6) gives agents the same schedule as structured
   JSON without touching the page at all.
5. **Empty state** — never truly empty: defaults render a schedule on
   arrival, per point 1.
6. **Error state** — inline field-level validation (negative or zero loan
   amount, zero-or-negative term, rate outside a sane 0–100% band) with the
   offending field flagged and the rest of the schedule left showing the
   last valid computation rather than clearing to blank — avoids the
   "flashing empty results while typing" failure a live-recompute design
   risks.
7. **Large-input path** — term entered in months up to very long horizons
   (e.g. a 50-year term = 600 periods) renders the full schedule without
   pagination breaking correctness, but the on-page table virtualizes/
   paginates rendering for performance while the export and API contract
   still return every period.

### 9.2 Layout

Single column, no two-pane split (matches all three competitors and the
nature of the data — one loan, one schedule, no side-by-side comparison
target in this tool). Inputs use `@nebutra/ui/primitives` (`Field` + `Input`
for amount/rate, a segmented control or `Select` for the term unit toggle,
`Select` for the start month) — no raw `<input>`. No borders between the
input panel and the results panel; separated by a tonal background shift and
spacing per house rules. Options density kept low above the fold (5 primary
fields + 1 collapsed "extra payments" disclosure); the wide schedule table
runs full content width below the summary strip, with its own
`overflow-x: auto` on narrow viewports rather than horizontal page scroll.
Mobile: summary strip and chart stack above the table; the table gets a
narrower column set (period, principal, interest, balance) with the date
column droppable at small widths rather than forcing horizontal scroll on
every row.

### 9.3 Must-have

- **parity** — loan amount, rate, term, start date inputs (§3, all three).
- **parity** — full per-period schedule: interest, principal, balance
  columns (§3, all three; know-how #2).
- **parity** — summary figures: monthly payment, total interest, total paid
  (§3, all three).
- **parity** — extra/prepayment support: monthly, yearly, and one-time
  amounts, correctly shortening the schedule (§3, calculator.net + Bankrate;
  know-how #5).
- **parity** — exact `$0.00` final balance, no floating-point residue
  (know-how #4 — silent in competitor UIs but must be correct, not just
  invisible).
- **edge** — crossover-point number surfaced explicitly, not just in a chart
  annotation (only amortization-calc.com has this at all, and only as a
  chart marker, not a stated number).
- **edge** — CSV/JSON export of the full schedule (nobody in §3 offers a
  non-Excel-download export).
- **edge** — live recompute on input change, no submit button (§9.1 point 2 —
  none of the three competitors does this).

### 9.4 Deliberately skipped

- **Escrow/PITI (taxes, insurance, HOA, PMI) layering** — Bankrate explicitly
  scopes its calculator to principal+interest only and pushes escrow to a
  separate "mortgage calculator"; we do the same. This tool answers the
  amortization-math question; a mortgage-specific payment-stack tool is a
  different, later tool (object: mortgage payment, not loan schedule) and is
  out of scope here.
- **Loan-type-specific fields** (trade-in/sales-tax for auto,
  reverse-mortgage mechanics) — amortization-calc.com's loan-type dropdown
  is really several different products glued to one calculator; we ship the
  generic loan-schedule engine and let auto/mortgage-specific variants (if
  ever built) be separate tools that reuse this engine, not modes bolted onto
  this one.
- **Bi-weekly/weekly payment frequency** — genuinely useful (bi-weekly
  payoff-acceleration is a known real strategy) but no competitor here ships
  it as a first-class control (all three default silently to monthly, §3);
  building it now would be speculative scope rather than answering a
  demonstrated gap. Flagged for a follow-up brief if bi-weekly search demand
  is confirmed later, not built speculatively now.
- **Rate-comparison marketplace / lead-gen** — Bankrate's actual business
  model (§6); explicitly refused as their debt, not a feature we are missing.
- **Excel-file download** — amortization-calc.com's approach; superseded by
  our CSV/JSON export (§9.3 edge), which is agent-readable and does not need
  a spreadsheet application to open.

### 9.5 Differentiator

Checked against §3 and §6: the two edges that are genuinely absent from all
three competitors are (a) **live recompute with no submit button** — every
competitor here is submit-gated despite the computation being `pure` and
effectively free; and (b) **a structured export (CSV/JSON) of the full
schedule** — the closest any competitor gets is amortization-calc.com's
Excel-template download, which is a file for a spreadsheet, not schedule data
an agent or script can consume. The crossover-point number is a smaller edge
(one competitor has the chart marker; we make it a stated figure) so it is
listed as edge in §9.3, not oversold as the headline differentiator.
Structural edge that applies here as everywhere in Forge: one contract serves
both the human page and the OpenAPI/MCP surface (§9.6) — an agent gets the
identical schedule computation no human competitor here exposes as an API at
all.

### 9.6 I/O contract

```text
input:   {
  principal: number,          // loan amount, > 0
  annualRatePercent: number,  // nominal annual rate, e.g. 6.5 for 6.5%; 0–100
  termMonths: number,         // total periods; years×12 + months summed before this (know-how #8)
  startYearMonth?: string,    // "YYYY-MM", defaults to current month; calendar-label only (know-how #7)
  extraPayments?: {
    monthly?: number,
    yearly?: { amount: number, month: number },  // 1-12
    oneTime?: Array<{ amount: number, period: number }>  // period = 1-based payment index
  }
}
output:  {
  monthlyPayment: number,
  totalInterest: number,
  totalPaid: number,
  payoffPeriod: number,          // may be < termMonths if extra payments shorten it
  crossoverPeriod: number | null, // first period where principal portion > interest portion (know-how #6)
  schedule: Array<{
    period: number,
    date: string,                // "YYYY-MM"
    payment: number,
    interest: number,
    principal: number,
    balance: number               // exact 0 on final period (know-how #4)
  }>
}
sideEffect: pure
meterId: forge.simulator.loan-amortization
roots:   [Simulator]
objects: [loan-schedule]
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Designed in §9.1/§9.2 — not built |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Sketched in §9.6 — not implemented |
| 3 | MCP tool registration (Agent-eligible tools) | Not started |
| 4 | SKILL.md (what / when / how / limits) | Not started |
| 5 | Meter id + wallet hooks | `forge.simulator.loan-amortization` named in §9.6, hooks not wired |
| 6 | Side-effect class declared | `pure` — declared in §9.6 |
| 7 | Stable error codes; `request_id` on server paths | Not started |
| 8 | Privacy note: client-only vs uploaded; retention | Not written — this tool takes no PII, only numeric loan terms; a one-line client-only note is owed at build time |
| 9 | Decl/ads: intent title, unique value, related tools | Not started |
| 10 | Decl engine metadata: upstream SOTA name + version | N/A — this is our own formula implementation, not a wrapped upstream engine |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 |

Not started — research-only brief; no code exists yet.

## 11. Gaps and open questions

- [ ] **Not reached:** calculatorsoup.com and transunion.com/tools/
      amortization-calculator were named as ranking competitors in the task
      brief but not individually visited this pass — no feature, journey, or
      layout claim is made about either above. Reopen if a future pass has
      capacity to add them to §3–§5.
- [ ] **Read from marketing copy, not observed behavior:** Bankrate's stated
      "principal and interest only, no escrow" scope, and its 10/15/20/30-year
      preset framing, come from the page's own copy quoted in §3, not from
      interacting with the live calculator (WebFetch renders content, not
      interaction). Flagged inline in §3 already.
  - Bankrate's "no signup gate" / "no ads" read likewise comes from the
    fetched content, not a full interactive session — a real visit could
    surface a cookie wall or ad unit the fetch did not render.
- [ ] **Inferred, not measured:** no traffic/ranking data was pulled for any
      of the three; "top organic result" / "high-authority" claims in the
      task brief that seeded this file are the task's framing, not
      independently re-verified ranking data in this pass.
- [ ] **Deferred:** bi-weekly/weekly payment frequency (§9.4) — reopen if a
      future demand-mining pass shows real search volume for "biweekly
      amortization calculator" specifically, distinct from the monthly
      keyword this brief targets.
- [ ] **Deferred:** loan-type-specific variants (auto with trade-in, reverse
      mortgage, mortgage with escrow) — reopen as separate tool briefs if
      demand is confirmed; not modes of this tool (§9.4).
- [ ] **§9 subsections all written this pass** — none left unwritten.
- [ ] **§10 gates 1–9 are "not started/not built"** rather than "not
      recorded" — this is a research-and-design brief per the task scope; no
      implementation work was in scope for this pass.
- [ ] **Pain named in §1, answered in §9:** "cannot judge whether an extra
      payment is worth it" → §9.3 extra-payment support; "cannot verify a
      lender's schedule" → §9.3 full per-period schedule + export; "what's my
      balance in month 60" → §9.1 result step, full schedule always computed;
      the floating-point drift pain → know-how #4 + §9.3 exact-zero
      requirement. No named pain in §1 is left unanswered.
