# Tool brief: language-detect

Root: **Detector (27)** — empty root, priority 2 per §6.7.9 (developer-frequency
pre-pipeline gate; candidate set explicitly names "language detect"). Object:
Text/Dev. Side effect: `pure`.

## 0. Correction to the input landscape survey (read first)

The landscape survey named **"GetItFully Code Language Detector"**
(`https://getitfully.com/giftools/code-language-detector`) as the top-ranking,
closest-journey-match competitor. That claim does not survive verification:

- `https://getitfully.com/giftools/code-language-detector` returns a real HTTP
  404 (confirmed twice, via WebFetch and via a headless-browser screenshot
  capture — not a JS-rendering artifact).
- `https://getitfully.com/giftools` (the presumed index) also 404s.
- The site's actual root (`https://getitfully.com`, HTTP 200, captured at
  [getitfully-root.png](../../research/forge/language-detect/getitfully-root.png))
  is a Sarkari-Result / Indian government-job-postings portal ("Sarkari
  Result, Government Jobs, Admit Card, Exam Results") that lists a handful of
  unrelated developer utilities (CSS/XML/JSON/JS formatter, word counter, age
  calculator) — **no code-language-detector tool exists on this domain today.**
- A web search still surfaces a page titled "Free Code Language Detector
  Online... 50+ Languages Supported" at that exact URL, and cached/AI-search
  summaries describe specific features (three input modes, a 26-language
  list, "no ads, no registration"). Per the anti-fabrication rule, those
  summaries are **not accepted as verified** — they describe a page that does
  not currently resolve. The tool likely existed and was taken down, moved,
  or the domain changed hands (it now serves an unrelated content vertical).

**Verdict: this competitor is dropped.** It is not used anywhere below for
journey/layout/feature claims. Everything attributed to it in this brief is
limited to this correction note. Two real, reached web competitors
(CreativeTechGuy Code Detector and CodePal) are substituted in its place —
see §2.

## 1. Demand

- **JTBD:** "I have a code snippet with no filename/extension — pasted from a
  chat log, a Stack Overflow answer, an email, a support ticket, or OCR'd
  from a screenshot — and I need to know what language it is before I can
  syntax-highlight it, route it to a linter/formatter, or file it correctly."
  Also: "I have a mixed-language dump (e.g. a multi-file paste) and want each
  block identified."
- **Keywords:** programming language detector, detect code language online,
  identify programming language from code, what language is this code,
  代码语言识别, code snippet language identifier.
- **Pain:** short, syntactically ambiguous snippets (e.g. a JSON object could
  be JS; a C-style `{}` block could be C, C++, Java, C#, or JS); files/snippets
  that mix languages (HTML with embedded CSS/JS, Vue SFCs); naive keyword
  matchers giving false-confident wrong answers on snippets under ~10 lines.

## 2. Competitors (named, reached, captured)

Verified by direct visit (WebFetch + screenshot) unless noted.

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| OneCompiler AI Language Detector | https://onecompiler.com/ai/language-detector | Yes | [onecompiler.png](../../research/forge/language-detect/onecompiler.png) |
| Apify Programming Language Detector actor | https://apify.com/maged120/programming-language-detector | Yes | [apify.png](../../research/forge/language-detect/apify.png) |
| GitHub Linguist | https://github.com/github-linguist/linguist | Yes | [github-linguist.png](../../research/forge/language-detect/github-linguist.png) |
| lang-detector (npm / GitHub source) | https://www.npmjs.com/package/lang-detector (npm page 403'd both via WebFetch and screenshot; verified instead via its GitHub source) → https://github.com/ts95/lang-detector | Yes (GitHub, not npm directly) | [lang-detector-github.png](../../research/forge/language-detect/lang-detector-github.png) |
| CreativeTechGuy Code Detector & Formatter (substitute, found live) | https://creativetechguy.com/utilities/codedetector | Yes | [creativetechguy.png](../../research/forge/language-detect/creativetechguy.png) |
| CodePal Language Detector (substitute, found live) | https://codepal.ai/language-detector | Yes | [codepal.png](../../research/forge/language-detect/codepal.png) |
| ~~GetItFully Code Language Detector~~ | ~~https://getitfully.com/giftools/code-language-detector~~ | **No — dropped, see §0** | n/a (page 404s; only the unrelated live root was captured) |

Domain-know-how-only references (real projects, not web tools — no page to
screenshot; used for §7 only):

| Project | URL | Reached | Note |
|---|---|---|---|
| guesslang | https://github.com/yoeo/guesslang | Yes | TensorFlow CNN classifier, 54 languages, >90% claimed accuracy; **VS Code's paste-detection feature is built on this model** (via its TF.js port, `microsoft/vscode-languagedetection`) — real production validation of the ML approach for this exact "no filename" scenario |
| highlight.js auto-detection | (engine behind CreativeTechGuy's tool, per its own "Powered by highlight.js" credit) | Indirect | Widely embedded syntax-highlighter with a built-in relevance-scoring auto-detect mode; this is the "already a wheel, don't hand-roll" engine class for the no-filename case |

## 3. Feature inventory

**OneCompiler AI Language Detector** (branded "AI", inside a larger online-IDE
product):
- Single textarea labeled "Code*" + one "Generate" button — button-triggered,
  not live.
- Output: primary language, an explicit **confidence level**, "key syntax
  indicators" explaining the match, plus framework/library detection and
  version hints when applicable — the richest explanation surface of any
  competitor reached.
- Claims 50+ languages across web/backend/systems/mobile/data-analysis/
  scripting categories.
- No ads/upsell/API mentioned on the page itself; it lives inside OneCompiler's
  broader "AI Tools" section (Pricing/Learn/Code/Deploy nav), so the tool is a
  funnel into the IDE product, not a standalone destination.
- Core strength = explanation depth (why it thinks so, not just what).
  Framing risk = it is explicitly LLM-backed ("AI Programming Language
  Detector"), which this design doc's pure-first doctrine (§6.7.8) would
  reject for a Core deterministic tool — noted, not copied.

**Apify Programming Language Detector actor** (paid, API-first):
- Not a free web page — an Apify Actor with an input schema of
  `sourceCode` (string) or `fileUrl` (string), and an output schema of
  `detectedLanguage`, `confidence` (0–1), `alternatives` (array of
  lower-confidence candidates), `id` (correlation key).
- Pricing: pay-per-result, from $10.00/1,000 results (~$0.01–0.10 per 100
  snippets). Invocable via Apify web console, REST API, JS/Python client
  libraries, CLI, or an MCP server.
- Core strength = it is built agent/pipeline-first from day one — exactly the
  shape §6.5 asks every Core tool to have (schema I/O, alternatives array,
  MCP-reachable) — but gated behind a paid, third-party metering wall rather
  than a free instant human page. No upsell padding to speak of; it does one
  thing.

**GitHub Linguist** (the reference implementation, Ruby library, not a
product page):
- 13.6k stars / 5.3k forks per the repo itself. Not primarily "content
  detection" — it is built to color a repository's language bars from a
  **file tree**, so filename/extension/shebang are load-bearing signals it
  has and we (detecting a bare pasted snippet) do not.
- Five-stage strategy, in order: filename-based (`Gemfile`, `Dockerfile`) →
  extension mapping → shebang parsing → heuristics (regex/content pattern
  rules per ambiguous extension, in `heuristics.yml`) → Bayesian classifier
  as final fallback when the above are inconclusive.
- `.gitattributes` override mechanism lets a repo owner confirm or override
  the automatic call — an escape hatch worth mirroring conceptually (a
  "correct this" affordance) even though we have no repo-level config file
  to hook into.
- Explicitly suppresses vendored/generated/binary files from detection —
  not applicable to a single-snippet tool, but the general principle
  ("don't classify noise") maps to our "this doesn't look like code" state.

**lang-detector (ts95, npm/GitHub)**:
- Single function `detectLang(snippet, options)`, options `heuristic`
  (perf toggle, default true) and `statistics` (return per-language score
  breakdown, default false).
- Detects exactly **10** languages: JavaScript, C, C++, Python, Java, HTML,
  CSS, Ruby, Go, PHP (+ "Unknown"). 59 stars / 12 forks — small, narrow.
- The README itself states the honest scope: **"a fallback solution"** to use
  "if you don't have anything else to go by" (i.e., no filename/extension
  available) — this is the precise scenario our tool targets, stated by a
  library author, not inferred by us.
- No web page/UI — pure library, so no journey/layout to capture; feeds §7
  domain know-how only.

**CreativeTechGuy Code Detector & Formatter** (substitute, real/live):
- Textarea + a "Common Languages Only" checkbox + two unlabeled "Option 1" /
  "Option 2" dropdowns (function not decipherable from content alone — noted
  as unclear rather than guessed) + a "Detect Code" button — button-triggered,
  not live.
- Explicitly credited as **"Powered by highlight.js"** — i.e., it wraps
  highlight.js's built-in auto-detect (relevance-scoring across its bundled
  grammars) rather than a bespoke classifier. Also functions as a formatter/
  syntax highlighter after detection, not just a verdict.
- No confidence score surfaced, no ads, no API mentioned. Single independent
  developer's personal-site utility page (footer-attributed to "Jason
  O'Neill") — low production polish, but real and reachable.

**CodePal Language Detector**:
- Sits inside CodePal's broader AI-generator product (nav shows "Create App",
  "Create Something Amazing", other generators) — same funnel pattern as
  OneCompiler.
- Output: language name + a **three-tier confidence label** (High / Medium /
  Low, not a numeric score) with an explicit **rule for each tier**: High =
  "several language-specific constructs agree"; Medium = "the snippet is
  valid in multiple related languages"; Low = "the sample is mostly data,
  pseudocode, or common expression syntax." This tier-definition language is
  unusually precise for a marketing page and is a genuinely useful framing to
  borrow (see §7).
- Alternative candidates shown "when ambiguity is meaningful" (i.e., withheld
  when there is nothing genuinely close — a deliberate anti-clutter choice).

## 4. Journey maps

**OneCompiler:** land on page → paste into the single "Code*" textarea →
press "Generate" → output panel switches from "Output will appear here" to
the result block (language + confidence + syntax indicators + framework/
version hints) → no visible copy/download affordance in the content reached;
no error-state or large-input behavior observable from the fetch.

**Apify actor:** not a page journey at all — a caller submits `{ sourceCode }`
or `{ fileUrl }` via API/CLI/console → gets back
`{ detectedLanguage, confidence, alternatives, id }` as JSON, or downloads a
dataset (JSON/CSV/HTML/Excel) if run via the web console test harness. This
is the pure agent-shaped journey with no human "look at a result card" step
at all.

**CreativeTechGuy:** land on page → paste code into the textarea → optionally
toggle "Common Languages Only" and the two unlabeled options → press "Detect
Code" → the tool both identifies and syntax-highlights/formats the snippet
(dual-purpose: detector + formatter in one). No confidence indicator, no
button-free live mode.

**CodePal:** land on page (inside a broader AI-tool-generator site) → paste
or type a snippet in an input area → submit → get language + High/Medium/Low
confidence label + an explanation of which signals fired + alternates shown
only when genuinely ambiguous. No copy/download button described in the
content reached.

**GitHub Linguist / lang-detector:** no human journey — invoked as a build
step (`git diff --stat`-style language bars) or a library call
(`detectLang(snippet)`) respectively. Their "journey" is a function signature,
not a page.

## 5. Layout + screenshots

- **OneCompiler:** single-column form — header nav, then Code* textarea,
  Generate button directly beneath it, output section beneath that, followed
  by marketing copy (feature descriptions, "how it works," technical
  detection-methodology blurb) below the fold. Options density: zero (no
  configuration, just paste + button).
- **Apify:** not a form-first layout — an Actor detail page (README-style:
  description → pricing table → input/output schema tabs → "Try for free"
  console). The "layout" that matters for our purposes is the schema
  documentation block, not visual arrangement.
- **CreativeTechGuy:** compact single-screen utility — title, one-line
  instructions, textarea, one checkbox + two dropdowns directly under it,
  "Detect Code" button, a horizontal divider, then a footer credit line. No
  ads, no marketing filler — the whole page is the tool. This is the leanest
  layout of everything reached.
- **CodePal:** the tool sits below a header strip of unrelated recent
  CodePal project cards ("Create App," "Tic Tac Toe Game," etc.) — meaning a
  first-time visitor sees other people's generated apps before the actual
  detector input, a mild distraction/upsell-into-the-platform pattern.
- Mobile behaviour: not verifiable from static fetch/screenshot for any
  competitor; not claimed here.

## 6. Their debt

- **OneCompiler / CodePal** both frame this as an "AI" call (LLM-backed) for
  a task that is actually cheaply deterministic at the accuracy level users
  need — slower, non-reproducible, and costs the operator a model call for
  every paste, when a classifier/heuristic table would answer in
  milliseconds for free. Both also embed the tool inside a much larger
  product funnel (IDE / app-generator) rather than serving it as a clean
  destination.
- **Apify actor** is the only one with a real machine contract, but it is
  paywalled per-call ($10/1,000 minimum) for what should be a near-zero-cost
  operation — a real business exists on this exact capability's Agent/API
  side, evidence the Agent-eligible framing (§6.7.2, "Detector... strong
  pipeline value as a pre-flight gate") is correct, but the current market
  price for it is needlessly high.
- **CreativeTechGuy** has no confidence score at all — a single guess with no
  visibility into how sure the tool is, and two unlabeled "Option 1"/
  "Option 2" dropdowns that are actively confusing UX (unclear affordance).
- **None of the reached competitors expose OpenAPI/MCP** except the paid
  Apify actor — every free option is a human-only page, exactly the gap
  §6.7.5 requires us to close, and the one competitor that *does* have a
  machine contract charges for it.
- **GitHub Linguist / lang-detector** are not products at all — no UI debt,
  but also no page anyone can "come to" for a one-off paste; they only help
  someone who is already writing code.

## 7. Domain know-how

1. **A bare snippet has strictly less signal than a file, and the tool must
   not pretend otherwise.** Linguist's 5-stage pipeline (filename → extension
   → shebang → heuristics → Bayesian fallback) works well *because* the first
   three stages usually resolve it before content-only classification is
   needed. A pasted snippet with no filename skips straight to the weakest,
   most ambiguous stage — content-only classification — which is exactly why
   `lang-detector`'s own author calls content-only detection "a fallback
   solution... if you don't have anything else to go by." Our tool must
   accept an optional filename/extension hint and use it as a hard prior
   when present, not just as decoration.
2. **Extension-collision disambiguation needs per-extension rule tables, not
   one generic classifier.** Linguist's `heuristics.yml` resolves `.h`
   (Objective-C `@interface`/`#import` vs. C++ `template`/STL `#include` vs.
   C as default), `.m` (Objective-C vs. Mercury `:- module` vs. MATLAB `%`
   comments vs. Wolfram `(* *)`), `.fs` (Forth `^: ` vs. F# `module`/`open`
   vs. GLSL `#version`/`uniform`), and `.pl` (Prolog `:-` rules vs. Perl
   `use strict`/`package` vs. Raku `use v6`) with distinct, ordered
   content-pattern checks per extension — not a single content model voting
   across all languages equally. When we *do* get a filename hint, route
   ambiguous extensions through their own rule set before falling back to
   the general classifier.
3. **Short/generic snippets should report low confidence honestly, not a
   confident wrong guess.** CodePal's own stated tier definitions are the
   clearest public articulation of this found anywhere in this research:
   High = multiple language-specific constructs agree; Medium = the snippet
   is syntactically valid in more than one related language (e.g. a bare
   `{ "a": 1 }` is valid JSON *and* a JS object literal *and* legal in many
   C-family languages as a block); Low = the sample is mostly data,
   pseudocode, or generic expression syntax with no language-specific
   keywords at all. This three-tier framing — not a single numeric score
   pretending to more precision than the signal supports — is worth adopting
   directly, alongside a numeric score for agents that want to threshold
   programmatically.
4. **JSON/YAML/plain-data blocks are a distinct "not really a programming
   language" case and must be named as such**, not forced into the nearest
   real language. `{ "key": "value" }` is not "detected as JavaScit looks
   like an object literal" — report it as JSON (a data format) directly,
   the same way Linguist and guesslang both carry JSON/YAML as first-class
   detectable categories rather than folding them into JS.
5. **Multi-language files are common and a single-verdict answer is wrong
   for them.** Vue SFCs, HTML with embedded `<script>`/`<style>`, Markdown
   with fenced code blocks, and Jupyter-notebook-pasted cells all legitimately
   contain more than one language in one paste. None of the six competitors
   reached handle this (all return one verdict for the whole input) — a
   segment-aware mode (detect per fenced/tagged block, return an array) is a
   real gap, not just a nice-to-have, given how often "paste from a
   Markdown doc" is the actual user action.
6. **Statistical/ML classifiers are the correct engine class for the
   no-filename case — do not hand-roll a keyword scorer.** Per house rule
   (手搓禁止), the right building block is a classifier in the guesslang /
   highlight.js-auto-detect family (both real, both already used in
   production — guesslang's TF.js port ships inside VS Code's own
   paste-detection feature; highlight.js's relevance-scoring auto-detect
   ships inside CreativeTechGuy's tool and thousands of other sites), not a
   bespoke regex/keyword point-scoring table like `lang-detector`'s 10-language
   heuristic, which the tool's own scope (10 languages, explicitly a
   "fallback") shows is not built to scale past a narrow set.
7. **A detector answers "what language," never "is this good code" or "is
   this AI-written."** Scope discipline: search results surfaced
   `aicodedetector.org` (AI-vs-human code detection) as an adjacent but
   distinct tool category — do not let language detection drift into that
   territory; it is a different root/product entirely.

## 8. Chosen archetype

**Instant transform** (live, no run button) as the primary mode, with a
**drop-and-verdict** framing for the result card itself (one clear primary
answer, ranked alternates and per-signal explanation available on demand,
not forced onto the user).

Why not the others:
- *Configure-then-generate* — wrong: there is nothing to regenerate from
  options; the snippet is a given, not a set of knobs.
- *Decision wizard* — wrong: the user already has a concrete snippet in
  hand and wants a verdict on it, not a guided narrowing between abstract
  choices.
- *Two-pane compare* — wrong for the Core case (one snippet in). A future
  "detect each block in this multi-language paste" variant (per §7 point 5)
  could reuse an inspect-and-drill shape for its per-block breakdown, but
  that is an extension, not the base tool.
- *Inspect-and-drill* — closest runner-up, since the "why" explanation
  (matched signals, alternates) is genuinely a structure to explore. Rejected
  as the *primary* archetype because the headline answer (the language name)
  is a single fact delivered instantly, not a tree the user must navigate to
  reach a conclusion — the drill-down is secondary detail on an
  already-delivered verdict, which is exactly what drop-and-verdict describes.
- *Batch queue* — wrong for Core; single-snippet classification is
  sub-100ms once the model/heuristic is loaded. A future "detect language of
  every file in this zip" bulk mode belongs on the J surface later, out of
  scope here.
- Plain *form + button* — rejected on the same evidence as the encoding-detect
  brief: every "button-triggered" competitor reached here (OneCompiler,
  CreativeTechGuy, CodePal) is paying a step tax for a computation cheap
  enough to run on every keystroke; nothing in this domain requires a
  submit step once the engine is client-side and fast.

## 9. Our design

### 9.1 Journey

1. Land on page: a single paste `Textarea` (primary, above the fold) is the
   dominant element. A collapsed, optional "Add a filename or extension
   (optional — improves accuracy for ambiguous cases)" `Input` sits directly
   beneath it — not a required field, matching "instant use" (§6.5 gate 1),
   but present because §7 point 1 shows a filename hint materially improves
   accuracy on genuinely ambiguous extensions (`.h`, `.m`, `.pl`, `.fs`-class
   cases).
2. As soon as text lands (on `input`/`paste`, debounced ~150ms), the result
   card populates live — no button, matching the instant-transform archetype.
   Detection re-runs on every edit, not just once.
3. **Result card** (always visible, skeleton state before input):
   - Primary verdict: language name + a **three-tier confidence label**
     (High / Medium / Low, CodePal's framing) shown prominently, **plus** a
     0–100 numeric score alongside it for agents/CI scripts that want to
     threshold programmatically (neither competitor gave both; we do).
   - "Why" line: which signals fired (keywords, syntax markers, or "matched
     via statistical model" when no single rule dominates) — OneCompiler's
     explanation depth, without requiring a button press to see it.
   - Ranked alternates, shown **only when genuinely ambiguous** (CodePal's
     anti-clutter rule) — hidden entirely, not shown-but-empty, when the top
     match is High confidence.
   - Explicit **"this looks like a data format, not a programming
     language"** state for JSON/YAML/plain-data input (§7 point 4) — never
     silently mapped onto JS/YAML-as-a-"language" without saying so.
4. **Output actions:** Copy result as text, Copy as JSON (agent-consumable
   payload — matching the encoding-detect brief's precedent and something
   none of the six competitors reached offer as a first-class export).
5. **Error / edge states:** empty input → skeleton dashes, no error styling.
   Extremely short/generic input (e.g. `x = 1`) → Low confidence label shown
   plainly, never a confident wrong guess (§7 point 3). Multi-language input
   detected (fenced code blocks, `<script>`/`<style>` tags, Vue SFC markers)
   → a visible note ("this paste appears to contain multiple languages — showing the dominant one; per-block detection is on the roadmap") rather than silently picking one block and ignoring the rest.
6. **Compose-next:** once a language is confirmed, surface a link to the
   matching Formatter/Beautify tool for that language when one exists in the
   registry (`compose.next` edge) — mirrors the encoding-detect brief's
   "detect stays read-only, the next verb is one click away" pattern.

### 9.2 Layout

- Above the fold: paste textarea (full-width, dominant) with the optional
  filename hint directly beneath it, and the always-visible result skeleton
  directly beneath both — no scrolling needed to see that a verdict exists
  before typing anything (mirrors encoding-detect's proven pattern).
- Options density: effectively zero required options — the filename hint is
  the only optional field, collapsed/de-emphasized so it doesn't compete
  visually with the primary textarea, honoring "instant use" (§6.5 gate 1).
- Mobile: single-column stack — textarea, then the collapsed filename hint,
  then the result card; no tabs, no multi-panel layout to break down on
  narrow viewports (none of the six competitors' mobile behavior was
  verifiable either, so this is a default-safe choice, not a copied
  pattern).

### 9.3 Must-have

*without these, users bounce back to a competitor*

- Live, no-button detection on paste (none of OneCompiler/CreativeTechGuy/
  CodePal offer this — all three require a click).
- Honest low-confidence reporting on short/ambiguous input, never a
  confident wrong guess (CreativeTechGuy's gap: no confidence signal at
  all; a naive keyword matcher's classic failure mode).
- JSON/YAML/data-format called out explicitly, not folded into a
  "language" (gap in every competitor reached).
- JSON copy/output for agent consumption (none of the free competitors
  offer this at all; only the paid Apify actor has a machine contract).
- Optional filename/extension hint that measurably changes the outcome on
  ambiguous-extension cases (unique to us among everything reached).

### 9.4 Deliberately skipped

- LLM/"AI"-branded detection as the primary engine — OneCompiler and
  CodePal both frame this as an AI call; we keep it `pure` per §6.7.8's
  pure-first doctrine. A future Router-backed "explain this code" companion
  tool is a separate, explicitly `external` capability, never blended into
  this one's schema or marketing.
- Per-block multi-language detection as a v1 feature — flagged as detected
  (§7 point 5, "warning" field) but not fully solved in the first ship; a
  real per-segment breakdown is future work, not something to fake with a
  single-verdict tool pretending it handles multi-language input.
- Bulk/zip-file batch detection — belongs on the J surface later (§6.7.9
  Processor root), out of scope for this Core synchronous tool.
- The unlabeled "Option 1"/"Option 2" pattern CreativeTechGuy ships — if we
  cannot articulate what a control does in one line, it does not ship.

### 9.5 Differentiator

**Our differentiator:** every field in the JSON output above is available via
OpenAPI + MCP with the exact same schema the human page shows — the only
competitor reached with a real machine contract (Apify) charges per call
($10+/1,000); ours is a free-tier Forge meter. Live, button-free detection
where every free web competitor reached requires a click. Honest tri-level
confidence *and* a numeric score together (CodePal has the label, Apify has
the number, nobody reached has both). An explicit "this is a data format,
not a language" branch and an explicit "multi-language paste suspected"
branch — both silently mishandled by all six competitors reached.

### 9.6 I/O contract

*for the implementer*

```
input:  { code: string, filenameHint?: string }
output: {
  primary: { language: string, confidenceLabel: "high" | "medium" | "low", confidenceScore: number /* 0-100 */ },
  isDataFormat: boolean,           // true for JSON/YAML/plain-data-shaped input
  signals: string[],               // short human-readable reasons ("matched `@interface`", "statistical model")
  alternates: Array<{ language: string, confidenceScore: number }>,  // omitted/empty when primary is "high"
  multiLanguageSuspected: boolean, // true when fenced blocks / <script>+<style> / SFC markers detected
  warning?: string                 // e.g. "input too short for reliable detection"
}
```
Side effect: `pure`. Engine: wrap an existing statistical/ML classifier in
the guesslang (or a maintained TS/JS-native equivalent, e.g. a
`vscode-languagedetection`-class model) or highlight.js-auto-detect family
for the content-only path, per 手搓禁止 — do not hand-roll a keyword/regex
scorer; layer a small Linguist-style extension/filename-hint rule table on
top for the case where `filenameHint` is supplied and lands on a known
ambiguous extension.

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

**Note on the input landscape survey:** §0 above documents that one of the
five originally-assigned competitors (GetItFully) does not exist at the
given URL and was dropped rather than described from unverifiable search
summaries. Two live substitutes (CreativeTechGuy, CodePal) were found and
verified in its place, keeping the total at six real, reached sources plus
two real non-web domain-know-how sources (guesslang, highlight.js).

## 11. Gaps and open questions

- [ ] **GetItFully is dropped, not resolved** (§0). Search results still
      describe a page at that URL with specific features; the URL 404s and the
      domain now serves an unrelated vertical. Whether the tool moved, was
      taken down, or the search index is stale is unknown — and the ranking
      signal that made it "top-ranking" in the landscape survey is therefore
      unexplained.
- [ ] **The npm page for `lang-detector` 403'd** on both WebFetch and
      screenshot (§2); it was verified via its GitHub source instead, so no
      download/popularity figure from npm is cited anywhere in this brief.
- [ ] **No competitor was exercised with a real code paste.** Detection
      quality, confidence display and multi-language behaviour (§3, §4) are
      described from page copy, not observed output — which matters more here
      than for most tools, because detection *accuracy* is the whole product
      and none of it was measured.
- [ ] **Our own accuracy target is unstated.** The brief argues for
      highlight.js/guesslang-class heuristics but sets no accuracy bar, no
      test corpus, and no per-language coverage list. A detector that ships
      without a measured baseline cannot honestly claim parity, let alone an
      edge.
- [ ] **The multi-language / mixed-paste case is acknowledged and not
      solved** (§9.3, "warning" field) — the first ship reports a single
      language plus a warning; the real behaviour for an HTML file with
      embedded CSS and JS is undecided.
- [ ] **Mobile behaviour unverified** for the reached web competitors
      (desktop captures only).
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in this brief.
