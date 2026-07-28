# Tool brief: encoding-detect

Root: **Detector (27)** — empty root, priority 2 per §6.7.9 (developer-frequency
pre-pipeline gate). Object: Text/Data. Side effect: `pure`.

## 1. Demand

- **JTBD:** "I have a text/CSV/log file and don't know its charset, whether it
  has a BOM, or what its line endings are — before I feed it into another tool
  or a build pipeline." Also: "this text renders as mojibake, what encoding is
  it actually in?"
- **Keywords:** text encoding detector, character encoding checker, 文件编码检测,
  BOM detector, charset detect online, 编码识别
- **Pain:** legacy CJK files (GBK/GB18030/Big5) misdetected as UTF-8 or Latin-1
  by naive tools; BOM silently breaking JSON/YAML parsers or shell scripts;
  mixed CRLF/LF causing diff noise or build failures; short strings giving false
  confidence.

## 2. Competitors (named, reached, captured)

Verified by direct visit (WebFetch + screenshot) unless noted.

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| LDDGO 在线文件编码检测和转换工具 | https://www.lddgo.net/file/file-encoding-detect-convert | Yes | [lddgo.png](../../research/forge/encoding-detect/lddgo.png) |
| webtexttools.com Character Encoding Checker | https://webtexttools.com/handytools/character-encoding-checker/ | Yes | [webtexttools.png](../../research/forge/encoding-detect/webtexttools.png) |
| monocalc.com Text Encoding Detector | https://monocalc.com/tool/encode_decode/text_encoding_detector | Yes (retry, JS-heavy) | [monocalc.png](../../research/forge/encoding-detect/monocalc.png) |
| chardet (Python/JS ports) | https://github.com/chardet/chardet | Yes (GitHub, no UI to screenshot — it's a library, not a page) | n/a — not a web tool |

Demand corroboration (from prior landscape survey, not re-verified here):
English search surfaced 8 distinct live encoding-detector products
(onlinetoolz.ai, char-encoding.utils.com, webtexttools.com, u2tool.com,
abacktools.com, monocalc.com, mytext.app, anytools.work); Chinese search for
"在线文件编码识别" separately surfaced bugscaner.com/filebianma and lddgo.net
with tiered pricing — evidence of real paid demand for the CJK-charset case,
not just SEO filler.

## 3. Feature inventory

**LDDGO** (strongest CJK competitor):
- File upload only (click or drag-and-drop) — no paste-text mode.
- Detects among 19 source charsets (UTF variants, Shift_JIS, ISO-2022,
  GB18030, EUC-JP/KR, Big5, windows-125x) with a **1–100 confidence index**
  per candidate, not a single guess.
- **Converts** to ~80+ target encodings (adds IBM legacy codes, TIS-620,
  KOI8-R/U) — detection is a means to a conversion end here, not the product.
- Tiered file-size limit: 1MB free / 50MB VIP; rate limits 12/hr guest vs
  120/hr VIP. Core strength = the conversion breadth + CJK charset depth.
  Upsell padding = the extra 60+ rare target encodings almost nobody needs.

**webtexttools.com** (closest to our "pre-pipeline gate" framing):
- Two input modes: paste text or upload a file.
- Single combined report card: Encoding, BOM (yes/no), Line endings
  (LF/CR/CRLF), Language, Length, Status — all update live, no run button.
  Claims client-side/local processing (no server upload).
- Copy + Clear only, no download. No conversion offered — read-only checker,
  which is the right shape for a "gate" tool.
- Core strength = bundling BOM + line-ending + language + length into one
  glance. No upsell/ads found on the page itself.

**monocalc.com** (broadest input surface):
- **Three** input modes: paste text, upload file (≤10MB, .txt/.csv/.html/.xml/.json),
  and raw hex bytes (e.g. `EF BB BF 48 65 6C 6C 6F`) with auto-stripping of
  separators — useful when a user already has a hex dump from a debugger.
- Explicit "Detect Encoding" button (not live) → primary-encoding card with
  confidence badge + BOM status, a **ranked candidate list** with color-coded
  confidence bars (green ≥90%, yellow 60–89%, red <60%), byte statistics
  (total bytes, unique values, null bytes, high bytes 0x80–0xFF, ASCII count),
  and a multi-encoding preview rendering the same bytes under the top 4
  candidates side by side — lets the user visually pick the "right-looking"
  render when confidence is split.
- States its own limitation in-UI: "accuracy increases with sample size;
  strings under ~50 bytes may yield uncertain results." Ads present but no
  paid tier — free + "works offline" (PWA).

