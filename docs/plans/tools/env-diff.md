# Tool brief: env-diff

Root: **Comparator** (Thin, target ≥5 — §6.7.9) — one of the four Comparator entries brought to parity in this pass. Object: `.env` (dotenv-format) key/value configuration files.

## 1. Demand

- **JTBD:** "Why does staging behave differently from production" / "did I forget to set a variable before this deploy" — a pre-deploy or pre-PR check that two `.env` files (dev vs. staging vs. prod, or a branch's `.env.example` vs. a teammate's local `.env`) have the same *keys*, and that the values which differ are the ones that are *supposed* to differ.
- **Keywords:** env diff, .env file comparison, compare env files, env variable diff, dotenv compare, env parity check.
- **Pain:** Config drift between environments is one of the most common causes of "works on my machine" and silent production breakage — a missing `STRIPE_WEBHOOK_SECRET` or a stale `DATABASE_URL` doesn't fail at build time, it fails at runtime, often in front of a customer. `.env` files are also the one artifact developers are trained *not* to commit or paste into a generic online diff tool, because they hold live credentials — so a generic text-diff tool (or a shared Slack paste) is actively the wrong instrument for this job.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| **EnvDiff** | https://envdiff.com/ | Yes — WebFetch (full read) + screenshot | `docs/research/forge/env-diff/envdiff-com.png` |
| **QuickToolsFor.Me Env Variable Manager** | https://quicktoolsfor.me/tools/env-manager/ | Yes — WebFetch (full read) + screenshot (landscape stage had this as search-snippet-only; reached directly this pass) | `docs/research/forge/env-diff/quicktoolsfor-me-env-manager.png` |
| **FileDiffs ENV Compare** | https://filediffs.com/env-compare | Yes — WebFetch (full read) + screenshot (landscape stage had this as search-snippet-only; reached directly this pass) | `docs/research/forge/env-diff/filediffs-env-compare.png` |
| **online-env-diff (GitHub + live GitHub Pages app)** | https://github.com/arturssmirnovs/online-env-diff / https://arturssmirnovs.github.io/online-env-diff/ | Yes — WebFetch on the repo (README/stack) + screenshot of the **live deployed app**, which the landscape stage had only as an unreached GitHub link | `docs/research/forge/env-diff/online-env-diff-github-io.png` |

All four named competitors from the landscape stage were reached directly this pass (three were upgraded from search-snippet/unreached to fully fetched + screenshotted). No competitor was invented or substituted.

## 3. Feature inventory

**EnvDiff** — the fullest single-purpose spec of the category, and the one the landscape stage already flagged as the feature bar to clear.
- Core strength: two upload-or-paste panes labeled "Environment 1 (e.g., Development)" / "Environment 2 (e.g., Production)", each with its own "Upload .env" button and a paste textarea pre-filled with a realistic placeholder example.
- **Comparison Options**: "Ignore comments and empty lines" (checked by default), "Case-insensitive comparison" (unchecked by default), "Highlight potential secrets" (checked by default).
- **Security & Privacy** panel, separate from Comparison Options: "Enable custom redaction patterns" toggle that reveals a textarea for one-regex-per-line custom redaction (placeholder example: `(?i)(password|secret|key|token).*=.*`).
- Feature list (marketing copy, not all confirmed live in the results view since the page was fetched pre-interaction): Secret Detection ("automatically identifies API keys, passwords, and other sensitive data"), CORS Validation ("ensures ALLOWED_ORIGINS are properly configured for each environment" — a surprisingly specific, framework-shaped feature), Parity Checking ("detects missing environment variables between development and production"), Security Recommendations ("smart suggestions to improve configuration security"), Regex Redaction.
- Explicit gated **Pro tier** promoted above the fold before the tool itself: Configuration Presets, Shareable Links, Team Workspaces — i.e. the free tool is deliberately positioned as a funnel into a paid product, with upsell banners appearing *before* the user ever reaches the input panes.
- Single "Compare Environments" button — button-gated, not live.
- Explicit privacy claim: "Our tool works entirely in your browser — no data is sent to any server, ensuring your sensitive environment variables remain completely private and secure."
- No export/copy action observed on the page (comparison results render below the button but no Copy/Download control was described in the fetched content or visible above the results placeholder).

