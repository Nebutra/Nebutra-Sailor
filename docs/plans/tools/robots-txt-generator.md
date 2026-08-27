# Tool brief: robots-txt-generator

## 1. Demand

- **JTBD:** 为一个站点快速生成一份正确的 `robots.txt`（默认放行/拒绝、按 bot 单独放行/拒绝、crawl-delay、sitemap、限制目录），复制或下载后放到站点根目录
- **Keywords:** robots.txt generator, robots.txt生成器, robots txt creator
- **Pain:** 记不住指令语法（`User-agent` / `Disallow` / `Allow` / `Sitemap` / `Crawl-delay`）；不知道该不该单独放行/拒绝新出现的 AI 抓取器（GPTBot、ClaudeBot、Google-Extended、PerplexityBot 等）；手写容易漏掉尾部斜杠、大小写、指令顺序等细节，导致规则不生效或误伤搜索引擎收录

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---------|-----|---------|------------|
| SEOptimer Robots.txt Generator | https://www.seoptimer.com/robots-txt-generator | ✅ WebFetch + screenshot | `docs/research/forge/robots-txt-generator/seoptimer.webp` |
| Keytomic Robots.txt Generator | https://keytomic.com/robot-txt-generator | ✅ WebFetch + screenshot | `docs/research/forge/robots-txt-generator/keytomic.jpg` |
| SmallSEOTools Robots.txt Generator | https://smallseotools.com/robots-txt-generator/ | ✅ WebFetch content only — **screenshot capture failed twice (HTTP 403, bot-blocked)**, not fabricated | none — see note below |

No screenshot exists for SmallSEOTools. `docs/research/forge/robots-txt-generator/` contains only `seoptimer.png` and `keytomic.png`; do not cite a SmallSEOTools image anywhere downstream.

## 3. Feature inventory

**SEOptimer** (core strength: clean deterministic form, oldest/most standard feature set)
- Default robot access toggle: Allowed / Refused (applies to `User-agent: *`)
- Crawl-Delay dropdown: No Delay / 5 / 10 / 20 / 60 / 120 seconds
- Sitemap URL input field
- Per-bot toggles (Default / Allowed / Refused) for ~15 named bots: Google, Google Image, Google Mobile, MSN Search, Yahoo, Yahoo MM, Yahoo Blogs, Ask/Teoma, GigaBlast, DMOZ Checker, Nutch, Alexa/Wayback, Baidu, Naver, MSN PicSearch
- Restricted Directories free-text input (paths relative to root)
- Output: plain textarea + "Copy to Clipboard" — **no download button**
- Upsell: nav to SEOptimer's paid audit/crawler/backlink tools; premium trial banner
- **Core strength = breadth of legacy search-engine bots**, but the named-bot list is stale (2010s-era engines like Ask/Teoma, GigaBlast, DMOZ Checker are dead or irrelevant) and it has **zero AI-crawler awareness** (no GPTBot/ClaudeBot/Google-Extended/PerplexityBot rows) — a real 2026 gap.

**Keytomic** (core strength: modern AI-crawler bot list, explicit differentiator)
- Sitemap URL input
- Crawl-Delay numeric input (optional, seconds)
- Bot toggles explicitly including **GPTBot, ClaudeBot, Google-Extended, PerplexityBot**, plus AhrefsBot, SemrushBot
- Custom Disallow/Allow rule builder with an "Add Rule" button and example placeholder paths (`/admin/`, `/wp-admin/`, `/private/`, `/temp/`, `/tmp/`)
- Live preview of the generated file as it's edited
- Output: **both Copy and Download buttons**
- Heavy page: "How It Works" 3-step explainer, educational content on robots.txt fundamentals, a "best practices for 2026" section, usage instructions, 10+ testimonials, footer nav — the actual generator is a small fraction of the page
- Upsell: prominent "$1 Trial" and "1-1 Demo" CTAs for Keytomic's broader SEO automation platform, repeated multiple times on the page
- **Core strength = being the only one of the three with AI-crawler bots built in**; the testimonials/best-practices/demo-CTA content is padding around a fairly plain generator