**chardet** (the algorithm underneath, not a product):
- 2.6k GitHub stars, 0BSD license. v7 uses a 13-stage pipeline: BOM detection
  → magic-number identification → structural probing → byte-validity
  filtering → bigram statistical models. Claims 99.3% accuracy on a 2,517-file
  benchmark, 95.7% accuracy on bundled language detection across 49 languages.
  This is the real domain know-how; every SaaS tool above is a thin UI wrapper
  around this class of algorithm (chardet itself, or Mozilla's universal
  charset detector it descends from, or `jschardet`/`chardet.js` for a
  Node/browser port).

## 4. Journey maps

**LDDGO:** land on page → drag/select file → upload happens on submit →
result page lists confidence-scored candidates → user picks a target charset
from a large dropdown → click convert → download button appears. No live
preview; conversion is a second explicit step gated behind detection.

**webtexttools:** land on page → paste text or choose a file → report fields
populate immediately as "-" then fill in as soon as input lands (paste
triggers analysis on the fly; file upload triggers it on file-read complete)
→ user reads Encoding/BOM/Line-endings/Language/Length/Status in one card →
Copy button for the report text, Clear to reset. No button-press "run" step
for the paste path.

**monocalc:** land on page → choose a tab (Text / File / Hex) → paste or
upload or type hex → press "Detect Encoding" → primary card + ranked list +
byte stats + 4-way multi-encoding preview appear at once → Reset to start
over. No copy/download of the report itself found in the fetch — the value is
the on-screen comparison, not an exportable artifact.

## 5. Layout + screenshots

- **LDDGO:** drop-zone is the dominant above-the-fold element; detect/convert
  live as tabs; confidence list and download button appear below the
  drop-zone after upload. Options (target charset) are a single dropdown, low
  density.
- **webtexttools:** paste box and file-select sit at the top; the report card
  (6 fields) sits directly beneath, always visible even when empty (shown as
  dashes) — this "always-visible skeleton" is a good above-the-fold pattern
  worth copying.
- **monocalc:** tabbed input selector at top, "Detect Encoding" button below
  it, then a stacked results area (primary card → ranked list with confidence
  bars → byte-stat grid → multi-encoding text preview) — the densest report
  of the three, organized top-to-bottom by decreasing certainty (best guess
  first, raw bytes last).
- Mobile behaviour: not verifiable from static fetch/screenshot for any of the
  three; not claimed here.

## 6. Their debt

- **LDDGO** forces file upload (no paste-text path) even for small snippets —
  server round-trip for work that could run entirely client-side; tiered
  size/rate limits exist to monetize what should be a free, instant check for
  reasonably sized text. No visible API.
- **webtexttools** has no download/export beyond copy, and no confidence
  score per candidate — reports a single verdict, not the runner-up
  encodings, which hides ambiguity the user needs to know about.
- **monocalc** requires a button press even for pasted text (no live mode),
  and ads sit on the same page as the tool (not confirmed *inside* the
  workflow, but present on-page). No visible API for any of the three.
- None of the three expose OpenAPI/MCP/agent-callable contracts — every one
  is a human-only page, which is exactly the gap §6.7.5 requires us to close.

## 7. Domain know-how

1. **BOM check must come first and short-circuits everything else.** A file
   starting with `EF BB BF` (UTF-8), `FF FE` / `FE FF` (UTF-16 LE/BE), or
   `FF FE 00 00` / `00 00 FE FF` (UTF-32 LE/BE) is unambiguous — report it at
   100% confidence and skip statistical guessing. Getting BOM-vs-no-BOM UTF-8
   wrong is the single most common real-world bug (BOM silently breaking JSON
   parsers, shell shebang lines, CSV headers in Excel).
2. **Valid UTF-8 is not proof of UTF-8 intent.** ASCII text is valid UTF-8,
   ISO-8859-1, and Windows-1252 simultaneously — a naive "is this valid UTF-8
   byte sequence" check will over-report UTF-8 on pure-ASCII input and give
   false confidence. Confidence must scale with the proportion of
   non-ASCII/high bytes actually present, mirroring monocalc's 50-byte
   caveat.
3. **CJK legacy charsets need dedicated statistical models, not a generic
   heuristic.** GBK/GB18030/Big5/Shift_JIS/EUC-JP/EUC-KR have overlapping
   byte ranges; distinguishing them (and from each other, and from
   Windows-125x) requires per-charset frequency tables, which is exactly what
   chardet's bigram statistical stage and Mozilla's universal detector exist
   to do — this is not something to hand-roll, per house rule (手搓禁止).
   LDDGO's CJK depth is the market signal that this matters for our zh-Hans
   audience specifically.
4. **Line-ending detection is a separate axis from charset, and both matter
   independently.** A file can be UTF-8 with CRLF (Windows-authored, Unix
   target) — report LF/CR/CRLF counts, not just a boolean, since mixed files
   exist and are themselves diagnostic of a bad merge/tooling problem.
