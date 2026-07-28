# Tool brief: line-ending-detect

Root: **Detector** (27) — Order 2 of the empty-root fill sequence (§6.7.9). Object: text/file bytes.

## 1. Demand

- **JTBD:** "Why does git show this whole file as changed" / "why did my shell script fail with `command not found`" — a 30-second pre-flight check on whether a text file's line endings are consistent (LF/CRLF/CR) before committing, deploying, or piping it into a tool that only expects one style.
- **Keywords:** line ending detector, crlf lf detector, detect line endings, line ending converter, crlf to lf
- **Pain:** Cross-platform editors/VCS/shells produce inconsistent line endings; a single mixed-ending file produces noisy diffs, broken shebangs (`\r` after `#!/bin/bash`), failed shell scripts, and silent Windows/Unix tooling mismatches. Users cannot tell by eye whether a paste is LF, CRLF, or mixed.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| **ToolSG Line Ending Detector** | https://www.toolsg.com/en/line-ending-detector | Yes — WebFetch (readable, non-JS-gated) + screenshot | `docs/research/forge/line-ending-detect/toolsg-line-ending-detector.webp` |
| **hidekazu-konishi.com Line Ending / BOM Converter Tool** | https://hidekazu-konishi.com/tools/line_ending_bom_converter_tool.html | Yes — screenshot captured; WebFetch blocked by an automated domain-safety check on this pass, page content read directly from the full-page screenshot instead | `docs/research/forge/line-ending-detect/hidekazu-konishi-line-ending-bom-converter.webp` |
| **Aback Tools Line Ending Converter** | https://abacktools.com/tools/file/text-encoding/line-ending-converter | Yes — screenshot captured; WebFetch blocked by the same domain-safety check, page content read directly from the full-page screenshot | `docs/research/forge/line-ending-detect/abacktools-line-ending-converter.webp` |

No competitor was invented or substituted beyond the three named in the landscape survey. All three were visited (screenshot succeeded for all three; WebFetch text extraction succeeded for ToolSG only — the other two are described from the captured screenshot content, not from memory or assumption).

## 3. Feature inventory

**ToolSG Line Ending Detector** — the closest single-purpose match to the "Core Forge tool" framing.
- Core strength: one textarea, **"Analyze Line Endings"** button producing a **Line Ending Statistics** panel — total line count, LF count, CRLF count, dominant format, and an explicit **mixed-ending warning** ("identifies mixed line endings, which can cause problems").
- Also ships **"Convert to LF (Unix)"** and **"Convert to CRLF (Windows)"** buttons — so despite being named "Detector," it is really detect+convert, same as the other two. No CR (classic Mac) detection or conversion mentioned.
- Copy Result / Download / Clear as output actions.
- Explicit privacy claim: "All line ending detection and conversion is done locally in your browser."
- Upsell/padding: heavy. Two full-width "Discover more" link-farm blocks (Web Browsers, Computer Science, Linux & Unix, Computer Drives & Storage, Computers & Electronics, Dictionaries & Encyclopedias — repeated at top and bottom), two "Advertisement" banner slots, plus ~2,500 words of SEO filler (line-ending history, common issues, use cases, best practices, a `.gitattributes` code sample) below the actual tool. The tool itself is a thin strip at the very top of a very long page.

