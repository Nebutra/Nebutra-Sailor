# Tool brief: secret-scan

Root: **Detector (27)** — empty root, priority 2 per §6.7.9 (developer-frequency
pre-pipeline gate). Object: Text/Data (Dev/Sec). Side effect: `pure`, `read`-only
by contract (never `write`/`external`).

## 1. Demand

- **JTBD:** "I'm about to paste a `.env`, a config dump, a log excerpt, or a
  chunk of code into a chat/PR/ticket/Slack message and I need to know first
  whether it contains a live-looking API key, token, or credential." Also:
  "I just pulled a diff/log and want a fast read-only pass before I share it
  anywhere."
- **Keywords:** secret scanner online, API key detector, find leaked API key,
  paste code scan for secrets, secret detection tool, 密钥泄露检测, API密钥扫描
- **Pain:** copy-pasting a `.env` or config snippet into a shared doc/ticket/AI
  chat and silently leaking a live key; not knowing which of 400+ vendor key
  formats a given string even is; wanting a check that never sends the pasted
  text anywhere (uploading a secret to "check for secrets" is its own
  absurdity if the checker itself exfiltrates).

## 2. Competitors (named, reached, captured)

Verified by direct visit (WebFetch + screenshot) unless noted.

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| AquilaX Secrets Detector | https://aquilax.ai/tools/secrets-detector | Yes | [aquilax-secrets-detector.png](../../research/forge/secret-scan/aquilax-secrets-detector.png) |
| SecurityWall API Key Checker | https://securitywall.co/tools/api-key-checker | Yes | [securitywall-api-key-checker.png](../../research/forge/secret-scan/securitywall-api-key-checker.png) |
| ZeroPath Secrets Scanner | https://zeropath.com/products/secrets | Yes (marketing page, not an interactive tool — confirmed by fetch) | [zeropath-secrets.png](../../research/forge/secret-scan/zeropath-secrets.png) |
| gitleaks | https://github.com/gitleaks/gitleaks | Yes (GitHub, no web UI to screenshot — it's a CLI/engine, not a page) | n/a — not a web tool |
| TruffleHog | https://github.com/trufflesecurity/trufflehog | Yes (GitHub, no web UI to screenshot — it's a CLI/engine, not a page) | n/a — not a web tool |

