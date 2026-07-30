# Tool brief: `retry-backoff-schedule`

Root: **Simulator** (43, per §6.7.2a / §6.7.9). Object: a retry policy (initial
delay, strategy, factor/increment, cap, jitter mode, max attempts).
Tier: `Core` (§6.5 tiering table) — pure, deterministic, agent-callable.

**Status:** research-complete — no implementation exists yet.

## 1. Demand

- **JTBD:** "Given this retry policy, when does each attempt land, and how
  long could the whole thing take before I give up and alert?" — a pre-flight
  check run before wiring a retry policy into an HTTP client, queue consumer,
  or webhook sender, so the engineer can pick sane numbers instead of guessing
  and finding out in production that attempt #6 fires after their own
  request timeout.
- **Keywords:** retry backoff calculator, exponential backoff calculator,
  retry delay calculator, backoff jitter calculator, retry schedule simulator
- **Pain:** Exponential-backoff formulas are easy to get subtly wrong by hand
  (off-by-one on which attempt is "attempt 0", forgetting the delay cap,
  forgetting that jitter turns a single number into a range not a point,
  forgetting that total wall-clock time is what actually blows a caller's
  own timeout budget — not any single delay). Engineers currently either
  compute this in a scratch script or reach for one of several single-purpose
  calculator sites; none of the three reached exposes the schedule as
  something an agent/CI pipeline can call — human page only, no API, no MCP.

## 2. Competitors (named, reached, captured)

Search phrasings used: "exponential backoff calculator", "retry backoff
calculator", "retry delay simulator". All three below are the sites this
brief's task input named as already-verified independent competitors in the
category; each was independently re-reached and re-captured in this pass.

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| **retries.dev** | https://retries.dev/ | Yes — WebFetch (readable) + screenshot | [`retries-dev.png`](../../research/forge/retry-backoff-schedule/retries-dev.png) |
| **backoff.dev** | https://www.backoff.dev/ | Yes — screenshot captured; WebFetch returned only the loading shell (client-rendered app), page content read from the full-page screenshot instead | [`backoff-dev.png`](../../research/forge/retry-backoff-schedule/backoff-dev.png) |
| **k-lab.dev/retry** | https://k-lab.dev/retry | Yes — screenshot captured; page content read from the full-page screenshot (dark-theme dev-tools suite, retry calculator is one tool among many) | [`k-lab-retry.png`](../../research/forge/retry-backoff-schedule/k-lab-retry.png) |

Two more names were surfaced by the input brief as *not yet reached*:
**exponentialbackoffcalculator.com**, **backoffcalculator.com**, **backoff.so**.
This pass did not attempt them (three reached competitors already give a
consistent, cross-corroborated picture of the category); they stay unreached
and are carried into §11 rather than described.

Capture command used (`.png`, not `.webp` — the capture harness available in
this session rejected a `.webp` output path with `unsupported mime type
"image/webp"`; `.png` is the working format and is what the screenshots above
are):

```bash
node scripts/research-screenshot.mjs "<url>" "docs/research/forge/retry-backoff-schedule/<name>.png"
```

`docs/research/forge/` is gitignored: the captures are local reference
material, this brief is the committed deliverable, and anyone can regenerate
them from the URLs above.

## 3. Feature inventory