**hidekazu-konishi.com Line Ending / BOM Converter Tool** — the most feature-complete, confirms the upper bound of scope.
- Core strength: **3-way conversion** (CRLF/LF/CR, any direction) bundled with **UTF-8 BOM control** (add/remove/keep), **trailing-newline policy** (keep/ensure/strip), and **blank-line collapse** (2+ consecutive → 1) — all as explicit dropdown/checkbox options above the input, applied together in one conversion pass.
- **Mixed-ending detection reports per-style ratios**, not just a flag: "Counts CRLF, LF, and CR occurrences separately and shows per-style percentages, with a clear 'MIXED' indicator when more than one style is present" — this is strictly richer than ToolSG's binary mixed/not-mixed flag.
- **Dual mode**: Text Mode (paste, live in-page textarea pair: input left / converted output right) and **Batch Files Mode** (drag-and-drop multiple files, converts all, downloads a ZIP with filenames preserved via JSZip, duplicate names auto-suffixed).
- **Byte delta reporting** on every conversion — reports the exact byte-size change so the user can sanity-check what happened (e.g. CRLF→LF shrinks a 1000-line file by ~1000 bytes).
- Live per-panel statistics (both input and output): BOM state, line-ending counts, line count, byte size, trailing-newline status — shown continuously, not just after a button click for the *detection* half (though the actual *conversion* is still gated behind a "Convert" button).
- No ads observed on the captured screenshot; page is a personal tool-author's site with a lengthy "Important Notes" / references section (RFC 3629, Unicode 15.0 §23.8, WHATWG Encoding Standard, JSZip credit) below the tool, but no ad banners or link farms.
- Upsell padding: essentially none — the surrounding content is technical reference material (own author's blog/tools links), not monetized filler.

**Aback Tools Line Ending Converter** — station-style competitor (part of a 2356-tool directory, same family competing across file-type/encoding Detector candidates).
- Core strength: drag-and-drop **or** paste-text dual entry into one drop zone, detects **CRLF/LF/CR** and reports exact counts for each plus "dominant format percentage," with an explicit **mixed-ending alert** ("flags files that contain a combination... and recommends normalization").
- One-click convert to LF/CRLF/CR target, applied to all endings in the file at once ("internally normalizes all line endings... ensuring consistent results even with mixed endings").
- Sidebar of 2,356 other tools across a dozen categories (Audio & Video, Compress, Crypto & Security, Data, Design, Image, Math, PDF, Productivity, Science, Text, Web, AI, Network, Payment, File) — this tool sits under File → Text & Encoding.
- Right-rail **"Support Us"** affiliate-partner box and a **"Related Tools"** cross-sell grid (Steganography Detector, Image File Size Analyzer, File Magic Byte Detector, Image Clone Detector) — none of these are ad banners inside the workflow itself, they sit below the tool.
- Large FAQ accordion (8 questions) and 6 "Common Use Cases" cards below the tool — SEO padding but not intrusive to the working area.
- Upsell padding: moderate — affiliate box + related-tools grid + FAQ farm, but no banner ads inside the tool card itself.

## 4. Journey maps

**ToolSG** (closest to the plain "Detector" archetype):
1. Land directly on the tool page — title + one-line description, then the action bar (three colored buttons: Analyze / Convert to LF / Convert to CRLF), then a secondary bar (Copy Result / Download / Clear), then the input textarea. No scroll needed to reach the input.
2. User pastes text into the textarea. Nothing happens automatically — this is button-gated, not live.
3. Click **Analyze Line Endings** → statistics panel appears (implied below/near the button row; exact re-render location not confirmed from the fetched text, but the flow is explicitly click-then-result, not live-as-you-type).
4. Alternatively, click Convert to LF or Convert to CRLF directly — conversion doesn't require a prior "Analyze" click.
5. Result exit: Copy Result or Download.
6. No error states or big-input behaviour were surfaced in the fetched content.

**hidekazu-konishi.com** (the feature ceiling):
1. Land on a long informational page; scroll past privacy/disclaimer block to reach a **Conversion Options** panel (Target line ending dropdown, UTF-8 BOM dropdown, Trailing newline dropdown, Collapse-blank-lines checkbox) that sits *above* and *outside* the Text/Batch tab switcher — options apply to whichever mode is active.
2. **Text Mode** tab (default) shows two side-by-side boxes: "Input text" (left) and "Converted output" (right), each with a small stats line below it ("No input." / "No output yet." placeholders before use).
3. User pastes into the left box. Detection stats for the *input* box update (implied live per the "Live Statistics: Per-input and per-output panels report BOM state, line endings..." feature description) but the actual conversion is still gated behind the **Convert** button (maroon, primary) alongside Copy Result / Download as File / Clear All.
4. **Batch Files Mode** tab: drag-and-drop zone for multiple files → each row shows detected line ending/BOM/size → single **Convert All Files** → **Download ZIP**.
5. Verify step is explicit in the "How to Use" copy: "confirm the line ending and BOM state match expectations before saving over the originals" — i.e., the tool explicitly tells the user to re-check the output panel's stats before trusting the result, an acknowledgment that silent byte-level changes are risky.
6. No hard input-size limit stated; everything is in-browser JS/string ops.

**Aback Tools**:
1. Land on tool page inside the site's persistent left sidebar (category tree) + top nav (Feedback/Support/Blog/Guides).
2. One drop zone doubling as a textarea: "Drop a text file here or click to browse" above a "Paste text here to detect and convert line endings..." textarea, with a live character counter ("0 characters") below.
3. "How to use" copy directly under the input explains the click-through: paste/upload → tool shows stats + highlights mixed endings → select target format → click Convert → download or copy.
4. This implies the actual convert control (buttons) renders only after content is present — not visible in the captured above-the-fold screenshot, consistent with a "type first, controls appear" progressive-disclosure pattern rather than always-visible buttons.
5. Below the tool: "Why Use Our Line Ending Converter" (4 feature cards), "Common Use Cases" (6 cards), "Understanding Line Endings" (4 explainer cards), "Related Tools" grid, FAQ accordion, footer.

## 5. Layout + screenshots

- **ToolSG**: single centered column, tool card sits directly below the H1/description with no options row and no tabs — button bar → secondary action bar → textarea, all above the fold at typical desktop width. Everything below the input (which is most of the page) is SEO/ad filler: "Discover more" doorway-link blocks, ad slots, and long educational prose sections (line-ending history, common issues, use cases, best practices with a `.gitattributes` snippet, privacy/security list). See `toolsg-line-ending-detector.png`.
- **hidekazu-konishi.com**: single centered column (dark maroon site chrome), but the tool card itself is the widest and most option-dense of the three: a 2×2 **Conversion Options** grid (Target line ending / UTF-8 BOM / Trailing newline / Collapse-blank-lines) sits above a **Text Mode / Batch Files Mode** tab switcher, which in Text Mode splits into two equal side-by-side panels (input left, output right) each with its own stats line and its own placeholder state. Action buttons (Convert / Copy Result / Download as File / Clear All) sit in one row below both panels. This is the only one of the three with a genuine two-pane input/output split. See `hidekazu-konishi-line-ending-bom-converter.png`.
- **Aback Tools**: two-column app-shell layout — persistent left category sidebar (full site nav, ~15 top-level categories) + main content column. The tool card itself is a single drop-zone/textarea combo (no separate paste vs. upload UI — one target does both) with a live character counter, sitting well above the fold; a right-side rail below the tool card carries "Share this tool" + a "Support Us" affiliate box. Below the fold: four feature-card grids and an FAQ accordion. See `abacktools-line-ending-converter.png`.
- **Mobile**: not directly observed for any of the three (all screenshots were desktop-viewport captures); hidekazu-konishi.com's two-pane Text Mode layout is the one most likely to need explicit mobile stacking (input above output, full width each).

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- `docs/research/forge/line-ending-detect/toolsg-line-ending-detector.webp`
- `docs/research/forge/line-ending-detect/hidekazu-konishi-line-ending-bom-converter.webp`
- `docs/research/forge/line-ending-detect/abacktools-line-ending-converter.webp`

## 6. Their debt

- **ToolSG**: heaviest SEO/ad debt of the three — two "Discover more" link-farm blocks (repeated top and bottom) plus explicit "Advertisement" banner slots inside the page flow (though not literally inside the tool card itself), and ~2,500 words of filler prose the user must scroll past to reach nothing new. No API, no batch mode, no CR (classic Mac) support, no BOM handling.
- **hidekazu-konishi.com**: least workflow debt — no ads, no link farms, technical reference-grade content only. The real gap: conversion is still button-gated rather than live (a live-diff or live-stats-as-you-type experience is not offered even though the *detection* stats are described as live-per-panel). No documented API — a personal client-side tool with no server component to call.
- **Aback Tools**: moderate debt — an affiliate "Support Us" box and a "Related Tools" cross-sell grid sit near the tool (not literally inside the workflow, but immediately adjacent), plus a large FAQ/use-case farm below. No visible live-as-you-type detection (paste-then-controls-appear pattern, based on the captured screenshot showing no visible action buttons above the fold with an empty textarea). No CR-classic-Mac handling confirmed beyond the general "CRLF, LF & CR Detection" feature claim. No API for any of the three — all are human-only pages with no OpenAPI/MCP surface.

## 7. Domain know-how

1. **"Mixed" is not binary — it needs per-style counts, not just a flag.** A naive detector that just says "this file has mixed line endings: yes/no" is strictly worse than what hidekazu-konishi.com and Aback Tools both do: counting CRLF/LF/CR occurrences separately and reporting percentages plus a dominant format. Without counts, a user with 1 stray `\r\n` in a 10,000-line LF file gets the same alarming "MIXED" verdict as a file that's 50/50 — which is not actionable. The count/ratio is the difference between "ignore this" and "investigate this."
2. **Detecting the last line matters.** A file's trailing-newline state (present/absent) is a distinct axis from its line-ending *style* — hidekazu-konishi.com models it as a separate "Trailing newline: Keep / Ensure / Strip" option precisely because POSIX defines a "line" as terminated by a newline, so a file missing its final `\n` is technically malformed even if every other line ending is consistent LF. A naive implementation that only reports "LF: N, CRLF: M" and ignores the trailing-newline state misses a common Git/POSIX compliance complaint.
3. **UTF-8 BOM detection is a separate concern from line-ending detection but frequently travels with it.** All three competitors' surrounding ecosystem treats BOM (`EF BB BF` / U+FEFF) as adjacent — hidekazu-konishi.com exposes it as a first-class option (add/remove/keep independent of line-ending choice) because a leading BOM breaks shebang lines (`#!/bin/bash` becomes unrecognized) and some JSON/shell parsers, which is exactly the kind of "why did this fail" surprise this Detector category exists to catch. A pure line-ending detector that silently ignores a leading BOM will miss a real, closely-related failure mode users hit in the same breath.
4. **Byte-for-byte determinism requires operating on the raw bytes read, not on what a `<textarea>` displays.** hidekazu-konishi.com calls this out explicitly in its "Important Notes": "Browser textareas may normalize newlines on display; the detection panel reflects what the browser actually stored, which is what the conversion operates on." A naive client-side implementation that reads `textarea.value` and assumes it 1:1 matches the pasted bytes can silently mis-detect, because browsers can normalize `\r\n`/`\r` to `\n` in the DOM before JS ever sees the string. The correct approach for **pasted text** is to accept this browser-normalization limit explicitly (and say so), and for **uploaded files**, read raw bytes via the File API / ArrayBuffer — never decode-then-redecode through a textarea round-trip — so file-based detection is unaffected by this browser quirk.
5. **Only files decoded as UTF-8 are safe to line-ending-detect naively.** hidekazu-konishi.com flags this directly: "The tool decodes input files as UTF-8... Files in other encodings (Shift_JIS, EUC-JP, UTF-16, etc.) should first be converted to a dedicated character-encoding converter." A byte scanner looking for `0x0D`/`0x0A` patterns can misfire on UTF-16 (where every ASCII byte is followed by a `0x00` padding byte) or on legacy CJK encodings with overlapping byte ranges — so a detector needs either an explicit encoding-detection pre-step or an explicit "UTF-8/ASCII text only" disclaimer, not a silent wrong answer.
6. **Reporting the exact byte delta on conversion is a trust mechanism, not a nice-to-have.** hidekazu-konishi.com's "Byte Delta Reporting" feature exists because line-ending conversion is destructive and easy to get subtly wrong (e.g., double-converting an already-LF file, or CRLF→LF shrinking by the wrong amount if some lines were already LF). Showing the user the before/after byte count lets them sanity-check the operation without needing to diff the raw output themselves — a naive "here's your converted text, trust me" response loses this safety net entirely.

## 8. Chosen archetype

Per §6.7.10's own candidate list for the Detector root ("MIME/file-type from bytes, text encoding + BOM, **line-ending**, secret/API-key scan, language detect"), line-ending detection sits explicitly alongside checksum and file-type detect as a **Drop-and-verdict** example: "File in → one clear answer, detail on demand." That is exactly the JTBD — the user wants one fast answer ("is this file consistent, and if not, what's the dominant style") with the per-style counts available as supporting detail, not as the primary UI.

Why the other six are wrong here:
- **Instant transform** — close, but wrong shape: an instant transform takes an input and *becomes* a transformed output (base64, case convert). Detection doesn't transform anything — it produces a verdict *about* the input, which the user then may or may not act on via a separate conversion step. Collapsing detect+convert into one live-transform view (as all three competitors partially do) is exactly the trap that makes their pages read as one generic "line ending tool" rather than a crisp Detector with an optional conversion follow-through.
- **Configure-then-generate** — no configuration produces this tool's output; there's nothing to "generate," only something to detect. hidekazu-konishi.com's Conversion Options panel belongs to its *converter* half, not the detection half.
- **Decision wizard** — the user isn't uncertain about what they want; they paste/drop a file and want the answer immediately, not a multi-step Q&A.
- **Two-pane compare** — nothing is being diffed between two inputs; this is single-input analysis.
- **Inspect-and-drill** — closer than most alternatives (there is a "detail on demand" element — clicking through to see the per-style breakdown), but the primary interaction is not open-ended exploration of a decoded structure (like JWT claims or a JSONPath tree); it's a single verdict with one layer of supporting stats, which is squarely Drop-and-verdict's own "detail on demand" clause rather than a distinct explore-a-structure interaction.
- **Batch queue**: intentionally deferred, not chosen as primary — see "deliberately skipped" below. hidekazu-konishi.com's Batch Files Mode is real and valuable, but it's an extension of the drop-and-verdict shape (each file gets its own verdict), not a different journey requiring visible async progress bars.
- **"Form + button"**: the trap here is exactly what ToolSG does — reduce the tool to "paste → click Analyze → read a stats block," which needlessly gates a near-instant client-side byte-count behind a button click. A file/paste input is inherently a "drop," and a byte-count-and-classify operation over a few KB–MB of text is fast enough to run automatically on input change, making the explicit button step in ToolSG and (for conversion) hidekazu-konishi.com a pure step-tax we should not copy for the *detection* half of this tool.

## 9. Our design

### 9.1 Journey

*This brief writes the journey inline in 9.2 Layout rather than as a separate step sequence — carried into §11 as an open item.*

### 9.2 Layout

**Layout** — single input area, verdict-first, detail-on-demand, no separate output pane (detection doesn't produce a second document — that's the sibling Converter tool's job):

- **Top**: one combined drop-zone-and-textarea (mirrors Aback Tools' single-target pattern, which is simpler than hidekazu-konishi.com's separate Text/Batch tabs for the common single-file case) — "Paste text or drop a file to detect line endings" placeholder. Accepts drag-and-drop file upload (read as raw bytes via File API/ArrayBuffer, per domain know-how #4 — never round-tripped through a textarea for the file-upload path) or direct paste.
- **Verdict card** (renders live, no button, the moment there is input): one-line headline answer up top — e.g. **"LF (Unix/Linux/macOS) — consistent"** or **"MIXED — 62% LF, 38% CRLF"** in a colored badge (green for consistent single-style, amber for mixed) — this is the "one clear answer" the archetype calls for, always the first thing rendered, never buried below a stats table.
- **Detail on demand**, directly below the verdict, always visible but visually secondary (smaller type, muted panel): per-style counts (LF / CRLF / CR line counts and percentages), trailing-newline status (present/absent), UTF-8 BOM presence (per domain know-how #3), total line count, byte size. This satisfies "detail on demand" without requiring an extra click — Drop-and-verdict's own text allows detail to be present but subordinate, and given how cheap this to compute, showing it inline (rather than behind a "Show details" toggle) costs nothing and avoids an extra interaction.
- **No conversion buttons on this page.** Per the Detector/Converter root split the design doc draws (§6.7.9's Detector candidate list is separate from any Converter list), this tool's job ends at diagnosis. A **"Convert to LF / CRLF / CR"** action appears as a single `compose.next` link/button that hands the same input off to the sibling line-ending *converter* tool — closing the loop competitors all bundle into one page, but keeping our two roots honest and each tool's OpenAPI/MCP contract single-purpose.
- **Exit actions**: Copy the verdict+stats as plain text (for pasting into a PR comment or Slack message) and a small "Copy as JSON" option for anyone scripting around the human page — the JSON shape is identical to what the API returns, so power users get the machine contract without leaving the page.
- **Big input**: no hard size limit stated by any competitor; ours streams/chunks the byte scan for large pastes (multi-MB) so the verdict still renders without blocking the main thread noticeably — implementation detail, not a UX change.
- **Empty/error state**: empty input shows a neutral placeholder card ("Paste or drop a file to see its line-ending verdict") — never a false "consistent" or "0 lines" verdict for empty input.
- **Encoding edge case** (domain know-how #5): if the uploaded bytes don't decode cleanly as UTF-8/ASCII, the verdict card shows a clear "Could not reliably detect — file may not be UTF-8 text" message with a `compose.next` pointer to our encoding-detector tool, rather than silently emitting a wrong CRLF/LF count from garbled bytes.

### 9.3 Must-have

**Must-have features** (without these, a user bounces back to a competitor):
1. Live, no-button detection the moment text/file is present (none of the three competitors do this for detection — all three gate even detection behind a click or an implicit "type-then-controls-appear" pattern; being live is a genuine differentiator, not parity).
2. Per-style counts and ratios, not a binary mixed flag (parity with hidekazu-konishi.com and Aback Tools; ToolSG alone is weaker here).
3. Trailing-newline and UTF-8 BOM state surfaced alongside line-ending state (parity with hidekazu-konishi.com, the feature ceiling).
4. Both copy (human) and copy-as-JSON / API access (machine) exit paths.

### 9.4 Deliberately skipped

**Deliberately skipped** (and why):
- **In-page conversion (Convert to LF/CRLF/CR buttons)** — all three competitors bundle this into the same page; we deliberately split Detector and Converter as separate tools/roots per §6.7.9's own root taxonomy, linked by `compose.next`, so each tool's machine contract stays single-purpose and each root stays honest about what it does. A `compose.next` link, not an inline button, is the bridge.
- **Batch/ZIP multi-file mode** — real value (hidekazu-konishi.com proves it), but belongs to the Processor root's async job surface (§6.7.9, "same tools, over many files, without blocking") rather than being reimplemented per-Detector-tool as a bespoke ZIP-upload feature. Single-file/paste detection is the Detector root's job; N-files-over-time is a Processor-root job wrapping this same detection logic.
- **UTF-8 BOM add/remove/keep controls** — we *detect and report* BOM state (must-have #3) but do not offer BOM manipulation controls on this page; that's conversion, not detection, following the same Detector/Converter split as line-ending conversion itself.
- **Blank-line collapse option** — a hidekazu-konishi.com conversion feature, out of scope for a pure Detector.
- **SEO filler / doorway links / affiliate boxes** — all three competitors carry some form of this (ToolSG heaviest, Aback Tools moderate, hidekazu-konishi.com least); per §6.7.10's stated edge, we carry none of it inside or adjacent to the tool workflow.

### 9.5 Differentiator

- **Agent contract**: the same detection logic — per-style CRLF/LF/CR counts, dominant format, mixed flag, trailing-newline state, BOM presence — is exposed via OpenAPI + MCP with a stable JSON schema. None of the three competitors have any documented API; all are human-only pages. An agent doing a pre-commit sanity pass or a CI pre-flight step can call this directly instead of shelling out to `file`/`grep -c` heuristics.
- **No SEO/ad debt inside the workflow**: unlike ToolSG's link-farm-and-ad-banner-choked page, the tool card itself carries zero ad clutter and zero doorway links — matching hidekazu-konishi.com's clean-workflow standard, not ToolSG's.
- **Per-style ratio detection as the default output**, not an optional/advanced feature — closing the "binary mixed flag" gap that a naive Detector (or ToolSG's own detector) would ship.
- **Both copy and download**, plus a **verdict-first, detail-on-demand layout** (see Drop-and-verdict archetype below) rather than requiring a scroll through statistics to find the one-line answer.
- **Deterministic and `pure`** — no model call; this is byte-counting, priced at server-time cost, reproducible, and safely composable into an agent's pre-commit/CI pipeline (`compose.next` into our own line-ending *converter* — a distinct tool from this Detector, per the root separation the design doc draws between Detector and Converter roots).

### 9.6 I/O contract

**I/O contract sketch** (for the OpenAPI/MCP surface, §6.5 gate 2):

```text
input:
  text?: string          # paste path — subject to browser textarea normalization caveat (see domain know-how #4)
  file?: binary           # upload path — read as raw bytes, authoritative source of truth
  # exactly one of text/file required

output:
  dominant: enum<LF, CRLF, CR, none>   # "none" only for empty/whitespace-only input
  isMixed: boolean
  counts: { lf: number, crlf: number, cr: number }
  ratios: { lf: number, crlf: number, cr: number }   # 0..1, sums to 1 (excluding "none")
  totalLines: number
  byteSize: number
  trailingNewline: enum<present, absent>
  bom: enum<utf8, none>                # BOM detection scoped to UTF-8 only, per domain know-how #5
  decodeWarning?: string                # set when bytes don't decode cleanly as UTF-8/ASCII
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

- [ ] **Two of the three competitors are screenshot-only.**
      hidekazu-konishi.com and Aback Tools were both blocked by an automated
      domain-safety check on WebFetch, so every feature and journey claim
      about them (§3, §4) is read off full-page captures, not page text.
      The captures are legible and detailed, but nothing behind an
      interaction was seen.
- [ ] **ToolSG's result-panel placement was not confirmed** (§4 step 3) — the
      click-then-result flow is explicit in the fetched copy, the re-render
      location is not.
- [ ] **No competitor was exercised with a real mixed-ending file**, so the
      per-style ratio outputs described in §3 are their stated behaviour, not
      observed behaviour. Our "closes the binary mixed-flag gap" claim (§9.5)
      is safe against ToolSG's own copy but should not be extended to the
      other two without a live test.
- [ ] **Mobile behaviour unverified** for all three (desktop captures only).
- [ ] **The journey is written inline in §9.2 rather than as an explicit step
      sequence** (§9.1) — write it out before implementation.
- [ ] **The sibling line-ending *converter* tool this brief hands off to via
      `compose.next` does not exist yet** (§9.2, §9.4). Splitting Detector
      from Converter is only honest if the Converter actually ships; until it
      does, a user who lands here and wants to fix the file has nowhere to go.
- [ ] **Browser textarea newline normalization** (§7 item 4) is sourced from
      hidekazu-konishi.com's own "Important Notes", not from our own test.
      Verify what the paste path actually preserves in our target browsers
      before writing the caveat into user-facing copy.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in §9.6.