**SmallSEOTools** (a long-standing, widely-linked generic SEO-tool destination — *inference from its search presence and inbound linking, not a measured traffic figure*; same feature shape as SEOptimer, worse experience)
- Same default-access toggle / crawl-delay dropdown / sitemap field pattern as SEOptimer
- 13 named legacy search bots, same Same-as-Default/Allowed/Refused pattern
- Restricted Directories input with inline helper text about trailing slash requirement
- Explicit **"Create Robots.txt"** and **"Reset"** buttons — this is a run-button form, not a live-updating one
- Output: **both "Export Robots.txt" and "Copy To Clipboard"** buttons
- Extensive educational content below the fold (what robots.txt is, its SEO role, directive meanings, robots.txt vs sitemap, step-by-step instructions)
- Debt observed even via fetch: a Grammarly ad/upsell popup, a feedback-form modal, and an ad-blocker-detection warning message layered on top of the tool
- **Core strength = ranks highly and is a known destination**, but it is the most ad/popup-encumbered of the three and, like SEOptimer, carries no AI-crawler bot rows

**Cross-competitor pattern:** all three use the same underlying model (global default + per-bot override list + crawl-delay + sitemap + restricted paths), which validates it as the right feature surface. Only Keytomic has caught up to 2026 AI-crawler reality; the other two (SEOptimer, SmallSEOTools) are running a stale bot roster that actively wastes screen space on dead engines (GigaBlast, DMOZ Checker) while omitting the crawlers webmasters actually need to reason about today.

## 4. Journey maps

**SEOptimer:** Arrive at a page with the generator near the top. Toggle default access, pick crawl-delay from a dropdown, optionally type a sitemap URL, walk down ~15 individual bot toggles, optionally add restricted paths. The result textarea appears to update live (no explicit "generate" button reported) or updates on toggle change. User clicks "Copy to Clipboard" to get the text out — there is no download/export option, so the only path off the page is a paste into a text editor.

**Keytomic:** Arrive at a marketing-shaped page (header, feature highlights) before reaching the interactive generator. Set sitemap URL, optional crawl-delay, flip AI/SEO bot toggles, optionally add custom Allow/Disallow rules one at a time via "Add Rule". The preview panel updates live as fields change. Get the file via Copy or Download. Below the tool: a 3-step explainer, best-practices content, testimonials, and repeated "$1 Trial" CTAs the user has to scroll past or ignore to find the tool on return visits.

**SmallSEOTools:** Arrive at a page with login/pricing nav and a language selector above the tool. Set default access, crawl-delay, sitemap, walk the 13-bot toggle list, add restricted directories (with inline trailing-slash guidance — a real, non-obvious rule surfaced directly in the UI). This is explicitly a **run-button** flow: user must click "Create Robots.txt" to produce output (with a "Reset" button beside it), not a live-updating form. Once generated, the result can be pulled out via "Export Robots.txt" or "Copy To Clipboard". Along the way the user may be interrupted by a Grammarly upsell popup, a feedback modal, and an ad-blocker warning — friction inside the workflow itself, not just around it.

**Common shape across all three:** no file upload is ever required (this is a pure generator, not an analyzer of an existing robots.txt), the "big input" case does not really apply since inputs are short structured fields rather than free text, and none of the three validate the resulting robots.txt against real crawler behavior — they just serialize the form state to text.

## 5. Layout + screenshots