**QuickToolsFor.Me Env Variable Manager** — confirms the "parse table, not just diff" demand the landscape stage flagged.
- **Two modes as tabs**: "Parse" (default) and "Diff" — Parse mode takes one `.env` and renders it as a searchable key/value table; Diff mode compares two.
- Single textarea per active mode (Parse shows one, Diff presumably shows two — not confirmed from the fetched Parse-mode view), "Load Sample" and "Clear" utility buttons.
- **Diff Color Legend** documented explicitly: green = added, red = removed, yellow/orange = changed value, neutral = identical — a fixed, explained color vocabulary rather than an ad hoc coloring.
- Long educational content below the tool: ".env File Syntax" reference (comments, quoting), a "Best practices" section (`.gitignore`, `.env.example`, secrets managers), and an FAQ.
- Explicit privacy claim: "no data is sent to any server... environment variables never leave your device."
- Sits inside a 100+-tool station (persistent left category sidebar, global search) — same station-competitor shape as Aback Tools in the line-ending-detect brief.
- No ads, no premium upsell observed.

**FileDiffs ENV Compare** — station competitor, most explicit about the *key-based, not line-based* diff model.
- Core strength stated directly in its own copy: **"The comparison treats a `.env` file as a set of key=value pairs, not lines, which is what makes it reliable. Variable names are matched key by key... regardless of line order... Comments and `${VAR}` placeholders are shown unchanged."** — this is the single most important domain claim any competitor makes in this research pass (see §7).
- Reports three diff classes explicitly: missing variables (present in one file, absent in the other), added variables, changed values for matching keys — with the copy noting "it flags variables were added, removed, or changed in value — the difference between a working environment and a broken one."
- States it handles "quoted values, export prefixes, inline comments, and multi-line values" as parsing edge cases (marketing claim, not independently verified from the page's live tool — the fetched content is the informational/SEO page, not an interactive session).
- **Tiered feature gate**: free tier is "side-by-side view" only; "line-by-line and unified modes" are Premium-only — i.e. the comparison *view format itself* is the paywall, not extra data.
- Suggests a manual workaround for a real gap: "sort both files alphabetically before comparing... unless order matters" — implying the tool does not always normalize key order for the human view, so the user is told to pre-sort their own input.
- Heavy SEO scaffold: ~10 prose sections below the tool (Setting Up, How ENV Files Are Structured, ENV Comparison in the Real World, Everything Flagged in an ENV Comparison, Comparison Examples Illustrated, ENV Compare vs Text Diffs, Key Features, FAQ, 6-tool cross-sell grid, review carousel with 3 reviews).
- Explicit privacy claim, repeated multiple times in the page copy: "Secrets never leave your browser — free, no account, nothing uploaded."

**online-env-diff** — the smallest, most literal implementation, and the only one of the four actually exercised live (its GitHub Pages deployment is a static, functioning app, not a marketing page).
- Two plain textareas ("First" / "Second"), no options, no toggles, no upload — paste-only.
- Below the two textareas: a **live results table** with four columns — **KEY / FIRST / SECOND / DIFF** — one row per key found in the union of both files.
- The **DIFF column does inline, character-level diffing within the cell**: e.g. for `APP_DEBUG` going from `true` to `false`, the cell renders `trufalse` with `tru` struck/colored red (removed) and `false` colored green-ish/kept — a genuine char-diff, not just "old → new" text. Unchanged values render in muted gray in all three columns. Changed values render old-in-red / new-in-green in the FIRST/SECOND columns and the merged char-diff in the DIFF column.
- Rows exist even for keys with an empty value on both sides (e.g. `APP_KEY=` blank in both) and for keys present with a value on only one side (`DB_PASSWORD` blank-then-`password`, rendered green/added) — confirming the tool computes the **union of keys**, not the intersection, and represents "missing on one side" as an empty-string row rather than omitting the row.
- Interpolated placeholders (`MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"`) are shown as the literal string, unresolved, on both sides — no attempt at variable expansion.
- Built with Vue.js + TypeScript, using the `envfile` npm package for parsing and the `diff` npm package for the char-level diff — a from-scratch, single-purpose tool by an independent developer, no ads, no options, no export button, no privacy statement (implicitly client-side by virtue of being a static GitHub Pages app with no backend).
- README documents no explicit limitations; the tool itself is feature-minimal but functionally correct on its one example.

## 4. Journey maps

**EnvDiff:**
1. Land on a page whose *first* visible content is a Pro-tier upsell banner ("Upgrade Now") and three Pro feature cards — before the free tool is reached at all.
2. Scroll past that to the H1 ("Free .env File Comparison Tool") and three benefit badges (Instant Comparison / Security Detection / Deployment Safety).
3. Two side-by-side panes, each independently accepting Upload or Paste — user fills Environment 1 then Environment 2 (order implied by pane labels, not enforced).
4. Below both panes: a **Comparison Options** column (three checkboxes) and a separate **Security & Privacy** column (redaction toggle + regex textarea) side by side, then a single primary **Compare Environments** button to the right of both option columns.
5. Click required — nothing computes on paste; the "Comparison Results" area is an empty placeholder heading until the button is clicked.
6. No export/copy control was observed in the fetched content — the results view itself was not captured live (would need form interaction beyond WebFetch's static read), so the *result* layout is the one open gap in this teardown.
7. Below the tool: five numbered "How to Compare .env Files" steps repeating the same sequence back to the user, then footer link columns (Features / For Developers) — moderate SEO scaffold, lighter than FileDiffs.

**QuickToolsFor.Me:**
1. Land inside the station's dark, code-editor-styled shell (persistent tool sidebar, global ⌘K search) directly on the "Env Variable Manager" tool — no upsell above the fold.
2. Parse/Diff mode toggle at the very top, defaulting to **Parse** — i.e. the *first* thing offered is single-file inspection, not comparison; Diff is one click away.
3. Load Sample / Clear utility buttons sit next to the mode toggle, then one large textarea ("Paste your .env file here...").
4. Not confirmed live whether Parse-mode's table appears without a button (the "Instant transform" framing of "paste .env into a table" would suggest live-as-you-type, matching the station's other formatter tools) — the fetched content describes the feature but the interactive re-render was not exercised.
5. Educational content (syntax reference, best practices, FAQ) sits below the tool, scoped tightly to `.env` semantics rather than generic filler.

**FileDiffs:**
1. Land on a long marketing/SEO page; the interactive tool itself sits in a compact card near the top — two drop-in panes labeled "Original" and "Modified", each with an icon, above a "Compare Now" primary button and a "Use Sample Data" secondary button.
2. Three trust badges directly under the buttons: "Files Never Leave Device" / "Secure Local Processing" / "Advanced Proprietary Engine" — privacy-as-marketing, placed at the point of highest attention (right where the user is about to click Compare).
3. A cookie-consent banner overlays the page on load (visible in the captured screenshot), which the user must dismiss before reaching the tool cleanly — friction not present in the other three.
4. Click-gated: "Compare Now" is the explicit trigger; free tier renders "side-by-side view", Premium unlocks "line-by-line and unified modes" — so *which comparison layout you get* depends on account tier, not on the data.
5. Below the tool: ~10 long-form sections (see feature inventory) the user must scroll past to reach the FAQ, cross-sell grid, and review carousel — the heaviest content-to-tool ratio of the four.
6. Large-input behavior, mobile behavior, and keyboard navigation are not addressed anywhere in the fetched copy.

**online-env-diff (the one live interactive competitor exercised):**
1. Land directly on the tool — logo, tiny wordmark (".ENV DIFF"), then immediately two side-by-side plain textareas, "First" and "Second", pre-filled in the captured screenshot with a real Laravel `.env` pair (this looks like a persisted/demo state rather than an empty first-load, since there is no visible "Load Sample" control — worth noting as ambiguous, not asserted as confirmed live-on-empty behavior).
3. **No visible run button anywhere in the captured screenshot.** The results table sits directly below the two textareas with all rows already rendered — the strongest signal among the four competitors that this is a **live, no-button** diff, consistent with the small dataset size making a debounced live diff trivial.
4. Result table has one row per key (union of both files), four columns (KEY/FIRST/SECOND/DIFF), inline char-level highlighting in the DIFF column, muted gray for identical rows so the eye is drawn only to colored (changed) rows.
5. Navigating between differences: no jump-to-next-diff control, no filter/hide-identical toggle — the user scans the full table top to bottom; for the ~40-row example this is fine, but there is no stated behavior for a very large `.env` (hundreds of keys).
6. Exit: a single small "★ Star" GitHub badge at the bottom — no copy, no download, no JSON export of any kind. This is the weakest exit path of the four.
7. Large-input behavior: unaddressed; no pagination, no virtualization visible, no stated row limit.

## 5. Layout + screenshots

- **EnvDiff**: single centered column; top-loaded with Pro-tier upsell (banner + 3 cards) before the free tool starts, then a two-column input grid (Environment 1 / Environment 2, equal width), then a two-column options grid (Comparison Options / Security & Privacy) with the primary action button placed to the right of both option columns rather than below them, then an empty results placeholder, then ~4 educational sections and a footer. See `envdiff-com.png`.
- **QuickToolsFor.Me**: two-column app-shell (persistent left tool-category sidebar + main content), dark theme, mode-toggle (Parse/Diff) immediately above one large textarea — the leanest above-the-fold layout of the four, no options grid, no upsell. Reference/FAQ content below is scoped and technical, not generic filler. See `quicktoolsfor-me-env-manager.png`.
- **FileDiffs**: single centered column, dark theme; a compact two-pane input card (Original/Modified) with trust badges directly beneath the action buttons sits near the top, but is preceded by a cookie-consent overlay and followed immediately by ~10 long prose sections before any cross-sell/FAQ/review content — by far the highest content-to-tool ratio of the four, though the tool card itself is not cluttered. See `filediffs-env-compare.png`.
- **online-env-diff**: the simplest and most tool-forward layout of the four — logo/wordmark, two equal-width plain textareas side by side, then a full-width results table directly below with no intervening button, no options row, no sidebar, no ads, no cross-sell. Everything the user needs is above the fold at typical desktop width; the only page chrome below the table is a GitHub star badge. See `online-env-diff-github-io.png`.
- **Mobile**: not directly observed for any of the four (all captures are desktop-viewport); EnvDiff's and online-env-diff's side-by-side two-pane inputs, and FileDiffs' Original/Modified pair, would all need explicit mobile stacking (input A above input B, full width each) — the same stacking concern the line-ending-detect brief raised for hidekazu-konishi.com's two-pane text mode.

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- `docs/research/forge/env-diff/envdiff-com.png`
- `docs/research/forge/env-diff/quicktoolsfor-me-env-manager.png`
- `docs/research/forge/env-diff/filediffs-env-compare.png`
- `docs/research/forge/env-diff/online-env-diff-github-io.png`

## 6. Their debt

- **EnvDiff**: heaviest commercial debt of the four — a paid Pro tier (Configuration Presets, Shareable Links, Team Workspaces) is marketed *above* the free tool itself, meaning the first thing a new visitor sees is an upsell, not the input. No confirmed export/copy action in the results view. CORS Validation is a suspiciously specific claim (checking `ALLOWED_ORIGINS` values) that reads like a single hardcoded rule rather than a generalizable feature — worth being skeptical of, not worth copying uncritically.
- **QuickToolsFor.Me**: least debt of the four — no ads, no upsell, tightly scoped reference content. The gap: Diff mode's exact live/button-gated behavior and its results layout were not directly exercised in this pass (WebFetch reads the static/initial page state, not post-interaction DOM) — an honest gap in this teardown, not a claim either way.
- **FileDiffs**: a cookie-consent overlay sits between the user and the tool on every fresh visit; the comparison *view format itself* (line-by-line/unified vs. side-by-side-only) is paywalled, an unusual place to put a tier gate since it withholds a rendering choice rather than extra capability; ~10 SEO sections plus a review carousel and cross-sell grid below the tool is the heaviest content debt observed. No confirmed API.
- **online-env-diff**: real functional debt, not chrome debt — no copy button, no download, no JSON export, no options (no ignore-comments, no case-insensitivity, no secret redaction at all), no stated behavior for large files, no navigation aid for many differences (no "next diff" jump, no hide-identical filter). It is the cleanest journey of the four and the only one confirmed genuinely live/no-button, but it is also the least complete tool — a solo developer's minimum viable version of the category, exactly as the landscape stage characterized it.
- **All four**: none expose a documented API, OpenAPI schema, or MCP surface — all are human-only pages, which is where this Forge tool's agent contract is the entire differentiator, not an incremental one.

## 7. Domain know-how

1. **Identity is the key, not the line.** FileDiffs states this directly and it is the single load-bearing rule of the whole category: "The comparison treats a `.env` file as a set of key=value pairs, not lines... Variable names are matched key by key... regardless of line order." A naive implementation that runs a generic line-by-line text diff (Myers/LCS over raw lines) will report a false "everything changed" the moment someone reorders, alphabetizes, or regroups variables between two otherwise-identical files — exactly the class of noisy-diff complaint the line-ending-detect brief flagged for git, but here it is the *tool's own algorithm* that must not make that mistake, not an upstream VCS. The diff must first parse both sides into `Map<key, value>`, then diff the maps.
2. **The comparison base is the union of keys, not the intersection.** online-env-diff proves this in its live table: keys present in only one file still get a row, with an empty string on the missing side. A naive implementation that only diffs keys present in *both* files silently drops the single most valuable signal for this category — "this key exists in prod but was never added to staging" (or vice versa) — which is the literal parity-check JTBD from §1. Missing-entirely must be a distinct, first-class diff status, not folded into "changed" or omitted.
3. **`export ` prefixes and inline comments must be stripped before key extraction, not treated as part of the key or value.** FileDiffs' marketing copy calls out "export prefixes" and "inline comments" as parsing edge cases it claims to handle; a naive line-based key=value split on `export DATABASE_URL=postgres://...` will either fail to extract a key at all or produce the wrong key (`export DATABASE_URL` instead of `DATABASE_URL`), and a naive split on `PORT=3000 # dev only` will pollute the value with the trailing comment text if the parser doesn't respect `#` as a comment delimiter outside of quotes.
4. **Quoting is a value-representation choice, not a value-identity choice — but only outside the payload.** `API_KEY=abc` and `API_KEY="abc"` should compare as *the same value* for parity purposes (dotenv parsers strip matching quotes), but `API_KEY="abc def"` is legitimately different from `API_KEY=abc` `def` (unquoted, the latter is invalid/truncated by most parsers at the space). The rule: strip one layer of matching `'...'`/`"..."` quoting when present before comparing values, but never strip quotes that are part of an odd number or mismatched pair — treat those as parse warnings, not silent normalization.
5. **`${OTHER_VAR}` interpolation must be compared literally, never resolved.** online-env-diff shows Laravel-style `MIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"` rendered as the literal string on both sides, unexpanded — the correct behavior. Interpolation syntax and semantics differ by *consumer* (`dotenv` does not expand; `dotenv-expand` does; Docker Compose expands `${VAR}` and `$VAR` at file-read time; Laravel/PHP dotenv has its own nesting rules) — this tool has no way to know which consumer will read the file, so resolving the reference would mean silently picking one consumer's semantics and getting it wrong for everyone else. Comparing the literal reference string is the only consumer-agnostic, correct choice.
6. **Duplicate keys within one file: last-value-wins is the dotenv convention, and the earlier occurrence(s) should be flagged, not silently discarded.** None of the four competitors' fetched content mentions duplicate-key handling at all — this is a real gap in the researched competitors, not a parity item, but it is a known dotenv-parser behavior (most implementations, including Node's own `dotenv` package, let the last occurrence of a key win) that a naive implementation could get backwards (first-wins) and silently produce a wrong comparison. Our parser should apply last-wins and surface a `duplicateKeys` warning listing which keys and how many times, per file.
7. **Case sensitivity default should be case-sensitive, with an explicit opt-in toggle for case-insensitive comparison — matching EnvDiff's own default.** POSIX shells and virtually every language's `os.environ`/`process.env` treat variable names as case-sensitive; `Api_Key` and `API_KEY` are two different keys everywhere except Windows' process environment, which is case-insensitive by OS convention. EnvDiff's own default (checkbox unchecked = case-sensitive) matches this; a tool that silently folds case would incorrectly merge two genuinely distinct variables on POSIX targets, which is the majority deploy target for this audience.
8. **Comments and blank lines are not just "noise to ignore" — a variable that is present-but-commented-out on one side is a distinct signal from fully absent.** EnvDiff's "Ignore comments and empty lines" option treats bare comment lines as noise (correct — a `# Database config` header line carries no key), but a commented-out *assignment* (`# API_KEY=xxx`) is different: it usually means "this variable exists and is documented, but intentionally disabled/unset here," which is a distinct, useful status from "this key was never mentioned in this file at all." A high-quality implementation should detect the commented-assignment pattern separately and report it as a `commentedOut` status alongside `present`/`missing`, not silently discard it as ignorable noise the way a naive "strip all `#...` lines first" pass would.
9. **Secret detection here is necessarily a heuristic on the *key name*, not the value's entropy — and that heuristic has a known false-negative class worth stating plainly.** EnvDiff's "Highlight potential secrets" and its example redaction regex (`(?i)(password|secret|key|token).*=.*`) both operate on matching the *key name* against a keyword list. This correctly flags `API_KEY`, `DB_PASSWORD`, `STRIPE_WEBHOOK_SECRET` — but it will miss a genuinely sensitive value sitting behind an innocuous key name (e.g. `CONFIG_BLOB=<base64-encoded credentials>`), and it will also false-flag a harmless key that happens to contain a keyword (`SECRET_SANTA_NAME=Alice`). No competitor claims true entropy-based detection, and neither should this tool without saying so — the honest framing is "keyword-based heuristic, not a security scanner," matching the disclosure standard the line-ending-detect brief set for its own encoding-detection caveat.
10. **Redacting a secret for display must not destroy the ability to tell "same secret on both sides" from "different secret on both sides."** If a matched-as-secret value is simply replaced with a fixed string like `[REDACTED]` on both sides, an unchanged secret (good — parity holds) becomes visually indistinguishable from a rotated secret (bad — a real drift the user needed to see). The correct approach is to redact the *displayed characters* (e.g. show only the first/last 2 characters, or a fixed-length mask) while still comparing and reporting equality/inequality of the underlying raw value — so the verdict ("secret is the same on both sides" / "secret differs") survives redaction even though the value itself never renders.

