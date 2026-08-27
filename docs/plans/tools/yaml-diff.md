# Tool brief: yaml-diff

Root: **Comparator** (4 → completing the set, per §6.7.9 "Thin … complete them"). Object: two YAML (or JSON, since YAML is a JSON superset) documents.

## 1. Demand

- **JTBD:** "Did my Kubernetes manifest / Helm values / GitHub Actions workflow / docker-compose file actually change, or did someone just reformat it" — a config-review check that must ignore key-order and formatting noise and surface only real structural/value changes, run entirely client-side because the payload is often production config carrying secrets, hostnames, or credentials.
- **Keywords:** yaml diff, compare yaml files, yaml compare online, semantic yaml diff, kubernetes yaml diff, helm values diff.
- **Pain:** YAML's whitespace sensitivity and flexible authoring styles (flow vs block, quoted vs unquoted, key order, anchors/aliases) mean a plain text diff lights up on cosmetic noise as often as real changes. Reviewers doing PR/config audits (Kubernetes manifests, Helm `values.yaml`, GitHub Actions workflows, docker-compose) need the diff to answer "what actually changed in behavior," not "what characters changed."

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| **YAML Diff (yamldiff.com)** | https://www.yamldiff.com/ | Yes — WebFetch, direct `curl` of the served HTML/CSS/JS, and full-page screenshot | `docs/research/forge/yaml-diff/yamldiff-com-home.webp` |
| **Diffchecker YAML Diff** | https://diffchecker.dev/yaml/ | Yes (upgraded from the landscape stage's search-snippet-only status) — WebFetch + full-page screenshot | `docs/research/forge/yaml-diff/diffchecker-dev-yaml.webp` |
| **SmartFormatter YAML Compare** | https://smartformatter.com/tools/yaml-compare | Yes (upgraded) — WebFetch + full-page screenshot | `docs/research/forge/yaml-diff/smartformatter-yaml-compare.webp` |
| **Spoold YAML Diff** | https://www.spoold.com/tools/yaml/diff | Yes (upgraded) — WebFetch + full-page screenshot; this page ships an unusually detailed self-documenting guide (see §3) that doubles as first-party confirmation of its own mechanics | `docs/research/forge/yaml-diff/spoold-yaml-diff.webp` |
| **CompareText.org YAML Diff** | https://comparetext.org/compare-yaml/ | Yes (upgraded) — WebFetch + full-page screenshot; page also ships a detailed self-documenting guide | `docs/research/forge/yaml-diff/comparetext-org-compare-yaml.webp` |

All five named in the landscape survey were visited this pass — none invented, none substituted. The four that the landscape stage could only reach via search snippet were successfully fetched and screenshotted here; nothing below is asserted from the earlier snippets alone.

## 3. Feature inventory

**yamldiff.com** — the plainest, oldest-feeling implementation; confirms the category's baseline move.
- Core strength: **normalize-then-compare**. Own copy: "it formats the YAML, including sorting the keys, to then performs a texual comparison." Confirmed by reading the served page source directly (`curl`): the app is a `js_of_ocaml`-compiled bundle (`yamldiff_js.js`, `js-yaml.3.14.0.min.js`, `esprima.4.0.1.min.js`) — i.e. it parses with `js-yaml`, re-serializes with sorted keys, and diffs the resulting text.
- **Dual format**: accepts both `.yaml`/`.yml` and JSON, "because YAML is a superset of JSON."
- Output rendering confirmed from the page's own CSS: two `<pre>` panels (`#code-left` / `#code-right`) colored via three classes — `.diff-add` (`#bfffd1` light green), `.diff-delete` (`#ffd4d9` light red/pink), and **`.diff-conflict` (`moccasin`)** — a third state distinct from add/delete, implying the tool distinguishes "value changed at the same key" from pure insertions/deletions, not just a two-color line diff. A `#code-comparison-stats` div sits above the panels for summary counts.
- Input: paste into either of two `<textarea>`s **or** upload a file per side (`<input type="file">` above each textarea).
- Actions: **Compare** and **Clear** only — no copy/download/share button anywhere in the markup.
- Explicit privacy claim: "No data is transfered to a central server, the comparison is performed entirely in the browser."
- Upsell/padding: essentially none — a two-paragraph explainer, a contact mailto, and an "Infrastructure managed by Terrateam" credit line. No ads, no link farm, no related-tools grid.

**Diffchecker YAML Diff (diffchecker.dev/yaml/)** — a thin page within Diffchecker's multi-format diff-tool family.
- Header nav row lists sibling tools (Text Diff, JSON Diff, XML Diff, YAML Diff, List Diff, Image Diff, PDF Diff, Word Diff, Folder Diff) — this is one blade of a station, same shape as Forge itself.
- Two labeled panes, **"Original"** (left) / **"Changed"** (right), each with a small toolbar (undo/redo, copy, upload, download icons) and a placeholder ("Paste YAML here…").
- Below each pane: a stats row — **Content / Lines / Chars / Diffs** counters, both sides.
- Copy claims a genuine semantic engine: "a semantic diff that understands the document structure, not just the text. Keys are compared by path, anchors and aliases are resolved, and indentation, quoting style, or flow versus block layout never produce a false diff." Framed explicitly for "the files you'd rather not upload — Kubernetes Secrets, CI pipeline credentials, Helm values with internal hostnames," with "no server round-trip and no logging."
- Badges under the headline: **Private / Secure / Free**.
- Upsell/padding: light — a "Try Example" button and the sibling-tool nav; the page as captured (full-page screenshot) is mostly blank vertical space below the tool with the marketing copy repeating near the bottom, suggesting either a lazy-loaded FAQ/detail section that did not render in a static capture, or a genuinely sparse page.