5. **Confidence must be reported as a ranked list, never a single guess.**
   Ambiguous short or symmetric-byte-distribution inputs genuinely have
   multiple plausible encodings; hiding the runner-up (as webtexttools does)
   removes the information a user needs to make the final call themselves —
   monocalc's ranked-candidates-with-bars is the right shape to copy.
5b. **Streaming/large-file detection should sample, not read the whole file**
   for anything beyond a size threshold — chardet supports incremental
   feeding for exactly this reason; detection confidence should be computed
   from a bounded prefix (e.g. first 64–256KB) for large uploads, both for
   latency and because encoding is a file-level property that a prefix
   reliably reveals.
6. **A detector is a gate, not a converter.** Per §6.7.9 Detector root
   definition, this tool answers "what is this," read-only — it must not
   silently offer to rewrite/convert the file's bytes (that is Converter
   territory, already dense in our matrix as `codec`/`convert` tools). Keep
   the scope honest: detect, report, and optionally suggest the paired
   Converter tool as a next step (`compose.next`), never merge the two.

## 8. Chosen archetype

**Drop-and-verdict**, with the paste-text path additionally behaving as
**instant transform** (live, no run button) for the common case of pasted
text or a small/medium file.

Why not the others:
- *Configure-then-generate* — wrong: there is no output to *generate*, only
  an existing artifact to *classify*. Nothing regenerates from options.
- *Decision wizard* — wrong: the user already has a concrete file/string in
  hand; they are not choosing between abstract options, they want a verdict
  on a specific input.
- *Two-pane compare* — wrong: there is exactly one input, not two things to
  diff against each other (a future `encoding-compare`/multi-encoding-preview
  feature could borrow this shape, but the core detector does not need it).
- *Inspect-and-drill* — close, but the "structure to explore" here is thin
  (one verdict + a short candidate list + a handful of byte stats), not a
  deep nested structure like a JWT payload or a JSONPath tree — drop-and-
  verdict's "one clear answer, detail on demand" framing fits better.
- *Batch queue* — wrong for Core; this is a fast synchronous per-file/per-
  string operation, not something that needs progress bars or async jobs.
  (A future bulk variant could live on the J surface later, out of scope
  here.)