## 8. Chosen archetype

Per §6.7.10's own table, **Two-pane compare** is "side-by-side inputs, synchronized structured output," explicitly listed as fitting "the diff family, comparators" — and this tool's own root is **Comparator**. Every one of the four researched competitors independently converged on exactly two input surfaces (First/Second, Original/Modified, Environment 1/Environment 2) feeding one synchronized output — this is not a design choice this category has any real variance on; it is the shape of the JTBD itself (compare *this* environment against *that* one).

Why the other six are wrong here:
- **Instant transform** — wrong shape: a transform takes one input and produces one output *derived from it* (base64 encode, case convert). A diff has two independent inputs of equal status — neither is "the" input being transformed into the other — and produces a relationship *between* them, not a transformation of either.
- **Configure-then-generate** — no configuration produces this tool's output; the options (ignore-comments, case-insensitivity, secret-redaction) modify *how the comparison is computed and displayed*, they do not generate content the way a `.gitignore`-by-stack picker or a QR generator's options do. This tool has nothing to "generate" absent two real inputs.
- **Decision wizard** — the user is not uncertain about what they want and does not need narrowing questions; they already have two specific files in mind and want the delta between them, immediately.
- **Drop-and-verdict** — closest false-positive: EnvDiff's UI momentarily resembles a "drop file, get answer" shape because each pane has an independent Upload button. But the *output* is not a single verdict about one file (like a checksum or file-type detect) — it is a row-by-row relationship between two files, which is squarely what Two-pane compare exists to name as distinct from Drop-and-verdict.
- **Inspect-and-drill** — this tool does not hand the user one decoded structure to explore at their own pace (JWT claims, a JSONPath tree); the output is a fixed, complete table computed the moment both inputs exist. There is detail-on-demand in the sense of expanding a row's raw values, but the primary interaction is scanning a synchronized diff, not open-ended exploration of a single object's internals.
- **Batch queue** — no async job, no progress bar, no "download all" step; this is a two-input, synchronous, in-browser computation. N-files-over-time (e.g. diffing every environment against a canonical baseline in one job) belongs to the Processor root wrapping this same comparison logic, per the same Detector/Processor split the line-ending-detect brief drew for its own category, not to a bespoke batch mode bolted onto this Comparator tool.
- **"Form + button"** — the trap here is exactly EnvDiff's and FileDiffs' own pattern: gate a cheap, deterministic key/value comparison behind an explicit "Compare" click. online-env-diff proves the computation is cheap enough to run live; a button adds a full extra interaction for zero computational reason once both panes have content.