**retries.dev** (core strength: the cleanest single-purpose calculator in the
category) —
- Strategies: Exponential, Linear, Fixed (tab-selected).
- Inputs: Initial Delay (ms), Max Retries (labelled "excludes initial
  request" — the tool is explicit about the off-by-one convention), Max Delay
  Cap (ms, optional), Backoff Factor (exponential only), Linear Increment
  (linear only).
- Jitter modes: None (deterministic), Equal (50–100% of computed delay),
  Full (0–100% of computed delay) — offered as a top-level toggle next to the
  strategy tabs, independent of strategy choice.
- Output: three summary numbers (Total Retries, Final Retry Delay, Total
  Cumulative Wait), a chart placeholder area, a Per-Retry/Cumulative toggle
  on the chart, and a full table (Retry #, Delay human-readable, Cumulative
  Delay human-readable).
- Time-unit selector on the table (human-readable vs raw).
- "Explain chart math" collapsible — shows the actual formula being applied,
  not just the result. This is the one feature none of the other two have:
  showing your work.
- Share button that encodes the full config into the URL (no login, no
  backend state).
- GitHub + Privacy links in the footer; privacy copy states the tool is
  client-side/stateless.
- No ads, no signup, no API/export beyond the URL-encoded share link.

**backoff.dev** (core strength: the live formula visualization — three
distinct series plotted, not one) —
- Single strategy: exponential only (page is titled "Exponential Backoff
  Calculator" — no linear/fixed tabs observed).
- Inputs: Base Interval (ms), Exponential Factor, Max Retries, Jitter
  Strategy (dropdown — "Equal Jitter" was the default selected in capture).
- Output: a line chart plotting **three separate series** — Minimum Delay,
  Max Delay, and Simulated Delay — so equal/full jitter's *range* is visible
  as a band, not collapsed into one sampled number. This is the feature
  worth adopting: jitter shown as a bounded envelope, not a single random
  draw that looks falsely precise.
- Table below the chart: Attempt / Min (s) / Max (s) / Simulated (s) /
  Elapsed (s) — elapsed is the running cumulative total, distinct from the
  per-attempt Min/Max band.
- "Export Code" and "Share configuration" buttons.
- Attribution line ("Created by Owen McCadden") — indie single-author tool,
  no company branding, no ads.

**k-lab.dev/retry** (core strength: the widest strategy coverage — the only
one of the three with Fibonacci) —
- One tool inside a larger dark-themed dev-tools suite (sidebar lists ~15
  other tools: JSON formatter, JWT debugger, cron parser, CORS tester, etc.)
  — upsell-by-suite-membership rather than upsell-by-ad.
- Strategies: Exponential, Linear, Fixed, **Fibonacci** (four pill-tabs) plus
  a separate "Copy link" action alongside the strategy tabs.
- Inputs: Multiplier (slider + numeric readout), Base Delay (slider + ms
  field), Max Delay (slider + ms field), Max Attempts (slider + numeric),
  Jitter (dropdown, "None" default).
- Output: a headline sentence ("8 attempts — max total expected wait: 25.5s")
  stated in plain language before any chart or table — the single clearest
  "answer the question first" pattern of the three. Below it, a bar chart
  (one bar per attempt, height = delay) and a two-column table (Delay,
  Cumulative).
- Below the tool: an "About this tool" collapsible and an FAQ accordion
  (What is exponential backoff? / Why use jitter? / Equal vs full jitter? /
  How do I choose retry parameters?) — SEO-oriented long-form content, not
  interactive.
- No ads, no signup; the tool sits inside a broader dev-tools nav shell.

**Cross-competitor read** — table stakes across all three: initial/base
delay input, max retries/attempts input, a per-attempt delay table, a
cumulative-wait figure, and no login/paywall anywhere in the category. Worth
adopting and present on only one each: retries.dev's "show the formula"
transparency panel, backoff.dev's three-series min/max/simulated jitter band
(the only one of the three that visualizes jitter as a *range* rather than
collapsing it to a single sampled point), and k-lab's plain-language headline
answer stated before any chart. Nobody in this category exposes the
computation as an API or MCP tool — every one of the three is a human-only
page; that is the structural gap this tool is built to close (see §9.5).

## 4. Journey maps

**retries.dev** — Arrival: form pre-filled with a sane default policy (not
blank), strategy tab defaulted to Exponential. First touch: change a number
field or switch a tab. Result: table and summary numbers **update live, no
run button** — this is a Configure-then-generate journey, confirmed by
observation, not inferred. Exit: copy from the table, or click Share to get a
URL that reproduces the exact config for a teammate. Large input: Max Retries
is a plain number field with no visible upper clamp observed in this pass —
behaviour at, say, 500 retries was not tested live (would require driving the
form, out of scope for a static-capture pass) and is carried to §11. Error
behaviour: not observed — no invalid-input state was triggered in this pass.

**backoff.dev** — Arrival: same pre-filled-defaults pattern, Exponential-only
(no strategy switch to make). First touch: drag a slider or edit a number
field. Result: chart and table update live. Exit: "Export Code" (produces a
code snippet, contents not confirmed — page copy only) or "Share
configuration" (URL-encoded, per its own privacy copy: "Your calculator
inputs and generated schedules stay in your browser"). The chart being three
plotted series rather than one is the layout's most distinctive trait — jitter
is shown as an envelope around the deterministic line, not resolved to one
number the user has to trust blindly.

**k-lab.dev/retry** — Arrival: lands directly on the tool with a sidebar of
sibling tools always visible (the suite is the persistent chrome, not a
one-off page). First touch: adjust a slider (sliders are the primary control
here, not text fields, though each has a paired numeric field). Result:
headline sentence + bar chart + table update live, no run button — same
Configure-then-generate shape as the other two, corroborating the archetype
choice for the whole category (§8). Exit: "Copy link" replicates config via
URL. Below the fold: static FAQ content, not part of the interactive journey.
Large/malformed input: not observed (would require driving the sliders past
their visible range, out of scope for a static capture).

**Common thread across all three:** none of the three competitors has a run
button — retry-schedule computation is cheap and deterministic, so all three
independently converged on live recompute-on-change. That convergence is
strong evidence for the archetype choice in §8, not just a guess.

## 5. Layout + screenshots

All three are single-column, form-above-output, no sidebar for input/output
(k-lab has a sidebar, but it is site navigation, not part of this tool's own
layout). Options density: retries.dev and backoff.dev keep 4–5 inputs visible
at once, no accordion; k-lab spreads the same handful across sliders with
paired numeric fields, which reads as busier for the same information
content. All three put chart above table, and all three put a jitter control
somewhere near the top-level strategy controls rather than buried in an
"advanced" section — jitter is treated as first-class, not an edge setting.
Above the fold on desktop: retries.dev fits inputs + buttons + chart header
in the first screen; backoff.dev is similar; k-lab's headline sentence is the
first thing above the fold, ahead of the chart. Mobile behaviour: **not
verified — desktop-viewport captures only** in this pass (no `--mobile`
capture was run for any of the three).

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/retry-backoff-schedule/retries-dev.png`
- `docs/research/forge/retry-backoff-schedule/backoff-dev.png`
- `docs/research/forge/retry-backoff-schedule/k-lab-retry.png`

## 6. Their debt

- **No API/agent surface on any of the three** — all human-page-only. An
  agent orchestrating a retry policy today has to either hand-roll the
  arithmetic or scrape one of these pages; none exposes JSON in, JSON out.
- **k-lab bundles the tool inside a 15-tool suite** — not itself a dark
  pattern, but it means the retry tool's own URL is one click deep into
  navigation chrome that has nothing to do with retries; a link straight to
  the answer is cleaner.
- **Jitter is under-explained on two of three** — retries.dev's "Explain
  chart math" panel is the exception; backoff.dev and k-lab show jitter
  numerically without stating the formula, so a user has to trust the number
  or go read the linked blog post.
- **No competitor shows what happens when the retry budget exceeds a
  caller's own timeout** — none surfaces "your total wait exceeds N" as a
  warning; the user has to eyeball the cumulative-wait number and do that
  math themselves. This is a real, verified gap (not inferred): all three
  screenshots stop at showing the number, not judging it.
- None of the three carries ads, signup gates, or upload requirements —
  genuinely clean chrome, worth crediting rather than "去其糟粕"-ing away.

## 7. Domain know-how

1. **"Max retries" excludes the initial request, and this must be stated,
   not assumed** — retries.dev's own field label says so explicitly
   ("Max Retries (excludes initial request)"); a naive implementation that
   silently treats retries as attempts, or vice versa, produces a schedule
   that is off by one attempt from what the caller's own retry library
   actually does. Source: retries.dev's own UI copy, observed directly.
2. **Jitter is a range, not a sampled point, when the goal is planning rather
   than execution** — backoff.dev's three-series chart (Min/Max/Simulated)
   demonstrates this: showing one random draw for "Equal Jitter" gives false
   precision for a *planning* tool, because the whole point of jitter is that
   the real system will not draw that exact number. A planning tool should
   show the bound the real system will fall inside, and may optionally show
   one representative draw, but must not present the draw as the answer.
   Source: our own reasoning, corroborated by backoff.dev's observed design
   choice (a competitor building the same category feature this way is
   evidence, not proof).
3. **Full jitter and equal jitter are genuinely different formulas, not two
   settings of one slider** — full jitter is `random(0, delay)`; equal
   jitter is `delay/2 + random(0, delay/2)`. Confirmed both are offered as
   named, distinct modes on retries.dev (jitter dropdown: None / Equal /
   Full) and referenced as an AWS-architecture-blog-derived pair in k-lab's
   own FAQ copy ("What is the difference between equal and full jitter?").
   Source: both competitors' own UI/FAQ copy, observed directly, not derived
   from an external spec in this pass.
4. **A delay cap changes the shape of the curve, not just its ceiling** —
   once `computed delay > cap`, every subsequent attempt is compressed to the
   cap, so the curve flattens rather than keeps climbing; a schedule display
   that shows raw exponential growth without applying the cap misrepresents
   what the real client will do. Source: cross-referenced against all three
   competitors exposing a max-delay-cap field as a first-class input (not an
   advanced/hidden option) — a shape they all treat as core, corroborating
   its importance.
5. **Cumulative wait, not any single per-attempt delay, is what breaks a
   caller's own request budget** — a caller with a 30s upstream timeout can
   tolerate a policy whose *last* delay is 20s but whose *cumulative* wait
   across all attempts is 90s, only if the caller re-checks after each
   attempt rather than blocking for the whole sequence; either way the
   cumulative number is the one that actually needs judging against an
   external constraint, and all three competitors surface it as a distinct,
   named output (Total Cumulative Wait / Elapsed / cumulative column) rather
   than leaving the user to sum the table by hand. Source: cross-competitor
   convergence, observed directly in all three captures.
6. **"Attempt 1" vs "Retry 1" vs "Attempt 0" is a real labelling hazard** —
   retries.dev's table starts numbering at 0 (an "Attempt" axis running
   0→5 for 5 max retries, i.e. 6 rows including the initial request);
   k-lab's table starts numbering at 1 for "Max Attempts: 8" (8 rows, no
   attempt 0). Both are internally consistent but mean the *same policy
   input* produces differently-numbered tables depending on the tool, which
   is exactly the kind of naive-implementation trap this know-how item
   exists to name. Source: direct comparison of the two captured tables in
   §3/§5 — not inferred, both row-counts were read off the screenshots.

## 8. Chosen archetype

**Configure-then-generate** — the options are the product; the schedule
regenerates as initial delay, strategy, factor/increment, cap, jitter mode,
and max attempts change, with no run button. All three competitors
independently arrived at exactly this shape (§4), which is strong corroborating
evidence rather than a stylistic guess — retry-schedule computation is cheap
and pure enough that a run button would be a pure step tax, but the input
surface (six-plus interacting fields, one of which changes which other fields
are relevant) is too rich for a single-box Instant transform.

- **Instant transform** — no, the input is a multi-field policy, not a single
  paste-able value; there is no one obvious "the input" to transform.
- **Decision wizard** — no, the user already knows their policy shape (they
  came here with specific numbers in mind, e.g. "initial 500ms, factor 2,
  5 retries"); the tool's job is projection, not narrowing an unclear choice.
- **Drop-and-verdict** — no, there is no file; the input is structured policy
  parameters entered directly, not bytes to classify.
- **Two-pane compare** — no single competitor offers side-by-side policy
  comparison, and the JTBD (§1) is "project this one policy," not "which of
  two policies is better" — that would be a legitimate *future* tool
  (compare two configs side by side) but is not what any of the three
  reached competitors ship, and is out of scope for this brief (§9.4).
- **Inspect-and-drill** — no, the output is a flat schedule (attempt →
  delay → cumulative), not a nested structure a user explores by drilling
  into nodes; a table row has no children to expand.
- **Batch queue** — no, there is exactly one policy being projected per run;
  there is no queue of many inputs to process.

## 9. Our design

### 9.1 Journey

1. **Arrival** — page loads with a pre-filled, sane default policy (matching
   all three competitors' pattern of never starting from a blank form):
   initial delay 500ms, strategy exponential, factor 2, max attempts 5, no
   cap, jitter none. The schedule is already rendered on load — nothing to
   click to see a first result.
2. **First touch** — the user edits any field (strategy tab, initial delay,
   factor/increment, cap, jitter mode, max attempts). Every primitive is a DS
   `Input`/`Select` per house rules — no raw `<input>`, no OS `<select>`.
3. **Result** — schedule (table: attempt #, delay, cumulative) and the
   headline sentence recompute live on every keystroke/selection, no run
   button (know-how corroborated by all three competitors, §4/§8).
4. **Exit** — copy the table (as JSON or as a formatted list, both derivable
   from the same `output.schedule` shape in §9.6), or hit the agent contract
   directly (§9.6) — no login, no URL-share dependency required to leave with
   the answer (URL-share is a nice-to-have that could be added later, not a
   requirement — see §9.4).
5. **Empty/default state** — never actually empty; the pre-filled default
   policy *is* the empty state, matching all three competitors and avoiding
   an artificial "click generate" step for a computation this cheap.
6. **Error state** — invalid input (factor ≤ 1 for exponential, negative
   delay, max attempts ≤ 0, cap < initial delay) is caught inline per field
   with a specific message next to that field, not a top-level toast — the
   user should be able to see which number is wrong without losing the rest
   of their configuration.
7. **Large-input path** — max attempts has a hard upper bound (documented in
   §9.6) past which the tool refuses to render an unbounded table; none of
   the three competitors documented this behaviour (§11), so this is new
   ground, not a copied pattern — the bound exists because an unbounded
   table is both a bad UI and a way to make the agent-facing endpoint do
   unbounded work.

### 9.2 Layout

Single column, no sidebar, no borders — sections separated by spacing and a
tonal background shift per house rules. Above the fold: strategy selector
(tabs, not a dropdown — matches all three competitors, and a tab makes the
active strategy visually obvious without a click), the input fields for the
active strategy only (factor for exponential, increment for linear, nothing
extra for fixed — hiding irrelevant fields rather than graying them out,
which none of the three competitors do well: all three show every field for
every strategy, including fields the current strategy ignores), jitter mode
selector, and max-attempts/cap fields. Below that: the plain-language
headline sentence (adopted from k-lab, §3/§6 — "answer the question before
the chart"), then the schedule table with a per-attempt/cumulative column
pair (adopted from backoff.dev's Elapsed-as-a-distinct-column pattern), and
where jitter is not "none," a min/expected/max triple per row rather than a
single sampled number (adopted from backoff.dev's three-series pattern,
know-how #2). No chart in v1 — see §9.4. Mobile: fields stack to one column;
the table gets a horizontal scroll container per house responsive rules
rather than being hidden or truncated.

### 9.3 Must-have

- **Three strategies: exponential, linear, fixed** — parity (all three
  competitors ship at least these three).
- **Jitter modes: none, equal, full** — parity (retries.dev and k-lab both
  name these two named modes explicitly; know-how #3).
- **Max delay cap, applied to the actual computed schedule (know-how #4)** —
  parity.
- **Per-attempt delay + cumulative wait table** — parity (table stakes
  across all three, §3).
- **Explicit "excludes/includes initial request" labelling on the attempt
  count field (know-how #1)** — parity, but stated as a rule here because two
  of three competitors get the labelling right and this brief is explicit
  about which convention we chose and why, rather than silently picking one.
- **Jitter shown as a min/expected/max range, not a single sampled draw
  (know-how #2)** — edge (only backoff.dev does this; the other two don't).
- **A cumulative-wait-vs-declared-timeout warning line** (user can optionally
  enter "my own timeout is Nms" and get a plain-language flag if the
  schedule would exceed it before the last attempt) — edge (no competitor
  reached does this, §6).
- **Machine contract (OpenAPI + MCP) returning the identical schedule the
  human page renders** — edge (no competitor reached has any API surface at
  all, §3/§6 — this is the single largest structural gap in the category).

### 9.4 Deliberately skipped

- **Fibonacci strategy** — k-lab ships it; we skip it for v1 because it is
  a real but rarer strategy (only 1 of 3 reached competitors has it) and
  adding a fourth strategy family multiplies the input-field conditional
  logic in §9.2 for a strategy this brief did not verify meaningful
  developer demand for beyond one competitor's inclusion. Revisit if usage
  data or a support request shows real want for it.
- **"Export Code" / code-snippet generation** (backoff.dev has this) —
  skipped because the machine contract (§9.6) already gives an agent or a
  script the exact numbers programmatically; a language-specific code
  snippet is a nice-to-have layered on top of the same JSON, not a
  structural requirement, and generating idiomatic retry code per language
  correctly is its own scoped effort this brief is not taking on silently.
- **URL-encoded share links** (all three competitors have this) — skipped
  for v1 not because it is bad (it isn't — it's genuinely useful, ad-free,
  login-free) but because it duplicates what the OpenAPI/MCP contract
  already gives a caller for free: the full policy as a JSON payload is
  itself shareable. Revisit if human-page usage data shows people want a
  one-click link specifically (a different need from "give me the JSON").
- **A rendered chart in v1** — skipped, not because charts are wrong (all
  three competitors have one and it is a genuinely useful way to see the
  curve shape at a glance), but because the table + headline sentence
  already answer the JTBD (§1) precisely, and a chart is additive polish
  best added once the tool has the table/contract right — flagged here so
  it does not silently get treated as "already covered" by the table.
- **Bundling into a larger dev-tools suite navigation** (k-lab's pattern) —
  skipped structurally: Forge's own tool-station navigation is the shared
  chrome across all 148 blades, so this tool does not need or want its own
  competing sidebar.

### 9.5 Differentiator

Checked against §3 and §6, not asserted:

- **No competitor reached has an OpenAPI operation or an MCP tool for this
  computation at all** (§3, §6) — every one of the three is human-page-only.
  A CI pipeline or an agent planning a retry policy today has to either
  scrape one of these pages or hand-roll the exponential-backoff arithmetic
  itself (a small but real chance to get know-how #1/#3/#4 wrong, per §7).
  This tool ships the identical computation as a pure, callable contract
  (§9.6) — the single structural edge this category is missing.
- **Jitter shown as a bounded range rather than one sampled draw is table
  stakes on 1 of 3, not something everyone does** — we adopt it as a
  must-have (§9.3) rather than a differentiator, since one real competitor
  already ships it; claiming it as ours alone would be an overclaim.
- **The cumulative-wait-vs-declared-timeout warning (§9.3) is genuinely new**
  — none of the three reached competitors surfaces this judgment; it directly
  answers the pain named in §1 ("finding out in production that attempt #6
  fires after their own request timeout") that none of the three closes.

### 9.6 I/O contract

```text
input: {
  strategy: "exponential" | "linear" | "fixed",
  initialDelayMs: number,          // > 0
  factor?: number,                 // exponential only, > 1
  incrementMs?: number,            // linear only, >= 0
  maxDelayMs?: number,             // optional cap, >= initialDelayMs
  maxAttempts: number,             // 1..100 (hard upper bound — §9.1 step 7)
  attemptsExcludeInitialRequest: boolean,  // default true, per know-how #1
  jitter: "none" | "equal" | "full",
  callerTimeoutMs?: number         // optional, powers the §9.3 warning
}
output: {
  schedule: Array<{
    attempt: number,               // numbering respects attemptsExcludeInitialRequest
    delayMs: { min: number, expected: number, max: number },
    cumulativeMs: { min: number, expected: number, max: number }
  }>,
  totalAttempts: number,
  finalDelayMs: { min: number, expected: number, max: number },
  totalCumulativeWaitMs: { min: number, expected: number, max: number },
  exceedsCallerTimeout: boolean | null   // null when callerTimeoutMs not supplied
}
sideEffect: pure
meterId: forge.simulator.retry-backoff-schedule
roots:   [Simulator]
objects: [retry-policy]
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — design only (§9.1/§9.2) |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — sketch only (§9.6) |
| 3 | MCP tool registration (Agent-eligible tools) | Not started |
| 4 | SKILL.md (what / when / how / limits) | Not started |
| 5 | Meter id + wallet hooks | Not started — meter id named (§9.6), not wired |
| 6 | Side-effect class declared | **Met** — `pure` (§9.6) |
| 7 | Stable error codes; `request_id` on server paths | Not started |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — likely client-computable (no upload), not yet written |
| 9 | Decl/ads: intent title, unique value, related tools | Not started |
| 10 | Decl engine metadata: upstream SOTA name + version | Not applicable — no upstream model/engine, pure arithmetic |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 |

Not started — research-only brief.

## 11. Gaps and open questions

- [ ] **Not reached:** exponentialbackoffcalculator.com, backoffcalculator.com,
      backoff.so — named in the input brief as corroborating the category's
      demand but not visited in this pass. No feature, layout, or journey
      claim is made about any of them anywhere above.
- [ ] **backoff.dev and k-lab.dev/retry page content is read from static
      screenshots, not live-driven WebFetch** — WebFetch returned only a
      loading shell for backoff.dev (client-rendered app) and page-source
      copy without interactive detail for k-lab; every feature claim about
      these two is sourced from what is visible in the captured screenshot,
      stated as such in §3/§4, not from marketing copy.
- [ ] **Large-input and malformed-input behaviour was not observed on any of
      the three competitors** — no form was actually driven with extreme or
      invalid values in this pass (static capture + one live WebFetch only);
      §4 says this plainly per competitor rather than guessing. Our own
      large-input behaviour (max-attempts hard bound) is a new design
      decision (§9.1 step 7), not a copied pattern.
- [ ] **backoff.dev's "Export Code" contents were not confirmed** — the
      button exists (§3) but its output was not inspected; deliberately
      skipped in our design anyway (§9.4), so this gap does not block
      anything.
- [ ] **Mobile layout on all three competitors is unverified** — desktop
      viewport only (§5); our own mobile behaviour is specified in §9.2 by
      house rule (stack + scroll container) rather than by copying an
      unobserved competitor pattern.
- [ ] **Fibonacci strategy is deferred, not designed** — one competitor
      (k-lab) has it; §9.4 names the trigger (usage data or support request)
      that would reopen it.
- [ ] **URL-share and chart are deferred with stated triggers** — §9.4.
- [ ] The pain named in §1 ("finding out in production that attempt #6 fires
      after their own request timeout") is answered by §9.3's
      cumulative-wait-vs-callerTimeout warning and §9.6's
      `exceedsCallerTimeout` field — no unanswered pain from §1 remains.