**SmartFormatter YAML Compare** — heaviest SEO-prose competitor of the five.
- Two Monaco-style code editors ("ORIGINAL YAML" / "MODIFIED YAML") each with a find-and-replace bar, above a toolbar row showing live **Removed/Changed** and **Added/Changed** counts in red/green.
- A **"Semantic Sync"** toggle plus **Clear** — implying an alternate non-semantic (raw-text) comparison mode exists behind the same toggle, though the page does not spell out what "off" does differently.
- Explicit "why" framing: "Our semantic YAML comparison engine is built to handle the complexities of nested maps and sequences. It automatically sorts keys alphabetically before the diff... Often, two YAML files are logically identical but look different because of key order; our tool eliminates these false positives."
- Upsell/padding: very heavy — roughly a dozen SEO sections below the tool (Configuration Drift explainer, "Why Human-Readable Doesn't Mean Easy to Audit," 3-step "How to Use," 3-card "Best Practices," FAQ accordion, "You May Also Need" cross-sell grid of 3 tools, full site footer with 4 nav columns) — the tool itself occupies roughly the top 15% of a very long page.

**Spoold YAML Diff** — the feature ceiling; the only one bundling a real code editor with a separate structured line-diff panel.
- **Monaco-based** editor (confirmed by own copy: "VS Code–engine highlighting, folding, word wrap, synchronized scrolling in split mode"), both panes independently editable, with **Split / Inline / Fullscreen** view-mode toggles and per-side **Valid/Invalid** YAML badges that update live while typing.
- Toolbar: **Sample** (loads a Kubernetes ConfigMap example), **Clear**, **Swap** (⇄, exchanges the two sides), **Share link** (Base64-encodes both documents into the URL hash — explicitly "no server round-trip"), **Guide** link.
- A second, separate **Line diff** panel below the Monaco view, switchable between **Side by side** and **Unified** (patch-style `+`/`-`) rendering, with its own **Copy** and **Download** (`yaml-diff.txt`) buttons and a `+2−1`-style added/removed line-count badge.
- Explicitly documents its own limitation (own copy, confirmed by direct fetch): **"Line diff is not semantic YAML diff — Equivalent maps with different key order or spacing show as textual differences."** The lower line-diff panel is Myers-style text diff over the *same engine as their Text Diff tool* — i.e., semantic awareness lives only in the Monaco/parse-validation layer (is this valid YAML, does it round-trip to JSON), not in the diff algorithm itself.
- Extensive self-documenting guide below the tool (TOC-navigated): "What is this tool," "Why compare YAML," "Key features," numbered "How it works" (Load → Edit → Pick a layout → Read the diff → Export), a YAML-vs-JSON-vs-text-diff comparison table, six "Use cases" (K8s manifest review, Helm/values overlays, CI workflow edits, OpenAPI/Swagger YAML, compose/stack files, "staging vs production values"), "Best practices" (5 bullets — normalize whitespace first, validate syntax, watch line endings CRLF vs LF, prefer Share for reviews, split huge documents), explicit "Limitations" section (not a Kubernetes schema linter; line diff is not semantic; share-URL length caps on huge payloads; multi-document `---` streams not specially handled), and an 8-question FAQ that includes direct, testable claims ("Is YAML Diff the same as kubectl diff? No — this compares two strings in your browser only; it does not talk to a live cluster").
- Upsell/padding: moderate — a related-tools row (YAML Formatter, YAML Validator, JSON Diff, JSON ↔ YAML, Text Diff) and standard site chrome, but the guide content is genuinely instructional rather than filler, and none of it sits inside the working tool card.

**CompareText.org YAML Diff** — the devops-framing specialist; explicitly names the audience the landscape survey called out.
- Two panes ("Original YAML" / "Changed YAML"), each with **Sample**, **Upload**, **Format**, and per-side action icons (copy/download/share implied by icon row); a top-right **Share** button with configurable link expiry (1 week–1 year) and an explicit consent step ("Users must agree to storage terms before generating links" — i.e., unlike the other four, sharing here means the text is stored server-side, not embedded client-side in a URL hash).
- Diff is described as character-level with red-deletion/green-insertion highlighting and YAML 1.2.2-spec-aware syntax highlighting.
- The single most devops-specific competitor of the five: explicit worked examples for **Kubernetes** (`kubectl get deployment web -o yaml` in both clusters), **Helm** (`values.yaml` across releases, catching renamed keys), **GitHub Actions** (trigger/matrix changes), **docker-compose** (env-var override verification), **OpenAPI/Swagger** (schema changes despite alphabetic reordering), and **Ansible** (hostvar/role drift) — six named real-world scenarios, more than any other competitor names.
- Explicitly documents two of the same domain traps this brief independently identifies (§4): the **Norway Problem** (`NO`/`yes`/`on`/`off` parsing as booleans under YAML 1.1) and that **"Indentation is structural per the YAML 1.2.2 spec... a single misplaced space changes the document tree."**
- Explicitly documents its own limitations, in its own words: **"No multi-file comparison … Text-level matching: Anchors and aliases don't expand … No implicit resolution: Explicit type tags (`!!str`) flag as different from implicit values, even when parsers treat them identically."** This directly contradicts Diffchecker's claim of resolving anchors/aliases — the two competitors take opposite positions on the same domain question, which is itself useful evidence that this is a real design fork, not a settled default (see domain know-how #2).
- Upsell/padding: light-moderate — a related-tools row (Compare Text/JSON/XML/CSV/HTML/Markdown/SQL/Config) and standard footer, plus a long FAQ; no ad banners observed in the capture.