## 9. Our design

### 9.1 Journey

*This brief writes the journey inline in 9.2 Layout rather than as a separate step sequence — carried into §11 as an open item.*

### 9.2 Layout

**Layout** — two equal-width input panes side by side, options row between inputs and output, live synchronized table below, no view-format paywall:

- **Top**: two equal-width panes, labeled **"Environment A"** and **"Environment B"** (neutral, not "Dev"/"Prod" — the user's two files may be any pairing: two branches' `.env.example`, a teammate's local vs. CI secrets template, etc.). Each pane accepts paste directly into a textarea or drag-and-drop file upload (`.env`, `.env.local`, `.env.*`, or extensionless — dotenv files commonly have no extension). Matches EnvDiff's and online-env-diff's dual-entry pattern, the pattern every competitor converged on.
- **Options row**, directly below both panes, compact and inline (not a two-column grid like EnvDiff's, which visually implies two unrelated feature sets — ours is one row because every option modifies the same single comparison pass): **Ignore comments and blank lines** (on by default), **Case-insensitive key comparison** (off by default, per domain know-how #7), **Redact detected secrets** (on by default, per domain know-how #9 — safer default than EnvDiff's, which is also on by default, so this is parity not a regression).
- **No "Compare" button.** The moment both panes have content, the diff computes and the table renders below — live, per domain know-how and per online-env-diff's proof that this is cheap enough to be instant. A visible, small "Recomputing…" affordance covers the rare large-file case where a debounce is needed, so the UI never looks frozen.
- **Result table**, five columns: **Key / Value A / Value B / Status / Note**. `Status` is one of `unchanged` (muted gray, collapsed by default behind a "Show unchanged (N)" toggle so the table opens showing only the rows that matter — closing the "scan the whole table" gap online-env-diff leaves open per journey map point 5), `changed` (both values shown, char-level highlight within each value per online-env-diff's inline-diff pattern), `added` (present only in B), `removed` (present only in A), `commentedOut` (per domain know-how #8 — shown with a distinct icon/note, e.g. "commented out in A"). Redacted secret rows show a fixed-length mask in Value A/B but still render the correct `changed`/`unchanged` status per domain know-how #10.
- **Warnings panel**, small and dismissible, above the table: duplicate-key warnings (know-how #6) and quote-mismatch warnings (know-how #4), each naming the file and key — this is diagnostic information about the *inputs*, distinct from the diff result itself, so it does not compete with the table for primary attention.
- **Navigation between differences**: a small "N differences · ↑ ↓" control that jumps focus between non-`unchanged` rows — closing the exact gap online-env-diff's plain table leaves for large files.
- **Exit actions**: **Copy as Markdown table** (for a PR comment or Slack message — the most common human destination for this result), **Copy as JSON** (identical shape to the API response, so power users script around the page without leaving it), **Download JSON**. No competitor offers any export path except a raw page render, and online-env-diff — the only one confirmed genuinely live — offers none at all; this is a clean gap to close.
- **Big input**: no competitor states a size limit; the union-of-keys diff is an O(n) map-merge regardless of file size, so the only practical limit is textarea/paste performance for very large pastes (thousands of lines) — chunked/streamed parsing keeps the live diff from blocking the main thread, an implementation detail rather than a UX change.
- **Empty/error state**: with zero or one pane filled, show a neutral placeholder ("Add a second environment to see the comparison") rather than a false empty-diff or a `0 differences` result.
- **Malformed line handling**: a line that is neither a valid `KEY=value` assignment, a comment, nor blank (e.g. a stray fragment from a bad paste) is reported per-file as a `parseWarning` with its line number, and excluded from the key-level diff rather than silently guessed at.

### 9.3 Must-have

**Must-have features** (without these, a user bounces back to a competitor):
1. Live, no-button diff the moment both panes have content (parity with online-env-diff, the only competitor confirmed to do this; a genuine improvement over EnvDiff's and FileDiffs' click-gated flow).
2. Union-of-keys diff with a distinct `added`/`removed`/`changed`/`unchanged` status per key (parity with online-env-diff's table model; strictly better than a binary same/different check).
3. Secret detection + redaction that preserves the changed/unchanged signal under redaction (parity with EnvDiff's headline feature, closing the equality-under-redaction gap that gap analysis in know-how #10 shows none of the four competitors' fetched copy addresses).
4. Ignore-comments and case-insensitive options (parity with EnvDiff, the feature-ceiling competitor on options).
5. Both copy (Markdown for humans, JSON for machines) and download exit paths (a real gap versus all four competitors, none of which document any export path beyond the rendered page).

### 9.4 Deliberately skipped

**Deliberately skipped** (and why):
- **Custom regex redaction patterns** (EnvDiff's advanced feature) — real value for power users with nonstandard key naming, but adds a second redaction system (keyword heuristic + user regex) to reason about and test; deferred to a follow-up pass once the keyword-heuristic default (must-have #3) is proven in production, rather than shipping both half-baked in the first version.
- **CORS-specific validation** (EnvDiff's "CORS Validation" feature) — this is a single hardcoded business rule about one specific key pattern (`ALLOWED_ORIGINS`), not a generalizable `.env`-diff capability; it belongs, if anywhere, to a dedicated CORS-config checker tool, not folded into a general-purpose Comparator.
- **Shareable links / team workspaces / saved presets** (EnvDiff's Pro tier) — these are account/persistence features, not part of the comparison journey itself, and per §6.7.10's stated edge ("Agent/API path stays clean... free of Tier X clutter") we are not gating any part of the comparison view behind a paid tier the way EnvDiff and FileDiffs both do.
- **Line-by-line / unified diff rendering modes** (FileDiffs' Premium-only feature) — our key-based table view (know-how #1) is deliberately the *only* view, because a line-based unified-diff rendering re-introduces the exact line-order false-positive problem this tool exists to avoid; offering it as an alternate view would undercut the tool's own core claim.
- **Batch/multi-file comparison** (e.g. diffing one baseline against N environments at once) — real value, but belongs to the Processor root's async job surface wrapping this same two-file comparison logic, not to a bespoke N-pane UI on this Comparator tool, mirroring the exact Detector/Processor split the line-ending-detect brief drew.
- **Value interpolation/resolution** (`${VAR}` expansion) — deliberately never resolved, per domain know-how #5; this is a permanent design decision, not a deferred feature.
- **SEO filler / doorway links / affiliate boxes / cookie-consent-gated access** — all four competitors carry some form of this (FileDiffs heaviest, with a cookie wall placed between the user and the tool itself); per §6.7.10 none of it belongs inside or adjacent to the tool workflow.

### 9.5 Differentiator

- **Agent contract with structured diff classes, not rendered HTML.** All four competitors are human-only pages with zero documented API. This tool returns the same key-level diff — `added` / `removed` / `changed` / `unchanged` / `commentedOut` — as typed JSON via OpenAPI + MCP, so a CI pre-flight step or a deploy-gate agent can call it directly instead of shelling out to a one-off `diff <(sort a.env) <(sort b.env)` (which, per domain know-how #1, gets key-vs-line identity wrong the moment either file's key order differs).
- **Union-of-keys, five-way status model, not a binary same/different flag.** Building in the `commentedOut` status (know-how #8) and the explicit `missing`-on-one-side status (know-how #2) as first-class values in the output schema — a strict superset of what EnvDiff (added/removed/changed, no commented-out signal) and online-env-diff (added/removed/changed, no comments distinction at all since it strips them) each expose.
- **Redaction that preserves the equality signal (know-how #10).** None of the four competitors' fetched copy describes this nuance; EnvDiff's redaction feature is described only as masking for *display*, with no stated guarantee that a masked-but-unchanged secret is distinguishable from a masked-and-rotated one. We make that guarantee explicit in both the human view and the machine payload (`secretChanged: boolean` survives even when `valueDisplay` is masked).
- **No commercial gate on the comparison view itself.** FileDiffs paywalls the rendering mode (line-by-line/unified vs. side-by-side); EnvDiff funnels toward a Pro tier before the user even reaches the input. Our full comparison — every diff class, every option — is available in the free/human tier with no view-format tax; per §6.7.10's stated edge, ads (if any) never sit inside the tool workflow and the Agent/API path is free of that clutter entirely.
- **Live, no-button diff for typical `.env` sizes** — matching online-env-diff's live behavior (the only competitor confirmed to do this) rather than EnvDiff's and FileDiffs' click-gated "Compare" button, which is a pure step-tax for a computation this cheap.

### 9.6 I/O contract

**I/O contract sketch** (for the OpenAPI/MCP surface, §6.5 gate 2):

```text
input:
  envA: string             # raw .env content, pane A — required
  envB: string             # raw .env content, pane B — required
  options?:
    ignoreComments: boolean       # default true
    caseInsensitiveKeys: boolean  # default false
    redactSecrets: boolean        # default true

output:
  entries: Array<{
    key: string
    valueA: string | null          # null = key absent in A; redacted values masked per options.redactSecrets
    valueB: string | null          # null = key absent in B
    status: enum<unchanged, changed, added, removed, commentedOutInA, commentedOutInB>
    isSecret: boolean              # key-name heuristic match, per domain know-how #9
    secretChanged?: boolean        # present only when isSecret; survives redaction, per domain know-how #10
  }>
  counts: {
    unchanged: number, changed: number, added: number, removed: number, commentedOut: number
  }
  warnings: Array<{
    file: "A" | "B"
    type: enum<duplicateKey, quoteMismatch, unparsableLine>
    key?: string
    line?: number
    message: string
  }>
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

- [ ] **No competitor's result view was seen live.** WebFetch returns the
      static/SEO page; producing a result needs form interaction the capture
      tooling does not perform. So EnvDiff's and FileDiffs' *result* layout,
      their export controls (if any), and whether EnvDiff's Parse mode renders
      live or behind a button (§4) are all inferred from page copy, not
      observed. This is the single largest hole in this teardown — re-verify
      with a real browser session before treating "no competitor offers an
      export path" (§9.5) as confirmed rather than strongly indicated.
- [ ] **EnvDiff's parsing-edge-case claims** ("quoted values, export prefixes,
      inline comments, multi-line values", §3) are marketing copy, not
      exercised behaviour. Our own parity claims should be checked against our
      implementation, not against theirs.
- [ ] **Mobile behaviour unverified** for all four competitors — desktop
      captures only.
- [ ] **The journey is written inline in §9.2 rather than as an explicit step
      sequence** (§9.1); write it out before implementation so §6.5 gate 1 has
      something concrete to check.
- [ ] **Custom regex redaction patterns are deferred, not decided** (§9.4) —
      the trigger for revisiting is "keyword-heuristic default proven in
      production", which needs a definition of "proven" before it can be
      acted on.
- [ ] **Meter id, error codes and the privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in §9.6.