- **SEOptimer:** Generator form sits at/near the top of the page, options are moderately dense (single-column stacked toggle rows), output textarea + copy button below the form, upsell/nav content surrounds it. See `docs/research/forge/robots-txt-generator/seoptimer.webp`.
- **Keytomic:** Header/hero above the fold, generator further down mixed with feature highlights; live preview sits beside/below the form. Heavier page overall — testimonials, best-practices, and repeated trial CTAs push total page length well past the tool itself. See `docs/research/forge/robots-txt-generator/keytomic.jpg`.
- **SmallSEOTools:** Similar structure to SEOptimer (default settings → per-bot toggle grid → restricted directories → action buttons → output), but with heavier chrome (login/pricing nav, 9-language selector) above the tool and extensive educational sections + ad/popup elements around and inside the workflow. No screenshot available (blocked, see §2); description above is from WebFetch text extraction only, not a verified visual layout.

## 6. Their debt

- **SEOptimer:** No download/export button — copy-only limits programmatic reuse; upsell nav for unrelated paid SEO tools; stale, legacy-only bot roster (no AI crawlers) despite being one of the more polished forms.
- **Keytomic:** Page-to-tool ratio is poor — testimonials, "best practices for 2026," and a 3-step explainer bury a fairly small generator; repeated "$1 Trial"/demo CTAs are upsell interruptions layered directly around the tool, not off to the side.
- **SmallSEOTools:** Confirmed in-workflow dark patterns: a Grammarly ad popup, a feedback modal, and an ad-blocker-detection nag — friction injected into the actual task, which is exactly the ad-choked pattern §6.7.10 calls out as a structural weakness to never import. Also stale legacy bot list, no AI crawlers.
- **All three:** no stated API/MCP surface — this is a human-only form with no machine contract, and none document engine/version metadata or a privacy stance (though none require file upload, so there's no upload-for-local-work violation specifically).

## 7. Domain know-how

- **Directive order and grouping matter.** All directives for one `User-agent` block must be grouped together; a naive generator that emits one `User-agent` line per rule (rather than grouping all rules under a shared block when bots share the same rule set) produces a technically-parseable but bloated/confusing file.
- **Trailing slash on paths is significant** — SmallSEOTools surfaces this directly as inline help text ("path is relative to root and must contain a trailing slash '/'"). `/admin` and `/admin/` are not guaranteed equivalent to every crawler; disallow paths should be validated/normalized, not passed through raw.
- **`Disallow:` with an empty value means "allow everything"**, not "disallow everything" — a common hand-authoring mistake this tool must never produce by default.
- **Case sensitivity**: `User-agent` bot-name matching is typically case-insensitive per spec convention, but path matching under `Disallow`/`Allow` is case-sensitive on most servers — a generator must not silently lowercase user-entered paths.
- **`Allow` is not universally supported** by legacy crawlers — it's a Google-originated extension later adopted broadly, but a generator claiming universal compatibility while relying heavily on `Allow` overrides is overstating guarantees.
- **`Crawl-delay` is ignored by Google entirely** (Google uses Search Console rate settings instead) and is only honored by a subset of engines (historically Bing, Yandex) — presenting it as a universal knob without that caveat, as all three competitors do, is technically misleading.
- **Sitemap directive is a standalone line, not scoped to any `User-agent` block**, and can appear anywhere in the file, including multiple times for multiple sitemaps — a naive implementation that ties it to one bot's block is wrong.
- **2026 reality: AI-crawler governance is now a first-class, non-optional row**, not an extra. `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, `CCBot`, `Applebot-Extended`, `Amazonbot`, `Bytespider` etc. have materially different implications (training-data opt-out vs. answer-engine citation vs. classic search indexing) than classic search bots, and users increasingly come to this tool specifically to make that decision — two of the three reached generators (SEOptimer, SmallSEOTools) still ship a 2010s-era bot list and miss this entirely; only Keytomic has caught up. (No traffic comparison between the three was measured in this pass — see §11.)
- **A `robots.txt` only takes effect at the domain root** (`https://example.com/robots.txt`) — the tool should be explicit that the output must be deployed there, not at any path, and per-subdomain files are separate documents.
- **Wildcards (`*`) and end-of-string anchors (`$`) in paths** are supported by major crawlers but are non-standard extensions to the original protocol; a generator offering pattern-based rules should label them as "widely supported" rather than "standard."

## 8. Chosen archetype

**Configure-then-generate.** The options genuinely are the product — there is no meaningful "input" to transform (no file, no pasted text); the entire value is a structured decision (which bots, what delay, which paths) rendered live as a spec-correct file. The candidate alternatives are wrong for this shape:
- *Instant transform* — there's no source content to transform; nothing to "paste."
- *Decision wizard* — the user typically already knows they want a robots.txt and roughly which bots to block; a multi-step wizard adds friction for a form that fits on one screen. (A "not sure what you want" onboarding hint is fine, but the core is direct configuration, not sequential Q&A.)
- *Drop-and-verdict* — no file is being dropped or verdicted; this is generation, not evaluation.
- *Two-pane compare* — nothing is being compared.
- *Inspect-and-drill* — better fits a robots.txt *analyzer/validator* (a candidate future tool: paste an existing robots.txt, get a structural readout), not a generator.
- *Batch queue* — single, tiny, synchronous output; no queueing need.

## 9. Our design

### 9.1 Journey

*concrete enough to build from*

1. Land on the tool with the form visible immediately, no scroll needed to reach the first field (default access toggle) — above the fold, unlike SmallSEOTools's nav-heavy header.
2. Default access toggle (Allow/Disallow all) at the top, live-updating a **persistent output panel visible from the first interaction** — never a run-button flow like SmallSEOTools; every change re-renders `robots.txt` instantly.
3. Sitemap URL field (optional, validated as a URL, supports multiple — "Add another sitemap").
4. Crawl-delay field: numeric input (not just a fixed dropdown) with inline note "Ignored by Google; honored by some engines" — stating the real-world caveat competitors omit.
5. **Bot table split into two labeled groups**, addressing the domain know-how gap directly: "Search engines" (Google, Bing, Baidu, Yandex, DuckDuckBot — current, not legacy-dead entries like GigaBlast/DMOZ) and "AI crawlers" (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, CCBot, Applebot-Extended, Bytespider, Amazonbot) — each with Allow/Disallow/Default per bot. This AI-crawler group is the must-have that both higher-traffic incumbents lack.
6. Restricted-paths / custom rules section: path input with inline trailing-slash guidance and basic normalization (auto-add leading `/`), one row per rule, add/remove rows.
7. Output panel: syntax-highlighted read-only text block, always in sync with the form (no separate "generate" click), with both **Copy** and **Download `robots.txt`** buttons — Download is a must-have SEOptimer lacks.
8. No ads, no popups, no feedback modals, no login wall inside the workflow — the entire form-to-file loop must be completable with zero interruptions, directly rejecting the SmallSEOTools pattern.
9. A short, factual footnote block below the tool (not above, not interrupting) covering the domain know-how points in §7 briefly — deploy-at-root reminder, crawl-delay caveat, what Disallow-empty means — replacing the bloated testimonials/best-practices marketing copy competitors use to pad the page.

### 9.2 Layout

*Not separately written in this brief — the page structure is described inline
in the journey above (form above the fold, persistent output panel, factual
footnote block below the tool). Carried into §11 as an open item.*

### 9.3 Must-have

*Not separately written as a list in this brief. The journey above marks three
items explicitly as must-haves — the AI-crawler bot group (step 5), Download
alongside Copy (step 7), and a zero-interruption workflow (step 8). Carried
into §11 as an open item.*

### 9.4 Deliberately skipped

- No testimonials/best-practices marketing filler — it's upsell padding that pads competitor pages without helping the immediate task; our factual footnote replaces it.
- No "how it works" 3-step explainer as a gate before the tool — the tool itself is the explanation; competitors put this above the fold and it delays the first interaction.
- No trial/demo CTAs inside the tool page — commercial surfaces belong outside the workflow per §6.7.10.
- No legacy dead-bot rows (GigaBlast, DMOZ Checker, Nutch) that SEOptimer/SmallSEOTools still carry — they're dead weight, not features.
- No wizard/decision-tree step even though bot selection could be framed as "not sure" onboarding — a direct table is faster for the target user (someone who already knows this is a robots.txt task).

### 9.5 Differentiator

**Our differentiator:** we are the only reach of the three that pairs a live, ad-free, zero-interruption configure-then-generate form with a **current 2026 AI-crawler bot roster** (matching Keytomic's best feature) *and* both Copy + Download (matching Keytomic/SmallSEOTools, beating SEOptimer) *and* a factual, on-page explanation of the non-obvious rules in §7 (crawl-delay caveat, deploy-at-root, empty-Disallow meaning) that none of the three competitors state plainly next to the field that needs it. Additionally: OpenAPI + MCP contract (per §6.5 gate 2–3) makes this callable by an agent generating a robots.txt as part of a larger site-setup task — none of the three competitors expose any machine contract at all.

### 9.6 I/O contract

*for the runner, not final API spec*

- Input: `{ defaultAccess: 'allow'|'disallow', sitemaps: string[], crawlDelay?: number, bots: { name: string, access: 'default'|'allow'|'disallow' }[], rules: { path: string, type: 'allow'|'disallow' }[] }`
- Output: `{ content: string }` (the rendered robots.txt text) — deterministic, pure, no external calls, fully client-computable.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — research-only brief |
| 6 | Side-effect class declared | Described as deterministic/pure in §9.6; not declared as a formal class — carried into §11 |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (three named; one reached by text only, see §11) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

## 11. Gaps and open questions

- [ ] **SmallSEOTools has no screenshot** — capture failed twice with HTTP 403
      (bot-blocked). Its feature, journey and layout descriptions (§3, §4, §5)
      come from WebFetch text extraction only. Do not cite a SmallSEOTools
      image anywhere downstream.
- [ ] **The §2 screenshot column and the note under it disagree on file
      extensions** (`seoptimer.webp` / `keytomic.jpg` in the table versus
      `seoptimer.png` / `keytomic.png` in the note). Reconcile against the
      actual contents of `docs/research/forge/robots-txt-generator/` before
      anyone follows those paths.
- [ ] **No traffic or rank measurement was performed.** Earlier revisions of
      this brief called SmallSEOTools the "highest-traffic" destination and
      SEOptimer/SmallSEOTools the "two highest-traffic incumbents"; both are
      now marked as inference from search presence (§3, §7). If relative reach
      matters to the build decision, measure it rather than asserting it.
- [ ] **Only three competitors, all form generators.** No robots.txt
      *validator/analyzer* was torn down, even though §8 names it as the
      natural inspect-and-drill sibling — so we do not know whether users
      arriving on "robots.txt generator" queries actually want to check an
      existing file.
- [ ] **§9.2 (layout) and §9.3 (must-have) are not written separately** —
      both are currently folded into the journey list. Write them out before
      implementation so §6.5 gate 1 has something concrete to check.
- [ ] **The AI-crawler roster is a moving target with no stated source.**
      GPTBot / ClaudeBot / Google-Extended / PerplexityBot / CCBot /
      Applebot-Extended / Amazonbot / Bytespider are named from domain
      knowledge; each vendor's own documented user-agent string should be
      cited, and the list needs an update owner, or it becomes the same stale
      roster we criticise SEOptimer for.
- [ ] **Crawl-delay's "ignored by Google" caveat is stated without a
      citation** (§7) — link Google's own robots.txt documentation before
      putting that sentence next to the field in the UI.
- [ ] **Mobile behaviour unverified** for all three competitors.
- [ ] **Meter id, side-effect class, error codes and privacy note are not yet
      decided** (§10 gates 5–8).