## 4. Journey maps

**yamldiff.com** (closest to a bare-minimum reference implementation):
1. Land directly on the tool — H1, one-line privacy blurb, then immediately two file-inputs-over-textareas side by side, no scroll needed.
2. Paste (or upload a file) into each side. Nothing computes yet — this is explicitly button-gated (`onclick="onclickCompare(event)"` in the markup, not an input listener).
3. Click **Compare** → a stats line renders above two `<pre>` panels, each line/region colored green (added), pink (deleted), or moccasin (conflict/changed-in-place) per the page's own CSS.
4. No documented navigation between individual diff hunks — the two `<pre>` blocks are the entire result surface; the user reads down them directly.
5. Exit: no copy/download control exists in the markup at all — the user must manually select text from the `<pre>` output. This is a genuine, confirmed gap (not inferred).
6. No large-input handling, no error states, and no multi-document (`---`) awareness documented anywhere on the page.

**Diffchecker YAML Diff**:
1. Land on a two-pane editor already visible above the fold, labeled Original/Changed, each with a small icon toolbar (undo, copy, upload, download) and a live stats row (Content/Lines/Chars/Diffs) beneath.
2. Paste or upload into either pane; per-pane toolbars suggest the copy/upload/download actions are available per-side even before a diff is run.
3. A "Try Example" button exists to seed sample content — exact trigger for the diff itself (live-as-you-type vs button) was not confirmed from the static fetch; the sibling stats counters reading "0" in the un-filled state is consistent with either.
4. No in-page navigation-between-hunks control was observed; the two-pane view with stats counters is the entire result surface as captured.
5. Exit: per-pane download icon in the toolbar (confirmed present in the markup/screenshot; exact output format not confirmed).

**SmartFormatter YAML Compare**:
1. Land on two Monaco-style editors with find-and-replace bars, a **Semantic Sync** toggle, and live Removed/Changed + Added/Changed counters visible before any input.
2. Paste into either editor; the "Semantic Sync" toggle (on by default per the capture) implies live recomputation as text changes, though a dedicated "Compare" click was not observed as a separate control in the toolbar — this reads as closer to instant-transform than button-gated, but is not fully confirmed absent interactive testing.
3. Diff rendering happens inside the same two-editor view (inline highlighting), not a separate output pane.
4. No documented hunk-navigation sidebar.
5. Exit: not confirmed from the static capture — no explicit copy/download/share icon was legible in the toolbar row; this is the weakest export story of the five as far as this pass could verify.
6. ~85% of the page below the fold is SEO prose (Configuration Drift explainer, Best Practices, FAQ, cross-sell, footer) — heaviest padding-to-tool ratio observed.