- Plain *form + button* — rejected because for the paste-text case (the
  majority of traffic per webtexttools' live-update pattern) a run button is
  a step tax on a sub-100ms computation; live update is strictly better and
  costs nothing extra to implement once the engine is pure/synchronous.

## 9. Our design

### 9.1 Journey

1. Land on page: two input affordances visible immediately — a paste
   `Textarea` (primary, above the fold) and a file drop-zone/`Input
   type="file"` (secondary, next to or below it). No tabs hiding one behind
   the other — both visible at once, matching monocalc's breadth without
   monocalc's tab-click tax.
2. **Paste path:** as soon as text lands (on `input`/`paste` event, debounced
   ~150ms), the report card populates live — no button. This is the instant-
   transform slice.
3. **File path:** file is read client-side via `FileReader`/`ArrayBuffer`
   (no server upload for the human page — privacy stated per §6.5 gate 8);
   for files above a size threshold (e.g. 2–4MB) sample only the first ~256KB
   for detection and say so in the UI ("detected from first 256KB of a
   12.4MB file"). Detection runs automatically the moment the file is
   selected/dropped — still no run button, since client-side detection on a
   bounded sample is fast enough to stay live.
4. **Result card** (always visible, skeleton state with dashes before input —
   copying webtexttools' good pattern):
   - Primary verdict: encoding name + confidence (0–100), BOM present/absent
     (and which BOM bytes if present).
   - Ranked candidate list below the verdict, with confidence bars
     (monocalc's shape), so ambiguity is visible, not hidden.
   - Line-ending breakdown: LF / CR / CRLF counts (flag mixed).
   - Byte stats: total bytes, ASCII count, high-byte (0x80–0xFF) count, null
     byte count.
   - Language guess (best-effort, low priority — chardet/CLD-style, informational only).
5. **Output actions:** Copy report (as text and as JSON) — JSON copy is new
   relative to every competitor above and is what makes this Core-tier: an
   agent or CI script can consume the same payload the human copies. No
   forced download; no forced upload.
6. **Error / edge states:** empty input → skeleton dashes, no error styling.
   Binary/non-text file selected → explicit "this does not look like text"
   status rather than a wrong confident guess. Very short input (<50 bytes,
   per monocalc's own caveat) → confidence capped and a visible note
   ("short input — result may be unreliable"), not silently overstated.
7. **Compose-next:** when a non-UTF-8 encoding is detected, surface a link to
   the paired `codec`/convert tool (`compose.next` edge) — detect stays
   read-only, conversion is one click away, never bundled into this tool's
   own output.

### 9.2 Layout

- Above the fold: paste textarea (left/primary) + file drop-zone (right or
  stacked below on narrow viewports) + the always-visible result skeleton
  directly beneath both inputs — no scrolling needed to see that a report
  exists before typing anything.
- Options density: minimal — a "sample first N KB for large files" note is
  informational, not a control the user must configure; the tool should have
  zero required options before it produces output, honoring "instant use"
  (§6.5 gate 1).
- Mobile: single-column stack — textarea, then drop-zone, then result card;
  no tab UI to avoid dead ends we can't verify on our own mobile pass (none
  of the three competitors' mobile behavior was verifiable either, so we are
  not copying a pattern here, just avoiding the tab-hiding anti-pattern).

### 9.3 Must-have

*without these, users bounce back to a competitor*

- Confidence-scored ranked candidates, not a single guess (webtexttools'
  single-verdict gap is the thing to not repeat).
- BOM detection with the specific BOM bytes, not just yes/no.
- CJK charset family coverage (GBK/GB18030/Big5/Shift_JIS/EUC-JP/EUC-KR) for
  the zh-Hans audience — this is LDDGO's whole reason to exist.
- Both paste and file-upload input in one screen, no tabs.
- JSON copy/output for agent consumption (nothing existing offers this).

### 9.4 Deliberately skipped

- Encoding *conversion* — stays out of this tool by design (§6.7.9: Detector
  is read-only); link to a Converter tool instead. LDDGO conflates the two;
  we do not.
- The 80+ rare target-encoding list LDDGO offers for conversion — irrelevant
  to a detector and would bloat the UI for no benefit.
- Ads/upsell inside the workflow — none of our tools carry this per house
  differentiator table in §6.7.10.
- Full language-model-grade language detection — a best-effort low-priority
  field only, never marketed as authoritative (keeps this tool `pure`, no
  LLM call, per §6.7.8 pure-first doctrine).

### 9.5 Differentiator

**Our differentiator:** every field in the JSON output above is available via
OpenAPI + MCP with the exact same schema the human page copies — none of the
four competitors expose an API at all. Client-side detection for the human
page (privacy: text/file never leaves the browser unless the user explicitly
uses the Agent API), CJK depth matched to LDDGO without its upload-gating or
tiered size limits, and a `compose.next` edge into the existing Converter
tools instead of bolting conversion onto the detector itself.

### 9.6 I/O contract

*for the implementer*

```
input:  { text?: string, fileBase64?: string, filename?: string, sampleBytes?: number }
        // exactly one of text / fileBase64 required; sampleBytes caps detection window (default 262144)
output: {
  primary: { encoding: string, confidence: number /* 0-100 */, bomDetected: boolean, bomBytes?: string },
  candidates: Array<{ encoding: string, confidence: number }>,
  lineEndings: { lf: number, cr: number, crlf: number, mixed: boolean },
  byteStats: { totalBytes: number, asciiCount: number, highByteCount: number, nullByteCount: number },
  languageGuess?: { language: string, confidence: number },
  sampled: boolean,   // true if only a prefix was analyzed
  warning?: string    // e.g. "short input", "binary content suspected"
}
```
Side effect: `pure`. Engine: wrap an existing statistical detector in the
`chardet`/universal-charset-detector family (per 手搓禁止 — do not hand-roll
the bigram/frequency tables) rather than reimplementing detection heuristics.

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

- [ ] **No competitor was exercised with a real file.** All three interactive
      competitors were captured in their entry state; their detection output,
      confidence display and error handling (§3, §4) come from page copy and
      the pre-upload UI, not from an observed result. Anything this brief says
      about *how they present a verdict* is therefore inference.
- [ ] **LDDGO's tiered size limits and upload-gating are read from its own
      pricing/product copy**, not tested. Our "without its upload-gating or
      tiered size limits" claim (§9.5) should be checked before it appears in
      user-facing comparison copy.
- [ ] **The demand corroboration list in §2 was carried over from the prior
      landscape survey and not re-verified this pass** — the eight English and
      two Chinese products named there are cited as evidence of category
      density, not as torn-down competitors.
- [ ] **Ad placement relative to the workflow is unconfirmed** for
      webtexttools.com (§6): ads share the page, but whether any sit inside
      the tool card was not established.
- [ ] **Mobile behaviour unverified** for all three (desktop captures only).
- [ ] **`sampleBytes` default (262144) in §9.6 is a proposal, not a measured
      choice** — no accuracy-vs-window benchmark was run, and chardet-family
      detectors' accuracy curve over sample size is the thing that should set
      it.
- [ ] **The Converter tool this brief hands off to via `compose.next`
      (§9.4) is named but not confirmed to exist** — verify the target slug
      before wiring the link.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in this brief.