Demand corroboration (from prior landscape survey, not re-verified here):
WebSearch surfaced multiple live client-side scanners built specifically
around the paste-code-get-verdict journey (AquilaX, SecurityWall, VibeFactory),
distinct from CI/repo-scanning tools. Chinese-language search surfaced a
different, adjacent need — batch API-key *validity* testing (e.g.
`weiruchenai1/api-key-tester` on GitHub) — which is Checker/Verifier
territory ("is this key still live"), not Detector territory ("does this
text contain something that looks like a key"). Kept explicitly out of scope
here; see §7 point 6 below.

## 3. Feature inventory

**AquilaX Secrets Detector** (strongest direct archetype match):
- Single "Paste Code or Config" textarea. No file upload.
- Explicit action buttons: **Scan**, **Load Sample**, **Clear** — not live;
  the button is a deliberate gate on a paste-and-check workflow (screenshot
  confirms this three-button row directly under the textarea).
- States "100% client-side. Your code never leaves your browser" prominently
  above the input — the privacy claim is the headline, not a footnote.
- Results render in a "Findings" section below the input.
- Core strength = the privacy claim + the free standalone tool. Upsell
  padding = "Run 32 scanners on your real codebase" banner pushing to the
  full AquilaX platform (Start Free / Book a Demo) — this sits *below* the
  tool, not blocking it.
- No file upload, no copy/export/download action found, no API for this
  specific tool page.

**SecurityWall API Key Checker** (deepest single-key inspection):
- Single paste textarea, accepts either one bare key or "text containing
  multiple secrets" including `KEY=value`-style lines — batch-of-one-string
  scanning, not a code-context scanner.
- Runs client-side automatically against 455+ regex patterns (real-time,
  not gated behind a visible run button per the fetch — matches the "instant
  transform" feel more than AquilaX's explicit gate).
- Goes one full step past detection: identifies the **service name**,
  assigns a **risk tier** (Critical/High/Medium/Low), states **blast
  radius** ("what this key can access if compromised"), and generates a
  **ready-to-run validation curl command** with expected-response guidance
  and one-click copy. This is the scope boundary to note explicitly: this
  is Checker/Verifier-adjacent behavior bolted onto a Detector — SecurityWall
  answers "what is this and how do I confirm it's live," we (Detector) must
  answer only "does this text contain something that looks like a key."
- Handles ambiguous patterns (formats that match multiple vendors) by
  showing multiple candidate matches, prioritizing higher-confidence ones.
- No file upload. Copy-to-clipboard for validation commands only, not for a
  findings report. No API. "100% client-side JavaScript... no network
  requests with your keys... works offline after initial load."

**ZeroPath Secrets Scanner** (bundled-suite reference, not a standalone tool):
- Confirmed by fetch: **not** an interactive paste-and-scan page at all — no
  embedded scanning UI, no textarea. Two "Book a Demo" CTAs are the only
  interactive elements.
- Sells "700+ Secret Detectors" plus "AI False Positive Reduction" (an LLM
  step filtering non-critical findings/test credentials) as one module of a
  full AppSec platform with Git-provider webhook scanning and PR-based
  remediation (Jira/Linear/Slack integrations).
- Signals the category also sells as an enterprise/CI bundle, not just a
  free loss-leader tool — a different business model from AquilaX/
  SecurityWall's free-standalone-tool-as-funnel approach, worth knowing but
  not a journey to copy since there is no journey here to copy.

**gitleaks** (the open-source detection engine underneath the category):
- 28.3k GitHub stars, MIT license. Detection = regex patterns + Shannon
  entropy scoring ("Regex is (almost) all you need," per its own README).
- TOML rule format (`.gitleaks.toml`); supports custom rules with regex +
  entropy thresholds + metadata tags, and multiple allowlist mechanisms
  (rule-level, global, by commit/path/regex) to cut false positives; report
  formats include JSON/CSV/SARIF/JUnit.
- **Declared feature-complete** — maintainer: "I'm not merging new features
  into Gitleaks. Future releases will be security patches only. I'm
  shifting my focus to Betterleaks." Worth knowing before treating its rule
  format as a moving target to track; it is a stable, frozen ruleset to wrap
  or port from, not a fast-evolving upstream.
- No web UI — this is a CLI/CI engine every paste-tool above is effectively
  a thin browser wrapper around a subset of.

**TruffleHog** (the other dominant open-source engine, verification-first):
- 27.2k GitHub stars, AGPL-3.0. 800+ secret types, 700+ detectors with
  **active verification**: for many detector types it calls the vendor's own
  API to confirm a found credential is still live, returning `verified` /
  `unverified` / `unknown`. This is explicitly Checker/Verifier territory
  (network call to a third party), not Detector territory (local pattern
  match) — a hard scope line for us: Detector must never do this by
  default, since it requires exfiltrating the (possibly still-live) key to a
  third-party API just to check it, which is the opposite of "read-only,
  never auto-exfiltrate" (§6.7.2 Tier A note on Detector).
- No web UI either — CLI/CI engine.

## 4. Journey maps

**AquilaX:** land on page → privacy statement visible immediately above the
textarea → paste code/config, or click "Load Sample" to see the shape of a
result without pasting anything real → click **Scan** → Findings section
populates below → "Run 32 scanners on your real codebase" upsell banner
appears further down, separate from the findings, with Start Free/Book a
Demo CTAs. Clear resets the textarea. No copy/export button confirmed. No
button-less live mode — Scan is a deliberate step, not a step tax removed.

**SecurityWall:** land on page → paste a key or a block of `.env`-style text
→ analysis runs automatically (fetch found no explicit "click to scan" step
described) → for each match: service name + confidence + risk tier + blast
radius + a pre-filled validation command with a one-click copy button →
manual execution of that command is on the user, the tool does not call out
to anything itself. Ambiguous patterns surface as multiple candidate matches
rather than a false single guess.

**ZeroPath:** land on page → no tool journey exists; the page is a features
page for a signup-gated platform. "Journey" here is: read feature list → hit
Book a Demo. Nothing to map as a tool interaction.

## 5. Layout + screenshots

- **AquilaX** (per screenshot): the textarea is the dominant above-the-fold
  element, privacy line sits directly above it, the three-button row (Scan /
  Load Sample / Clear) sits immediately under the textarea — zero visual
  distance between "read the privacy promise" and "start typing." The
  upsell banner is pushed well below the fold, after the Findings section,
  not interleaved with the tool itself.
- **SecurityWall** (per screenshot): paste box near the top, "supported
  services" grid and feature highlights below it, FAQ further down — a
  longer, more marketing-forward page than AquilaX's, but the tool itself
  still sits above the fold with no options to configure before typing.
- **ZeroPath**: no tool UI to describe; the page is standard SaaS-marketing
  layout (hero → feature grid → integrations → CTA).
- Options density on both live tools: effectively zero — neither exposes a
  "which key types to check" toggle or a confidence-threshold slider; the
  full pattern library always runs.
- Mobile behaviour: not verifiable from static fetch/screenshot for any
  competitor; not claimed here.

## 6. Their debt

- **AquilaX** requires an explicit Scan click even for a small paste — a
  minor step tax for what could be a live/instant check on a fast pattern
  match; no copy/export of findings found; no file-upload path (paste only);
  no visible API for the tool itself (only the paid platform has one).
- **SecurityWall** blurs Detector and Checker/Verifier — pushing users
  toward manually running vendor-specific validation commands is useful but
  is a different job than "does this text contain a secret," and doing both
  in one tool makes the scope harder to reason about for an agent caller
  that just wants a yes/no + match list. No file upload either. No visible
  API.
- **ZeroPath** offers no free standalone tool at all — the entire "Secrets
  Scanner" capability is locked behind a platform signup/demo, which is a
  real gap for anyone who just wants a one-off paste check.
- **None of the five** (including gitleaks/TruffleHog as engines) expose an
  agent-callable HTTP/OpenAPI/MCP contract for the paste-and-check journey —
  gitleaks/TruffleHog are CLI-only, and the web tools are human-only pages.
  This is exactly the gap §6.7.5 requires us to close.
- TruffleHog's live-verification model, while impressive, is a structural
  privacy risk for a "paste before you share" tool: verifying a key means
  transmitting it to a third-party API, which is the one thing a read-only
  pre-share gate must never do by default.

## 7. Domain know-how

1. **A secret detector is a pattern-match + entropy problem, not a keyword
   grep.** Real credentials mostly fall into two shapes: (a) **structured
   formats** with a recognizable vendor prefix (`sk-`, `AKIA`, `ghp_`,
   `xox[b|p]-`, `AIza`, `SG.`, JWT's `eyJ` header, etc.) matched by regex,
   and (b) **unstructured high-entropy strings** (generic API keys, private
   key blobs, random secrets assigned to `_SECRET`/`_TOKEN`/`_KEY`-named
   variables) that only Shannon-entropy scoring catches. gitleaks' own
   README summary — "regex is (almost) all you need" — undersells the
   entropy half; skipping it misses every vendor without a distinctive
   prefix.
2. **Context boosts confidence; content alone is not enough for high-entropy
   matches.** A 40-character base64 blob assigned to `AWS_SECRET_ACCESS_KEY`
   is a near-certain secret; the same blob as a value in a `translations.json`
   test fixture is very likely not. A naive implementation that only regexes
   the value misses this; the fix is to also weight the **variable/key name
   on the same line** (`_SECRET`, `_TOKEN`, `_KEY`, `_PASSWORD`, `_CREDENTIAL`
   suffixes) alongside the entropy score.
3. **Ambiguous formats need ranked candidates, not a forced single guess** —
   SecurityWall's own approach (surface multiple candidate matches, rank by
   confidence) is the right shape; many short generic-looking tokens
   (32-hex-char strings, for example) are structurally identical across
   several vendors and it is dishonest to report just one.
4. **False-positive suppression needs an allowlist mechanism, or every demo/
   example/placeholder key in sample code, docs, and `.env.example` files
   trips the detector.** gitleaks solves this with rule-level and global
   allowlists (by regex/path/commit); a paste-based tool has no path/commit
   axis, so the equivalent is a small built-in denylist of known placeholder
   values (`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`, `AKIAIOSFODNN7EXAMPLE`,
   `your-api-key-here`, repeated single characters) plus low entropy in
   sequences like `000...0` or `aaaa...`.
5. **Detection must stay read-only and local — no verification call.** This
   is the sharpest boundary in the whole space: TruffleHog's differentiator
   (call the vendor API to confirm liveness) is *disqualifying* for this
   root, not aspirational. §6.7.2 explicitly scopes Detector as "read-only
   pre-pipeline gate; never auto-exfiltrate findings" — sending a
   just-found key to a third party to "verify" it is auto-exfiltration by
   definition, even if well-intentioned. SecurityWall's compromise (surface
   a copy-pasteable validation command, let the *user* choose to run it
   manually and knowingly) is the correct pattern to borrow if we ever add
   this — never automatic, never inside the same click as detection.
6. **Detector and Checker/Verifier are different jobs even though the UX
   temptation to merge them is constant.** SecurityWall's risk-tier +
   blast-radius + validation-command feature set, and the Chinese-market
   batch-key-validity-tester pattern found in the landscape survey
   (`weiruchenai1/api-key-tester`), both belong to "is this key still
   live" — a `checker`/`verifier` root concern requiring a network call to
   the vendor. Detector's job, full stop, is "does this text contain
   something that pattern-matches a known secret format, and how confident
   are we." Composing the two is a `compose.next` edge (detect → hand the
   match type to a checker), never a merged feature.