**Spoold YAML Diff** (richest, most instructive journey):
1. Land on a Monaco split-view editor, Original (left, red badge) / Modified (right, green badge), each with a live Valid/Invalid YAML badge, above a toolbar: Sample / Clear / Swap / Share link / Guide, plus Split/Inline/Fullscreen view toggles.
2. Click **Sample** to seed a worked Kubernetes ConfigMap example (own copy confirms this is the intended first-touch action for new users, not a blank-paste start) or paste directly; both sides are independently editable and Monaco re-validates YAML syntax live as you type (badge flips Valid↔Invalid immediately).
3. The Monaco pane itself shows inline diff coloring (their own screenshot: a changed value line highlighted pink on the left / green on the right, an added line highlighted green-only on the right) — this happens live, no button, as soon as both sides have content.
4. Below that, a **separate Line diff panel** (Side by side / Unified toggle) renders the same change set as a classic patch view with its own `+N−M` badge — this is the "detail on demand" / export-ready layer, distinct from the exploratory Monaco view above it.
5. Navigation between individual diff regions is via normal editor scrolling (Monaco's own scrollbar diff-decorations, standard IDE affordance) plus the synchronized-scroll-in-split-mode behavior called out in their copy — there is no separate "next diff / previous diff" button documented.
6. Exit: **Copy** (unified text) and **Download** (`yaml-diff.txt`) buttons on the line-diff panel; **Share link** Base64-encodes both documents into the URL fragment for review-without-upload collaboration.
7. Large-input behavior is explicitly called out in their own "Best Practices" section: "Huge documents — Browser tabs may slow with very large inputs; consider splitting files or using Git locally for multi-megabyte streams" — an honest, stated limit rather than a silent failure.
8. Multi-document `---` streams are explicitly named as unhandled ("Multi-document streams — Multiple `---` documents in a single stream aren't specially handled; ordering matters for alignment") in their own Limitations section.

**CompareText.org YAML Diff**:
1. Land on two panes (Original YAML / Changed YAML), each with Sample / Upload / Format buttons and per-side share/copy/download icons, empty-state placeholder line numbers visible, no content yet.
2. Paste, upload, or click Sample (Kubernetes Deployment example) into either pane.
3. Diff renders character-level within/around the panes — described as red-deletion/green-insertion highlighting; the exact trigger (live vs a run action) was not independently confirmed from the static capture, though the presence of a dedicated **Format** button per pane (distinct from compare) suggests formatting and diffing are separate, deliberate user actions rather than one continuous live pipeline.
4. Panes have **locked/synchronized scrolling** for cross-referencing long documents — an explicit, named feature (not inferred).
5. Exit: Copy and Download per pane (no watermark, per their own copy), plus a **Share** button that stores the compared text server-side with a configurable expiry the user must explicitly consent to before a link is generated — the one competitor of the five that is *not* purely local-only for its share feature, and says so plainly.
6. Large-input / multi-document behavior: explicitly documented — "Multi-Document Support: treats files with `---` separators as complete streams but warns that reordering documents will look like a wholesale change," recommending users pre-split with `yq` for cleaner comparison.

## 5. Layout + screenshots

- **yamldiff.com**: single centered column, no site chrome at all beyond the H1/tagline. Two textareas (with file-upload inputs stacked directly above each) sit side by side, immediately followed by Compare/Clear buttons, then a stats line, then two colored `<pre>` output panels — the whole working tool fits in one viewport at typical desktop width, confirmed by the captured screenshot (2888×2008, no scroll needed to see the entire tool). Below that: two short paragraphs and a contact/credit line. Zero ads, zero cross-sell. See `yamldiff-com-home.webp`.
- **Diffchecker YAML Diff**: single centered column inside a shared multi-tool-family shell (top nav lists 9 sibling diff tools). Two-pane editor with per-pane toolbar icons and stats row sits directly below the nav, above the fold. Below the tool: badges (Private/Secure/Free), an H1 restating the tool name, two paragraphs of framing copy, then — per the full-page capture — a very long stretch of apparently empty vertical space before the copy repeats near the very bottom of an ~14,000px-tall page, suggesting either unrendered lazy content (FAQ/guide sections common to the family's other tools) or a genuinely sparse page as captured. See `diffchecker-dev-yaml.webp`.
- **SmartFormatter YAML Compare**: single centered column, dense header nav ("Structural Sync," "Real-time Diffing," "100% Client-Side" pills). Two Monaco editors with find-and-replace bars and live add/remove counters sit above the fold, immediately below a "Semantic Sync"/"Clear" control row. The tool occupies roughly the top 15% of an ~11,000px page; everything else is SEO explainer prose, a "Best Practices" 3-card grid, an FAQ accordion, a "You May Also Need" cross-sell grid, and a 4-column footer. Heaviest content-to-tool ratio of the five. See `smartformatter-yaml-compare.webp`.
- **Spoold YAML Diff**: single centered column, compact top bar (logo, breadcrumb, JSON Diff / Text Diff sibling links, Share link, Guide link). The Monaco split editor with its Sample/Clear/Swap/view-mode toolbar sits directly below, followed immediately by the separate Line-diff panel (Side-by-side/Unified toggle + Copy/Download) — both panels visible above or just at the fold on a standard desktop viewport. Below that: a genuinely long (~11,000px) but well-organized, TOC-navigated instructional guide (What/Why/Key features/How it works/YAML-vs-JSON-vs-text table/Use-case cards/Best-practices/Limitations/FAQ/Related tools/Conclusion) — the most content-rich page of the five, but structured as reference material rather than SEO filler (matches the line-ending-detect precedent set by hidekazu-konishi.com: dense but genuinely useful, not doorway links). See `spoold-yaml-diff.webp`.
- **CompareText.org YAML Diff**: single centered column, minimal header (logo, Tools dropdown, Sign in). Two-pane editor with Sample/Upload/Format buttons per side sits directly below the header, entirely above the fold, with empty-state line-number gutters visible. Below the tool: an H1/H2 restating the tool's purpose, a "How the diff actually works" 4-step explainer, a "How to compare in three steps" numbered-card row, six "When YAML diff is the right tool" scenario cards (the Kubernetes/Helm/GitHub-Actions/docker-compose/OpenAPI/Ansible list), a "YAML quick reference" table (indentation, tabs, anchors/aliases, merge keys, multi-document, block scalars, the Norway problem, encoding), a substantial FAQ, a privacy statement, and a dark full-site footer with 4 nav columns (Compare / By Use Case / Text Utilities / About). See `comparetext-org-compare-yaml.webp`.
- **Mobile**: not directly observed for any of the five (all captures were desktop-viewport); the two-pane layouts common to all five (yamldiff.com, Diffchecker, SmartFormatter, Spoold, CompareText.org) are the layout element most likely to need explicit mobile stacking (left pane above right pane, full width each) — none of the five's mobile behavior was verified in this pass.

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- `docs/research/forge/yaml-diff/yamldiff-com-home.webp`
- `docs/research/forge/yaml-diff/diffchecker-dev-yaml.webp`
- `docs/research/forge/yaml-diff/smartformatter-yaml-compare.webp`
- `docs/research/forge/yaml-diff/spoold-yaml-diff.webp`
- `docs/research/forge/yaml-diff/comparetext-org-compare-yaml.webp`

## 6. Their debt

- **yamldiff.com**: least SEO debt but also least functionality — no copy/download/share button exists in the markup at all (confirmed by reading the served HTML directly, not inferred), no per-style diff-hunk navigation, no documented handling of anchors/aliases, merge keys, multi-document streams, or the Norway problem. A `.diff-conflict` CSS class exists but nothing on the page explains what triggers it versus a plain add/delete. No API.
- **Diffchecker YAML Diff**: claims full anchor/alias resolution and path-based key comparison — the strongest semantic claim of the five — but the page as captured shows a large amount of apparently-empty vertical space below the working tool, and no in-page hunk-navigation or multi-document handling was confirmed. Sits inside a 9-tool sibling family (a station, like Forge) but with no stated OpenAPI/MCP surface — human-only.
- **SmartFormatter YAML Compare**: heaviest content-to-tool ratio of the five (~85% of the page is SEO prose below a thin tool strip) — Configuration Drift explainer, Best Practices cards, FAQ, cross-sell grid, and a 4-column footer, largely repeating claims made earlier on the same page in different words. No confirmed copy/download/export path in the captured toolbar — a real usability gap if accurate.
- **Spoold YAML Diff**: the most functionally complete and the most honest about its own limits (explicitly documents that its line-diff panel is textual, not semantic; that huge documents may lag the browser tab; that multi-document streams aren't specially handled) — genuinely the smallest "their debt" of the five. The one real gap: **the semantic/structural awareness lives only in YAML-validity checking, not in the diff itself** — the actual line-diff algorithm is admittedly "the same engine as our Text Diff tool," meaning reordered-but-equivalent keys will still show as a textual difference unless the user manually normalizes first (their own "Best Practices" tells users to do this by hand).
- **CompareText.org YAML Diff**: the most devops-scenario-specific of the five and the most transparent about anchor/alias non-resolution ("Text-level matching: Anchors and aliases don't expand") and explicit-tag handling — but its Share feature stores content server-side (with a consent step), a materially different privacy posture than the other four's pure-client-side/URL-hash approaches, worth flagging to a user who assumes "share" means "still local."
- **Across all five**: no competitor documents an OpenAPI/MCP surface or any programmatic access — all five are human-only pages. No competitor returns a structured (JSON array of changes) diff result that a script or CI job could consume; every result is either rendered HTML/canvas (Monaco) or plain colored `<pre>` text meant to be read by a person, not parsed by a program.

## 7. Domain know-how

1. **Map key order is not semantically significant; sequence (list) item order is.** This is the central asymmetry every competitor above gets right for maps (sort-then-diff, per yamldiff.com's and SmartFormatter's own copy) but that a naive implementation could easily get wrong in the other direction — silently also sorting or re-ordering *sequences* before comparing, which is incorrect. A YAML sequence's order is part of its meaning (container startup order in a Kubernetes pod spec, iptables rule order, an ordered list of migration steps) — two lists with the same items in a different order are a **real** semantic change, not formatting noise. The correct rule: canonicalize/sort mapping keys, but diff sequences positionally (or with content-aware matching per item — see #6), never by sorting their contents.

2. **Anchors and aliases are a genuine, unsettled design fork — not a solved problem.** Diffchecker's own copy claims full resolution ("anchors and aliases are resolved... never produce a false diff"); CompareText.org's own copy admits the opposite for its own tool ("Anchors and aliases don't expand; `&base` differs visually from inlined equivalents despite semantic equivalence"). Both of these are real, currently-live competitor pages taking opposite positions on the same design question. The correct behavior for a tool that wants a genuinely semantic diff: **resolve anchors/aliases to their expanded values before comparing** (so a value change behind a shared `&anchor` is correctly reflected at every `*alias` site it feeds), but still report the *anchor/alias structure itself* as a secondary fact when it changes (e.g., an alias site was converted to an inline literal with the same resolved value) — because config authors sometimes care about DRY-ness, not just resolved value.

3. **Merge keys (`<<: *anchor`) must be expanded before diffing, or the diff is simply wrong.** YAML 1.1's merge-key convention (`<<`) means keys from the merged map that don't appear literally in a node's own mapping are nonetheless present in its resolved data. A structural differ that walks the raw parse tree without expanding merge keys will report a key as "missing" from a document that in fact inherits it via `<<: *defaults` — a false positive that is exactly as damaging as ignoring anchors entirely (see #2). None of the five competitors' own copy mentions merge-key handling explicitly, which is itself a gap worth closing rather than repeating.

4. **The Norway Problem is a type-change, not a no-op, even when the raw characters look unchanged.** YAML 1.1's implicit typing resolves unquoted `NO`, `YES`, `ON`, `OFF`, `TRUE`, `FALSE`, `Y`, `N` to booleans; the same token quoted (`"NO"`) is a string. CompareText.org's own copy names this directly ("The Norway problem... YAML 1.1 implicitly converts unquoted `NO` to boolean `false`"). A value diff that only compares the *resolved* JS/JSON value across two documents will silently miss a change from `country: NO` (boolean `false`) to `country: "NO"` (string `"NO"`) if it naively stringifies both to compare — this is a type change a schema-aware CI gate would care about (e.g., a Kubernetes field expecting a string suddenly receiving a coerced boolean). The tool must diff **(value, resolved-type)** pairs, not just resolved values, and should default to **YAML 1.2 Core Schema** rules (where only `true`/`false` are booleans, fixing the Norway Problem) while flagging when a document's own tags/quoting imply the older 1.1 behavior was relied upon.

5. **Explicit type tags vs. implicit typing is a related but distinct axis.** `8080` (implicit int) and `!!str 8080` (explicitly tagged string) resolve to different types even though the tag is invisible in casual reading; likewise `"8080"` (quoted, implicit string) and untagged `8080` (implicit int) look almost identical on screen but are different types. CompareText.org's own FAQ names this exactly ("Explicit type tags... flag as different from implicit values, even when parsers treat them identically" — as a stated *limitation* of their own tool). A genuinely useful diff surfaces a type-change class distinct from a value-change class (as one of the search-stage sources described: "Type Changes — Flags when values shift types, e.g. `8080` versus `"8080"`") rather than collapsing everything into one generic "changed" bucket.

6. **Sequence diffing needs identity, not just position, when the payload has one.** A naive sequence diff compares item 0 to item 0, item 1 to item 1, etc. — which is correct for order-significant lists with no addressable identity, but produces a cascade of false "changed" entries when a single item is inserted or removed in the middle of a list that *does* have a natural key (e.g., a Kubernetes `containers:` list keyed by `name:`, or a GitHub Actions `matrix:` array). The domain-correct approach: when sequence items are mappings that share a common identifying field across both sides (heuristically: a field present and unique across all items in both arrays — `name`, `id`, `key` are common in devops YAML), match by that field first and diff matched pairs; fall back to positional diffing only when no such identity field is detectable. This is exactly the same "row identity in CSV without a primary key" problem named in the task brief, transposed onto YAML sequences.

7. **Block scalar style and chomping indicators can change the resolved string even when the visual content looks identical.** `|` (literal) vs `>` (folded) change how embedded newlines are interpreted; the chomping indicator (`|-` strip, `|` clip/keep-one, `|+` keep-all) changes whether trailing newlines survive into the resolved string value. Two block scalars that look like "the same multi-line string" in a side-by-side view can resolve to different actual string values (a trailing `\n` present vs absent) — which matters for anything that treats the YAML value as a literal script or command to run. A correct diff must compare the **resolved string value**, not raw scalar-style text, but must still flag when the *chomping/style choice itself* changed even if the resolved value happens to match (an author-intent signal, secondary to the resolved-value diff).

8. **Comments are not part of the YAML data model, and treating them as invisible is a deliberate choice, not an oversight — but it must be a stated, chosen policy.** A structural (parse-to-object) diff naturally drops comments; one of the search-stage sources explicitly lists "Comment Changes — preserves and compares inline documentation" as a distinct diff category some tools offer, because config reviewers sometimes *do* want to know a comment changed (e.g., a `# TODO: rotate this key` was added or removed) even when the underlying value didn't. The correct design: default to comparing resolved structure (ignore comments, matching every competitor examined here), but expose comment-diff as an explicit opt-in mode rather than silently having no opinion on it.

9. **Multi-document streams (`---`-separated) need explicit document-pairing, or the diff silently degrades to "compare only the first document."** Diffchecker's own copy states the limitation directly ("Multi-document YAML files process only the first document"); CompareText.org's own copy documents the same failure mode from the other side ("reordering documents will look like a wholesale change... recommend splitting and canonicalizing... for cleaner comparison"). The correct behavior: detect `---` document boundaries on both sides, and if the counts match, diff positionally document-by-document (reporting each as its own numbered result group); if counts differ, say so explicitly rather than silently truncating to document 1 — silent truncation is the worse failure because the user believes they compared the whole file.

10. **Duplicate keys inside one mapping are technically an error the YAML spec leaves undefined, but real-world files have them, and different parsers pick different "winners."** A tool that silently uses whichever key its parser library happens to keep (commonly "last key wins," matching JS object semantics) without surfacing that the source document had a duplicate is hiding a real correctness bug in the input — the diff should flag "duplicate key detected, using last occurrence" as a parse-level warning surfaced alongside the diff result, not swallow it.

## 8. Chosen archetype

Per §6.7.10's own archetype table, **Two-pane compare** — "Side-by-side inputs, synchronized structured output" — fits "diff family, comparators" by name, and every one of the five competitors examined independently converged on a two-input-pane layout as the only viable shape for this JTBD: the user's mental model is inescapably "I have a before and an after," and any archetype that doesn't put both documents on screen simultaneously breaks that model.

Why the other six are wrong here:
- **Instant transform** — wrong shape, not just a style choice: an instant transform takes *one* input and produces *one* output (base64, case convert). A diff fundamentally needs *two* inputs compared against each other; there is no single-input version of this JTBD. (The *live-as-you-type* property that Instant transform champions is still worth borrowing — see §9 — but the archetype itself, defined by cardinality of input, doesn't fit.)
- **Configure-then-generate** — no configuration knobs produce this tool's output; the two documents *are* the entire input, there's nothing to "generate" from options. (A view-mode toggle like Spoold's Split/Inline/Unified is a display preference, not a generation parameter — it doesn't change what was compared, only how the same result is rendered.)
- **Decision wizard** — the user is never uncertain about what they want; they arrive with two known documents and want to know how they differ, not to be guided through a narrowing Q&A.
- **Drop-and-verdict** — closest false-positive of the six: it's tempting to think "one clear answer, detail on demand" fits a diff summary. It doesn't, because Drop-and-verdict is fundamentally single-input (per its own "File in → one clear answer" definition, matched to file-type detect / checksum / EXIF in the archetype table) — there is no single file whose properties are being verdict-ed here; the verdict is a *relationship between two documents*, which requires the two-pane shape to even state the input.
- **Inspect-and-drill** — closer than most alternatives (there is a real "explore a structure" element once results render — drilling into a specific changed path), but the primary interaction is not open-ended exploration of one decoded structure (JWT claims, a JSONPath tree); it's anchored to *two* documents and *their relationship*, which Two-pane compare names explicitly and Inspect-and-drill's own examples (JWT decode, CSV preview) do not.
- **Batch queue**: no competitor examined offers N-document batch diffing, and the JTBD itself is inherently pairwise (before/after, original/modified) — a batch mode over many independent pairs is a Processor-root job wrapping this same pairwise comparator, not a different primary journey for the tool itself (matching the same Detector-vs-Processor split drawn in the line-ending-detect brief §9).
- **"Form + button"**: the trap here is exactly what yamldiff.com does — reduce the tool to "paste both sides → click Compare → read colored `<pre>` blocks with no export." SmartFormatter's Semantic Sync toggle and Spoold's live-validity badges both suggest that at least *validation* and possibly diffing itself can run live without a button; gating the entire comparison behind a click when the underlying parse+normalize+diff is cheap (well under the multi-MB scale where Spoold itself admits browser tabs start to lag) is a pure step-tax we should not copy.

## 9. Our design

### 9.1 Journey

*This brief writes the journey inline in 9.2 Layout rather than as a separate step sequence — carried into §11 as an open item.*

### 9.2 Layout

**Layout** — two-pane input, structured-result-first, detail-on-demand, borrowing Spoold's split (exploratory view + separate structured panel) without its heaviest chrome:

- **Top**: two side-by-side panes, **"Original"** (left) / **"Changed"** (right) — matching the Diffchecker/CompareText.org labeling convention (clearer than yamldiff.com's unlabeled or Spoold's Original/Modified split, and avoids SmartFormatter's all-caps shout). Each pane accepts paste, drag-and-drop file upload (`.yaml`/`.yml`/`.json`), or a **Sample** button seeding a small worked Kubernetes ConfigMap example (per Spoold's and CompareText.org's own confirmed first-touch pattern — a blank two-pane start is the weakest onboarding of the five, per yamldiff.com's bare version).
- **Live parse-validity badge** per pane (Valid YAML / Invalid — parse error at line N), updating as the user types — parity with Spoold, and cheap enough to run without a button per the domain know-how above.
- **Diff runs live once both panes hold parseable content** — no "Compare" button gating the actual comparison (closing the step-tax gap named in §8's "form + button" rejection). If either side fails to parse, the diff pane shows the specific parse error and location instead of a stale/wrong result — never a silent empty diff.
- **Result card**, directly below the two panes: a one-line summary badge first (**"3 changed, 1 added, 1 removed"** or **"No differences — semantically equivalent"**), then the structured change list — each row showing its **key path** (`spec.containers[0].image`), a **change-type tag** (`value`, `added`, `removed`, `type-change`), and a compact before/after value pair. This is the "detail on demand, but shown inline because it's cheap" pattern carried over from the line-ending-detect precedent, adapted to a two-input tool.
- **Toggle**: **Side-by-side / Unified** rendering of the same change list (parity with Spoold's Line-diff panel), plus a secondary toggle for **"Compare raw text"** vs **"Compare semantic (default)"** so a user who deliberately wants to see formatting-only churn (e.g., "did someone re-indent this file") isn't stuck with the normalized view — this directly answers SmartFormatter's unexplained "Semantic Sync" toggle by making both modes explicit and named.
- **Anchors/aliases, merge keys, and multi-document streams are handled per §7's stated positions** (resolved for comparison, structural facts surfaced as secondary rows; merge keys expanded; multi-document `---` streams paired positionally with an explicit "document count mismatch" banner rather than silent truncation) — and each of these is called out in a small "How this comparison works" disclosure (collapsed by default) so power users can verify our stated behavior against their own document, the same transparency Spoold and CompareText.org both practice in their own limitations sections.
- **Exit actions**: **Copy** (unified patch text), **Download** (`.diff`/`.txt`), and **Copy as JSON** (the exact machine payload — see I/O contract below) — closing yamldiff.com's confirmed zero-export gap and matching/exceeding Spoold's Copy+Download pair.
- **Share**: deliberately **skipped for v1** (see below) — both of the two competitors offering it (Spoold via URL-hash Base64, CompareText.org via server-side storage with consent) chose different privacy postures, and a config-diff tool whose whole differentiator is "never leaves your browser" should not casually reintroduce a server-side storage path; a URL-hash-only share (Spoold's approach) is the only variant compatible with our stated privacy claim, and is deferred rather than shipped half-considered.
- **Big input**: per Spoold's own honest "Best Practices" disclosure, multi-megabyte documents may need chunked/streaming parse+diff rather than blocking the main thread; our version states an explicit practical limit in the UI rather than silently degrading.
- **Empty/error state**: empty panes show neutral placeholders ("Paste or drop the original YAML" / "…the changed YAML") — never a false "no differences" verdict when one or both sides are empty.

### 9.3 Must-have

**Must-have features** (without these, a user bounces back to a competitor):
1. Live diff on parseable input, no "Compare" button gate — none of the five competitors confirm this cleanly (SmartFormatter and Spoold hint at it for validation only); being unambiguously live for the full diff is a genuine differentiator.
2. Structured, typed change list (path + change-type + before/after), not just colored text — the one thing zero of the five competitors offer, and the root's own stated requirement.
3. Copy / Download / Copy-as-JSON exit paths — closing yamldiff.com's confirmed zero-export gap.
4. Explicit, visible handling of anchors/aliases, merge keys, and multi-document streams (resolve-and-report, not silently ignore or silently truncate) — closing the fork Diffchecker and CompareText.org's own copy contradicts each other on.
5. A named, switchable semantic-vs-raw-text mode — making explicit what SmartFormatter's unexplained toggle leaves implicit.

### 9.4 Deliberately skipped

**Deliberately skipped** (and why):
- **Server-side share links with configurable expiry** (CompareText.org's model) — contradicts our stated client-side-only privacy posture for a config-diff tool whose primary audience is comparing files with secrets/hostnames in them; a URL-hash-only share (no server storage) is the only variant that fits, and is deferred to a later pass rather than shipped as a privacy-inconsistent afterthought.
- **Full Monaco-grade code editor** (Spoold's model: folding, find-and-replace, fullscreen mode) — real value, but it is editor-chrome, not diff-logic; a plain syntax-highlighted textarea/code-pane is sufficient for the comparator's core job, and importing a full IDE-grade editor component is exactly the kind of per-tool bespoke-editor sprawl the design doc's "one design system, one journey grammar" edge argues against. If a shared code-editor primitive already exists elsewhere in the catalog, reuse it; do not hand-build a Monaco integration for this one tool.
- **Comment-aware diffing as the default** — real, named use case (per §7 domain know-how #8), but defaulting to it changes the "no differences" verdict for files that are behaviorally identical apart from prose comments, which would be a surprising default; ship as an explicit opt-in toggle in a later pass, not v1.
- **Batch/multi-pair diffing** — per the archetype argument in §8, this is a Processor-root job wrapping the same pairwise comparator, not a feature of this tool's own page.
- **A YAML formatter/beautifier bundled into the same page** (implied by CompareText.org's per-pane "Format" button) — out of scope; that's a Converter/Template-root tool this one can `compose.next` into, not a feature to duplicate here.
- **SEO filler, doorway-link farms, or affiliate/cross-sell boxes inside or immediately adjacent to the tool** — SmartFormatter carries the most of this among the five; we carry none of it inside the workflow.

### 9.5 Differentiator

- **Structured machine payload as the default output, not an afterthought.** All five competitors examined render either colored HTML/`<pre>` blocks or a Monaco decoration layer — none expose a JSON array of typed changes. Per this root's own mandate (Comparators must return structured difference an agent can act on), our API/MCP contract returns `{path, changeType, before, after}[]` — the same shape a CI gate or eval harness needs to assert "no unexpected field changed" without scraping rendered HTML.
- **A documented, deliberate position on every domain fork named in §7** (anchors/aliases resolved to value + reported as a secondary structural fact; merge keys expanded; sequences matched by identity field when detectable, positional otherwise; type-vs-value changes reported as a distinct class; multi-document streams paired and reported per-document, with an explicit mismatch warning rather than silent truncation) — closing every gap the five competitors either don't mention or admit outright (Diffchecker vs. CompareText.org's contradictory anchor/alias claims being the clearest example of a fork nobody has actually resolved cleanly).
- **No SEO/ad debt inside the workflow** — matching yamldiff.com's and Diffchecker's clean-tool-card standard, not SmartFormatter's ~85%-page-is-prose pattern.
- **Copy, download, and copy-as-JSON in one place**, closing yamldiff.com's confirmed zero-export gap and SmartFormatter's unconfirmed/likely-absent export path.
- **Deterministic and `pure`** — no model call; parsing + normalization + structural diff is priced at server-time cost, reproducible, and safely composable into a CI pre-merge check or an agent's config-drift audit (`compose.next` into a JSON-diff or JSON-formatter sibling tool for payloads already converted to JSON).

### 9.6 I/O contract

**I/O contract sketch** (for the OpenAPI/MCP surface, §6.5 gate 2):

```text
input:
  original: string        # YAML or JSON text
  changed: string          # YAML or JSON text
  mode?: enum<semantic, raw-text>   # default: semantic
  resolveAnchors?: boolean           # default: true (semantic mode only)
  matchSequencesBy?: string[]        # candidate identity fields for sequence-of-maps matching, e.g. ["name","id","key"]; default: auto-detect

output:
  parseErrors: { original?: { line: number, message: string }, changed?: { line: number, message: string } }
  documentCountMismatch?: { originalCount: number, changedCount: number }   # set when --- stream counts differ
  summary: { added: number, removed: number, changed: number, typeChanged: number }
  changes: Array<{
    path: string                      # e.g. "spec.containers[0].image"
    changeType: enum<added, removed, value, type-change, structural>  # structural = anchor/alias/style-only, resolved value unchanged
    before?: unknown
    after?: unknown
    beforeType?: string
    afterType?: string
  }>
  duplicateKeyWarnings?: Array<{ document: "original" | "changed", path: string, message: string }>
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

- [ ] **Live-vs-button-gated is unconfirmed for four of the five
      competitors** (§4). yamldiff.com's diff trigger, SmartFormatter's
      "Semantic Sync" behaviour, and CompareText.org's render trigger are all
      read off static captures. The claim in §9.3 that "being unambiguously
      live is a genuine differentiator" rests on that unconfirmed reading —
      re-verify interactively before making it a public comparison.
- [ ] **Export paths are unconfirmed for SmartFormatter** (§4: no copy /
      download / share icon was legible in the toolbar). "Weakest export story
      of the five" is a capture-limited observation, not a verified absence.
- [ ] **Spoold's per-pane download output format was not confirmed** (§4) —
      the control is present, the artifact it produces is unknown.
- [ ] **Share is deferred, not decided** (§9.4). The open question is narrow:
      is a URL-hash-only share (no server storage) acceptable for documents
      that routinely contain hostnames and secret *names*, given the URL still
      lands in browser history and any pasted-link destination?
- [ ] **Anchor/alias, merge-key and multi-document behaviour is our stated
      position, not a comparison** (§7, §9.2) — no competitor was tested with
      a document using anchors, merge keys, or a multi-document stream, so we
      do not actually know how any of them behave on these.
- [ ] **Mobile behaviour unverified** for all five (desktop captures only).
- [ ] **The journey is written inline in §9.2 rather than as an explicit step
      sequence** (§9.1) — write it out before implementation.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in §9.6.