7. **Large-paste behaviour matters.** A `.env` dump is small, but a full
   log file, a diff, or a config bundle pasted in one go can be tens of
   thousands of lines; scanning must not block the UI thread on a naive
   single-pass regex-over-everything for very large input. Debounce +
   chunked/streamed matching (or a size warning past a threshold) avoids a
   frozen textarea on a 500KB paste — none of the fetched competitors
   documented this explicitly, but it is a predictable failure mode for any
   client-side regex engine run over unbounded pasted text.
8. **Line/position reporting, not just a flat list of matched strings.**
   A useful finding tells the user *where* in their paste the match is (line
   number, and ideally the surrounding key= context) so they can find and
   redact it — a bare list of "we found something that looks like a key"
   strings with no location is much less actionable once the paste is more
   than a few lines.

## 8. Chosen archetype

**Drop-and-verdict**, with a **live-scan** variant of the "no run button"
option evaluated and explicitly rejected for the default in favor of an
explicit **Scan** action (AquilaX's shape), for reasons below.

Why not the others:
- *Instant transform* — considered, but rejected as the default: unlike a
  base64 encode or case convert, a secret scan over a large paste
  (hundreds/thousands of lines) is not guaranteed to stay sub-100ms, and
  running full pattern+entropy matching on every keystroke of a
  password/config paste is wasted work most of the time (the user is still
  typing/pasting, not yet ready to be told). A deliberate Scan click also
  gives the user a clear moment "I am now checking this," which matters
  psychologically for a security tool more than for a formatter — false
  confidence from a half-typed paste flashing "0 findings" would be worse
  than an inert idle state. (We do allow a debounced live re-scan *after*
  the first explicit Scan, so edits don't require re-clicking — see journey
  step 4.)
- *Configure-then-generate* — wrong: there is nothing to generate; the tool
  classifies an existing paste, it does not produce a new artifact from
  options.
- *Decision wizard* — wrong: the user already has a concrete blob of text in
  hand; they are not choosing between abstract paths.
- *Two-pane compare* — wrong: one input, no second thing to diff against.
- *Inspect-and-drill* — close (findings could be "drilled into"), but the
  structure per finding is shallow (match string, type, confidence, line
  number) rather than a deep nested tree like a JWT payload or JSONPath
  result; drop-and-verdict's "one clear answer [pass/fail + list], detail on
  demand [expand a finding for line context]" framing fits better and keeps
  the primary read (clean vs. not clean) instant.
- *Batch queue* — wrong for Core: this is a fast synchronous single-paste
  operation, not a multi-file async job. (A future bulk/multi-file variant
  could live on the J surface, out of scope here — mirrors the treatment in
  encoding-detect's brief.)
- Plain *form + button* is close to what we chose but under-specifies it:
  "drop-and-verdict" additionally commits to the *verdict-first* result
  shape (a headline pass/fail + count, findings as detail) rather than a
  generic results blob, which is the part a plain form+button framing would
  leave unspecified.

## 9. Our design

### 9.1 Journey

1. Land on page: a single paste `Textarea` (primary, above the fold),
   matching AquilaX's single-affordance simplicity — no file upload for v1
   (pasting is the dominant real-world moment: "I'm about to paste this
   somewhere, let me check it first"; file upload is a lower-priority
   follow-on, not required to ship the Core tool). A one-line privacy
   statement sits directly above the textarea, unmissable, matching
   AquilaX's placement: "Runs entirely in your browser. Nothing is sent
   anywhere — not even to us." This line is not decoration; it is the
   single biggest trust lever this whole category has, per every competitor
   surfaced.
2. Below the textarea: **Scan**, **Load Sample**, **Clear** — the three-
   button row AquilaX already validated. Load Sample seeds a fake,
   obviously-placeholder credential set so a first-time user sees the
   result shape without pasting anything real.
3. Click **Scan** (or paste-and-scan is auto-triggered once, then any edit
   after the first scan re-scans on a ~300ms debounce — gives the "instant"
   feel for the common revise-and-recheck loop without paying the
   full-page-scan cost on every keystroke of the *first* paste).
4. **Result card** (verdict-first, per the drop-and-verdict archetype):
   - Headline: "No secrets found" (green) or "N possible secret(s) found"
     (amber/red), never a silent empty state — always an explicit verdict,
     matching the §6.5 "clear empty state" gate.
   - Findings list below the headline, one row per match: **type** (e.g.
     "AWS Access Key ID," "Stripe Secret Key," "generic high-entropy
     string"), **matched value** (masked by default — show first/last 4
     chars, click to reveal, never auto-displayed in full, since this is a
     page about *not* leaking secrets), **line number**, **confidence**
     (High/Medium/Low, mirroring SecurityWall's tiering but scoped to
     detection confidence, not exploitability risk), and a short **why**
     (e.g. "matches AWS access key prefix" or "high entropy (4.1 bits/char)
     assigned to a key named DB_PASSWORD").
   - Ambiguous matches show as multiple candidate types on one row (per
     domain know-how point 3), never forced into a single guess.
5. **Output actions:** Copy findings as JSON (agent-consumable, matches the
   encoding-detect precedent) and Copy as a redaction-ready text report
   (type + line, values still masked). No download-to-file needed for a
   paste-sized input; no forced export.
6. **Error / edge states:** empty input → idle state, no verdict card shown
   at all (there is nothing to have an opinion about yet) — different from
   encoding-detect's "always-visible skeleton," because a premature "No
   secrets found" on an empty textarea is actively misleading for a
   security tool. Very large paste (over a size threshold, e.g. 200KB) →
   still scans, but shows a brief "scanning…" state instead of blocking, and
   a note if analysis was capped. Binary/garbage paste → the pattern+entropy
   engine simply finds nothing structured; no special-cased error needed.
7. **Compose-next:** when a finding's type maps to a known vendor with a
   safe, side-effect-free validation approach, surface — as an optional,
   clearly separate, user-initiated action — a link/expand to "how to check
   if this is still active" (a copyable command a user runs themselves, per
   SecurityWall's pattern), never an automatic network call from this tool.
   This is a `compose.next` edge into a future `checker`/`verifier` tool,
   explicitly not bundled into this tool's own scan action.

### 9.2 Layout

- Above the fold: privacy statement, textarea, three-button row, and (once
  scanned) the verdict headline — all visible without scrolling on a normal
  viewport, mirroring AquilaX's tight vertical grouping.
- Options density: zero required options before scanning (§6.5 gate 1,
  instant use) — the full pattern+entropy library always runs; no
  "which key types to check" toggle to configure, matching both AquilaX and
  SecurityWall's zero-config approach.
- Findings list sits directly below the verdict headline, sorted by
  confidence (High first), each row collapsible to reveal line context.
- Mobile: single-column stack — privacy line, textarea, buttons, verdict,
  findings list; masked values and line numbers should not force horizontal
  scroll (wrap, don't truncate silently).

### 9.3 Must-have

*without these, users bounce back to a competitor*

- Explicit, unmissable "nothing leaves your browser" privacy statement above
  the input — the single strongest trust signal every competitor leads with.
- Broad vendor-prefix pattern coverage (hundreds of formats, not a dozen) —
  AquilaX/SecurityWall's headline numbers (800+/455+) set the bar; a thin
  20-pattern list reads as a toy.
- Entropy-based detection for generic/unstructured secrets, not just
  vendor-prefixed ones — SecurityWall and gitleaks both cover this; skipping
  it misses a large share of real leaks.
- Ranked/multi-candidate output for ambiguous matches, never a forced single
  guess (SecurityWall's own good behavior).
- Masked-by-default match display — none of the fetched competitors'
  descriptions confirmed masking, which makes this a place we can visibly
  do better without inventing a new capability class.
- JSON output for agent consumption via OpenAPI + MCP — none of the five
  competitors expose this at all.

### 9.4 Deliberately skipped

- Live credential verification (TruffleHog's differentiator) — out by
  design; verifying a key requires transmitting it to a third party, which
  contradicts the "never auto-exfiltrate" Detector contract in §6.7.2.
  Compose-next to a future manual-command Checker instead, never automatic.
- Risk-tiering / blast-radius explanation (SecurityWall's differentiator) —
  that is security-consulting-flavored Checker output, not detection; a
  future `checker/api-key-risk` tool can own it.
- File upload in v1 — paste is the dominant real-world trigger moment for
  this tool ("about to paste this somewhere else"); add file upload as a
  follow-on once the paste path is validated, not blocking Core ship.
- CI/repo scanning, git-history scanning, PR bots, webhook integrations
  (ZeroPath's whole product) — that is a different product tier (CI/repo
  tooling) than a "paste before you share" web gate; out of scope for this
  root entirely, not just this brief.
- Batch/multi-file async scanning — a J-surface candidate for later, not
  required for the Core synchronous tool.

### 9.5 Differentiator

**Our differentiator:** the full findings payload (type, confidence, line,
masked value, candidates, reason) is available via OpenAPI + MCP with the
exact schema the human page renders — none of the five competitors expose an
API at all (the closest, ZeroPath, gates its equivalent capability behind an
enterprise platform signup). Client-side-only execution matching the
category's own stated best practice, broad pattern + entropy coverage
matched to the strongest competitors, masked-by-default display (a real gap
none of the fetched pages confirmed having), and a `compose.next` edge into
a future verification tool instead of SecurityWall's blended
detect+validate scope or TruffleHog's automatic-exfiltration verification
model.

### 9.6 I/O contract

*for the implementer*

```
input:  { text: string, maxBytes?: number /* default cap, e.g. 262144 */ }
output: {
  verdict: "clean" | "found",
  findingCount: number,
  findings: Array<{
    type: string,              // e.g. "aws_access_key_id", "stripe_secret_key", "generic_high_entropy"
    confidence: "high" | "medium" | "low",
    line: number,
    maskedValue: string,       // e.g. "sk-...ab12"
    candidates?: string[],     // alternate type guesses when ambiguous
    reason: string             // e.g. "matches known vendor prefix", "entropy 4.3 bits/char on KEY-suffixed var"
  }>,
  truncated: boolean           // true if input exceeded maxBytes and was capped
}
```
Side effect: `pure`, explicitly `read`-only by contract — never calls any
third-party API to verify a finding (that is out of scope by design, see §7
point 5/6). Engine: wrap an existing open, actively-maintained rule set
(gitleaks' TOML pattern library is frozen/feature-complete per its README
and a reasonable base to port regex+entropy rules from; per 手搓禁止 do not
hand-roll the vendor-prefix regex catalog from scratch) rather than
inventing a new pattern list from memory.

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

- [ ] **Only two of the five competitors are interactive web tools** (§2):
      ZeroPath is a marketing page, gitleaks and TruffleHog are CLI engines
      with no UI. The web-journey teardown therefore rests on AquilaX and
      SecurityWall alone — thinner than the brief's five-name table suggests
      at a glance.
- [ ] **Neither interactive competitor was exercised with a real paste.**
      Their findings tables, confidence labels and redaction behaviour (§3,
      §4) come from page copy and entry-state captures, not observed results.
- [ ] **Our detection-rule set has no stated source or size.** The brief
      argues correctly that gitleaks-class regex rules plus entropy are the
      right shape, but does not say which rule corpus we ship, how many
      patterns, how it is updated, or what false-positive rate is acceptable
      — the three things that decide whether this tool is trusted.
- [ ] **"Never auto-exfiltrate" is a design commitment with no stated test**
      (§9.4). For a tool whose input is by definition secret material, the
      privacy claim (§10 gate 8) needs to be verifiable — client-side-only
      execution, no telemetry on input, and a written retention statement —
      before ship, not after.
- [ ] **The `checker/api-key-risk` and manual-verification tools this brief
      composes to (§9.4) do not exist**; the hand-off is a plan, not a link.
- [ ] **Mobile behaviour unverified** for both interactive competitors
      (desktop captures only).
- [ ] **The demand corroboration in §2 is carried over from the prior
      landscape survey and not re-verified this pass.**
- [ ] **Meter id and error codes are not yet decided** (§10 gates 5, 7).
      Side effect is declared `pure` in this brief.
