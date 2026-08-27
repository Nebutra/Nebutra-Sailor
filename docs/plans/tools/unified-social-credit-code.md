# Tool brief: unified-social-credit-code

Root: **Verifier (42)** — thin root (4 tools today: id-card, credit-card-luhn,
hmac-verify, email-validate), priority target per §6.7.9 to bring Verifier to
≥5. Object: Life/CN. Side effect: `pure`.

## 1. Demand

- **JTBD:** "I have an 18-character 统一社会信用代码 (Unified Social Credit
  Code) — from a form, a scraped dataset, or a counterparty's business
  license — and I need to know if it is a structurally valid code before I
  write it to a database, send it in an API call, or trust it in due
  diligence." Secondary: "I need throwaway test codes for a specific
  province/org-type to seed a dev/test fixture without hitting a real
  registry."
- **Keywords:** 统一社会信用代码校验, 统一社会信用代码验证, social credit code
  validator, 统一社会信用代码生成器, GB 32100 credit code check
- **Pain:** naive validators that only check length/charset and skip the
  checksum (silently accept typos); validators that don't reject invalid
  registration-department or admin-division prefixes; test-data generators
  that produce codes indistinguishable from real ones if published without a
  disclaimer; no way to call this from code/CI without scraping a human page.

## 2. Competitors (named, reached, captured)

Verified by direct visit (WebFetch and/or screenshot) unless noted.

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| 好运工具 (Haptool) 社会信用代码工具 | https://www.haptool.com/credit_code | Yes (WebFetch; screenshot capture failed twice — JS error in the site's own header scroll handler, `target.offset is not a function`) | not captured — see note below |
| Hutool `CreditCodeUtil` (Java library) | https://doc.hutool.cn/pages/CreditCodeUtil/ | Yes (WebFetch; it's a docs page for a library, not a UI to screenshot) | n/a — not a web tool |
| 工具兔 (Meetool) 统一社会信用代码生成和校验 | https://meetool.cn/generator/creditcode/ | Yes — WebFetch returned "Socket is closed" both times, but the screenshot capture (headless Chromium) succeeded and rendered the full page, so this is now independently confirmed live | [meetool.png](../../research/forge/unified-social-credit-code/meetool.png) |
| UFreeTools 统一社会信用代码生成器 | https://www.ufreetools.com/zh/tool/unified-credit-code-generator | Yes (WebFetch + screenshot) | [ufreetools.png](../../research/forge/unified-social-credit-code/ufreetools.png) |
| 全国组织机构统一社会信用代码查询平台 (cods.org.cn) | https://www.cods.org.cn/gscx/ | Yes — WebFetch failed ("Socket is closed"), screenshot succeeded | [cods.png](../../research/forge/unified-social-credit-code/cods.png) |

**Screenshot note (haptool.com):** `research-screenshot.mjs` failed twice on
this URL with `page.evaluate: TypeError: target.offset is not a function` at
the site's own `webpack://haptool-web/./src/js/common/header.js` scroll
handler — a bug in their header JS, not our script. Per instructions, this is
recorded as a failed capture rather than fabricated; the feature description
below for haptool.com comes only from the WebFetch text read, not from a
screenshot I have seen.

## 3. Feature inventory

**Haptool** (closest direct-competitor shape to what Forge would ship):
- One text input for an existing code + a **"Validate Code"** button
  (button-triggered, not live) returning a boolean.
- A separate **"Random Generate"** button producing one new 18-character
  code per click.
- In-page explanation of the code structure (登记管理部门代码 1 位, 机构类别
  1 位, 行政区划 6 位, 主体标识码 9 位, 校验码 1 位).
- **Open REST API** at `/openapi/credit_code` with curl examples for both
  generate and validate, JSON response (`code`/`message`/`data`), rate-limited
  to 6 requests/minute/IP. This is the one competitor here that already ships
  the machine-contract half of what Forge requires by default.
- No visible ads. Core strength = the API; the human page is a thin
  demonstration of it.

**Hutool `CreditCodeUtil`** (the developer-library reference point, not a
page):
- `isCreditCode(String code)` — validation.
- `randomCreditCode()` — random valid-code generation.
- No parsing/decompose method is documented on this page (no
  `getOrgType()`/`getAdminDivision()`-style accessor shown) — Hutool treats
  the code as an opaque pass/fail + generate pair, not an inspectable
  structure. This is a real gap for anyone who wants to know *why* a code
  failed or what province it encodes.
- Zero UI, zero API surface of its own — it's a JAR dependency. Its "reach"
  is through being bundled into thousands of Chinese backend codebases, not
  through search traffic. Core strength = ubiquity in the Java ecosystem;
  weakness = no explainability, no standalone consumability from non-Java
  stacks.

**Meetool (工具兔)** (broadest single-page feature set of the four reached):
- Sits inside a large general-purpose tool-station sidebar (100+ tools) —
  same "station, not single blade" positioning we are pursuing, worth noting
  as a structural peer, not just a feature competitor.
- An explicit **structure table** at the top of the tool: 18 numbered columns
  mapped to 登记管理部门代码 / 机构类别代码 / 登记管理机关行政区划码 (6 位) /
  主体标识码(组织机构代码, 9 位) / 校验码 — i.e., they render the code's own
  anatomy as a legend before any input, which is a genuinely good teaching
  pattern.
- **验证 (verify)** section: one text input for an 18-digit code (no visible
  live/button distinction confirmed from the screenshot alone — a text field
  under a "验证" heading, consistent with button-triggered given the site's
  general form pattern).
- **生成选项 (generation options)**: 机构类型 dropdown (institution type) and
  注册地 省份/地区 dropdown (registration province/region) — i.e. generation
  is *configurable* by two real-world facets, not just "give me any code."
- **随机生成 (random generate)** produces a batch of 10 codes at once (not
  one at a time like Haptool), each marked "点击可复制" (click to copy),
  with a **"换一批" (get another batch)** button to regenerate the whole set.
- Explicit in-page disclaimer: "本工具仅用于学习演示、测试、格式校验、禁止伪造、
  盗用、用于违法违规行为，使用者自行承担全部法律责任" (for learning/testing/
  format-checking only; forging or misusing is prohibited; user bears legal
  responsibility) — a compliance note worth mirroring given real registered
  entities' codes are discoverable/guessable-adjacent data.
- **相关工具 (related tools)** row directly below: 姓名 / 英文名 / 企业名称
  checkboxes — hints at a paired "generate a plausible fake company name to
  go with the fake code" feature (fake-data-suite adjacency), which is
  upsell/scope-creep relative to a pure verifier, not something to copy.
- No visible ads inside the tool card itself (a "请作者喝杯咖啡" tip-jar QR
  box sits below the tool, not inside the input/output flow).

**UFreeTools** (most complete standalone generator, explicit about the
standard and the algorithm):
- **Generation only** — no validate-an-existing-code input found on this
  page; the tool is scoped purely to producing test codes.
- Four generation options: 登记管理部门 (24-way dropdown, codes 1–9, A–X —
  industry/commerce, tax, customs, etc.), 机构类别 (4-way: enterprise /
  individual trader / agricultural co-op / other), 行政区划代码 (34-way
  province/region dropdown, or random), and **quantity 1–1000**.
- Batch output table showing each generated code broken into its component
  fields, with copy-all, copy-selected, and **export to TXT/CSV/Excel**.
- Explicitly states the checksum algorithm: **ISO 7064:1983 MOD 11-2**, and
  cites **GB 32107-2015** for structure/character-set and **GB/T 2260** for
  the administrative-division digits — the clearest standard citation of any
  competitor reached.
- Below the tool: a genuinely thorough "complete guide" — what the code is,
  use cases (dev testing, data masking, education, business-process
  simulation), a 4-step how-to, an FAQ (code vs old 组织机构代码 relationship,
  can this register a real entity — explicitly "no", how to verify a real
  code — points to gsxt.gov.cn), a component breakdown table, a compliance
  history paragraph (implemented nationally Oct 2015, fully merged by 2018),
  and cross-links to an ID-card generator, checksum calculator, password
  generator. This is dense, deliberate SEO/教育 content, not upsell — but it
  also means the actual tool card is a small fraction of the page's vertical
  space (the tool itself is ~1 viewport of a ~9000px-tall page).
- No visible ads; no API found.

**cods.org.cn** (the authoritative government registry — different product
shape, cited for standard-of-record only):
- Single search box with a 代码/名称 (code/name) mode toggle and a 搜索
  button — this queries a **live government database** of actually-registered
  entities, not a checksum/structure validator. It answers "does this code
  belong to a real, registered organization, and what is it," not "is this
  code well-formed."
- No generation feature (nor should it have one — it's a registry, not a
  test-data tool). No API surface visible on this page. Login/register links
  present (登录/注册) suggesting deeper features are gated.
- Cited here only as the standard-of-record for GB 32100-2015/GB 32107-2015
  and as the place a user should go if they need to confirm a code
  corresponds to a *real* entity — our tool must not claim to do this and
  must link out to it for that need, per the "verifier answers provably, not
  plausibly" framing in §6.7.2.

## 4. Journey maps

**Haptool:** land on page → type/paste a code into the validate field → click
"Validate Code" → boolean result appears below → separately, click "Random
Generate" → a new code appears. Two independent actions, two independent
buttons; no combined "here is a code, tell me what's wrong with it and also
give me a fresh one" flow. Copy behavior not confirmed from the WebFetch
read (no screenshot secured).

**Hutool:** not a page — the "journey" is `import` → call `isCreditCode(...)`
or `randomCreditCode()` → read the boolean/string return value in code. No
UI at all; this is the pure developer-library end of the spectrum, useful as
a reminder that some of our traffic for this tool is a code snippet search,
not a person with a browser.

**Meetool:** land on page inside a 100+-tool sidebar station → structure
table is visible immediately (teaches the anatomy before any input) → 验证
input for pasting an existing code → separately, 生成选项 (机构类型 +
省份/地区 dropdowns) → 随机生成 produces a batch of 10 at once, each
click-to-copy → 换一批 regenerates the whole batch → disclaimer sits directly
under the output, not buried in a footer → 相关工具 row offers adjacent fake-
data generators. Verify and generate are two separate sections on one page,
not one combined "check or make" surface.

**UFreeTools:** land on page → configure 4 generation options (registration
authority, org type, province, quantity) → click "生成代码" → results table
appears with per-code component breakdown → copy-all / copy-selected /
export TXT/CSV/Excel → below the tool, a long educational document explains
the standard, the algorithm, and FAQs, with an explicit "this cannot be used
to register a real entity" caveat and a pointer to gsxt.gov.cn for real
verification. No validate-an-existing-code path exists on this page at all —
generation-only.

**cods.org.cn:** land on page → single search box, choose 代码/名称 mode →
type a real code or company name → search → (not explored past this point,
since deeper pages require login) presumably returns matched registry
records. This is a lookup-against-a-database journey, structurally different
from a checksum verifier — no relevance to how our tool's core flow should
work, only to what it is *not*.

## 5. Layout + screenshots

- **Haptool:** simple single-column tool — input + two buttons stacked;
  explanation text below; API docs further below; nav sidebar with 40+ other
  tools. Not independently screenshot-verified, so layout description here
  is lower-confidence than the others (WebFetch text read only).
- **Meetool:** classic dense sidebar tool-station layout (station-wide left
  nav with 100+ tools across a dozen categories) + a right-hand-side "皮肤/
  语言/相关工具" utility rail. The tool card itself is compact and entirely
  above the fold on a standard viewport: structure-anatomy table → 验证 input
  → 生成选项 (2 dropdowns) → 随机生成 button → batch-of-10 output list →
  disclaimer → related-tools checkboxes. A tip-jar QR promo sits below the
  tool, outside the workflow.
- **UFreeTools:** dark-themed tool card at the very top (options panel left,
  results panel right, side-by-side — genuinely above the fold), followed by
  an extremely long single-column educational document (structure legend,
  "complete guide," FAQ, standards citations, related-tool cross-links) that
  makes up the vast majority of the page's ~9000px height. The tool-to-content
  ratio is roughly 1:8 by vertical space — the SEO content is doing real
  educational work but visually dwarfs the tool.
- **cods.org.cn:** government-institutional layout — logo + top nav, then a
  single centered search bar with a mode dropdown, three secondary links
  (查询说明/查询帮助/法律声明) beneath it, then an official-links footer. No
  tool "card" in the SaaS sense — it reads as a ministry portal, which is
  appropriate for what it is.
- Mobile behaviour: not verifiable from static screenshots/WebFetch for any
  of the four; not claimed here.

## 6. Their debt

- **Haptool** hides its layout from us (screenshot capture failed on their
  own JS bug) — a fragile header script that breaks programmatic scrolling
  is itself a quality signal, even though the tool's function may work fine
  for a normal click-through user.
- **Meetool** bundles unrelated fake-data generators (姓名/英文名/企业名称)
  as "related tools" directly beneath a compliance disclaimer about not
  misusing the credit-code generator — an odd juxtaposition that nudges
  toward exactly the kind of "generate a fake company + fake code together"
  use the disclaimer just warned against. No visible API.
- **UFreeTools** has no validate-an-existing-code path at all — a user who
  already has a code and just wants a yes/no answer must go elsewhere; the
  tool only solves half of the JTBD. No visible API. The tool-to-SEO-content
  ratio is heavily skewed toward content, which is fine for ranking but means
  the actual utility is a small fraction of the page.
- **cods.org.cn**, being the authoritative registry, is out of scope to
  criticize as "debt" — but it structurally cannot serve the checksum/format-
  validation JTBD at all (it needs a real registered entity to return a hit),
  so it cannot be the answer for "is this code well-formed," only for "does
  this code belong to someone."
- **None of the four reached competitors expose both validate AND generate
  behind an agent-callable API except Haptool** — and even Haptool's API is
  rate-limited to 6 req/min/IP, too tight for any batch/CI use case.
- **None of the four explain checksum *failure* in a structured, field-level
  way** (e.g., "checksum mismatch: expected X, got Y" vs. "invalid admin-
  division prefix") — every competitor here returns pass/fail or a fresh
  code, not a diagnostic.

## 7. Domain know-how

1. **The code is not a random 18-char string — it is five concatenated
   fields, and validity must be checked per-field, not just via the final
   checksum.** Per GB 32100-2015 / GB 32107-2015 (both cited by UFreeTools;
   Meetool's own on-page legend matches): position 1 = 登记管理部门代码
   (registration department, from a fixed small charset: `1,5,9,Y,N,G,Q,T,A,
   C` etc. — a bounded enum, not "any letter"), position 2 = 机构类别代码
   (organization category, also a bounded enum), positions 3–8 = 行政区划代码
   (a real GB/T 2260 administrative-division code — six digits that must
   correspond to an actual province/city/county code, not any six digits),
   positions 9–17 = 主体标识码 (the legacy 9-character 组织机构代码, itself
   with its own historical check-digit rules), position 18 = the overall
   checksum. A naive "18 chars, alnum, checksum passes" validator will accept
   strings with a nonsense administrative-division code or an invalid
   department code as long as the final checksum happens to work out —
   Haptool's structure explanation and Meetool's/UFreeTools' anatomy tables
   all point at this, but neither of the two validate-capable tools reached
   (Haptool, Meetool) confirm they actually check the admin-division digits
   against the real GB/T 2260 table rather than just their charset.
2. **The checksum algorithm is ISO 7064:1983 MOD 11-2, and the character set
   for the whole code (excluding `I`, `O`, `Z`, `S`, `V`) matters for both
   the weighted-sum step and the check-digit alphabet.** UFreeTools states
   this explicitly; the check digit is computed over a 31-character alphabet
   (`0-9` + `A-H,J-N,P-R,T-U,W-X,Y` roughly — excluding the ambiguous-looking
   letters), with a specific weight vector per position. Getting the
   character-to-value mapping wrong (e.g., naively treating it as base-36
   with `I`/`O` included) will produce checksums that look plausible but are
   wrong — a classic naive-implementation bug in every from-scratch reimplementation
   of this checksum found in blog posts and Stack Overflow-style answers.
3. **Validation and generation are asymmetric problems and both must be
   correct independently.** A generator that produces a code by picking valid
   characters and then just computing the correct check digit is not
   automatically a correct generator if it also needs to respect real
   registration-department and administrative-division constraints — this is
   exactly why UFreeTools makes 登记管理部门/机构类别/行政区划 all explicit,
   user-selectable enums rather than random characters: a "valid-looking"
   code that used a nonexistent admin-division digit-string would still pass
   a checksum-only validator, silently testing the wrong thing in a QA
   fixture.
4. **This is legally sensitive test/fake data, not neutral demo output.**
   Meetool's explicit disclaimer ("禁止伪造、盗用...使用者自行承担全部法律
   责任") and UFreeTools' FAQ answer ("不可以，本工具生成的信用代码仅用于测试
   目的...不能用于实际企业注册") both treat this as a real compliance
   surface — a generated code is a syntactically valid Unified Social Credit
   Code and could be mistaken for or misused as a real one if presented
   without a clear "TEST DATA — not registered" marker. Any generator we ship
   must carry an explicit, structured `isTestData: true`-style flag in its
   output, not just prose disclaimer text a script would ignore.
5. **"Valid" and "belongs to a real, currently-registered entity" are two
   different questions, and a single-purpose checksum verifier must not blur
   them.** cods.org.cn is the only reached source that answers the second
   question (name/registration lookup against a live database); our tool
   answers only the first (structural/checksum validity) and should link out
   to cods.org.cn (or state the limitation) for anyone who actually needs to
   confirm real-entity registration — conflating the two, or implying our
   pass result means "this company is real," would be a false-confidence
   trap for due-diligence use cases.
6. **The legacy 组织机构代码 (9-char Org Code) embedded at positions 9–17 has
   its own older check-digit convention** (mod-11 over 8 weighted digits with
   a hyphen before the historical 9th check character, per the older
   GB 11714 standard it superseded) — a fully rigorous validator ideally
   cross-checks this sub-code too, though none of the reached competitors
   confirm they do this; it is a documented gap worth stating honestly in
   our own output (`subOrgCodeChecked: false` or similar) rather than
   silently skipping it and implying full verification.

## 8. Chosen archetype

**Instant transform**, for the validate path — paste a code, get a live,
structured verdict with no run button (checksum + structural validation on an
18-character fixed-length string is sub-millisecond, so a button is a step
tax) — combined with **configure-then-generate** for the generate path, where
picking 登记管理部门/机构类别/行政区划/quantity *is* the product and the
output regenerates each time an option changes or "Generate" is pressed.

Why not the others:
- *Decision wizard* — wrong: the user already has a concrete 18-char string
  in hand for the validate path, or already knows they want "N test codes for
  province X, org-type Y" for the generate path; neither is a "help me figure
  out what I want" narrowing flow.
- *Drop-and-verdict* — close for the validate path (a verdict is exactly what
  we return), but "drop" implies a file/upload; this is a single short text
  string typed or pasted, which is squarely instant-transform territory, not
  a file-drop pattern.
- *Two-pane compare* — wrong: there is one code being checked at a time, not
  two artifacts being diffed against each other (a future
  "batch-validate-a-CSV-column" variant could look different, but that is a
  Processor/J-surface concern per §6.7.9, out of scope for this Core tool).
- *Inspect-and-drill* — considered seriously, since the validate path does
  expose a decomposed structure (department/org-type/admin-division/org-code/
  checksum) the user can explore — but the structure here is flat and small
  (5 fields), not a deep nested tree like a JWT payload or JSONPath result;
  instant-transform's "live, no button" framing is the more decisive fit for
  something this fast and this shallow.
- *Batch queue* — wrong for Core; single-code validation and ≤1000-code
  generation (matching UFreeTools' own cap) are both synchronous. A future
  bulk-CSV variant belongs on the J surface, not here.
- Plain *form + button* for validation specifically is rejected because the
  entire computation (charset check, per-field structural check, MOD 11-2
  checksum) is deterministic and near-instant on an 18-character string —
  making the user click "Validate" for that is an unnecessary step tax, and
  Haptool's own button-gated UX is the thing to *not* copy here.

## 9. Our design

### 9.1 Journey

*instant transform*

1. Land on page: a single-line `Input` labeled "统一社会信用代码" is the
   dominant above-the-fold element, with a compact anatomy legend (5
   color-coded segments: 登记管理部门 / 机构类别 / 行政区划 / 主体标识码 /
   校验码) directly beneath it, always visible even before typing — mirroring
   Meetool's good "teach the structure first" instinct without needing a
   separate table.
2. As the user types/pastes (debounced ~100ms, since 18 chars is trivial to
   re-check on every keystroke), the legend segments light up green/red
   per-field as soon as each has enough characters to check, and a headline
   verdict (✅ Valid / ❌ Invalid) appears once all 18 characters are present
   — no button, matching the instant-transform archetype.
3. On invalid input, the result is **field-level, not a bare boolean**: which
   segment failed (e.g., "位 3–8 行政区划代码 无效：非已知省级/市级代码" or
   "校验码不匹配：应为 T，实际为 7") — the diagnostic none of the four
   competitors provide.
4. **Output actions:** Copy the verdict as JSON (structured, agent-consumable)
   — this is the piece none of the four human-facing competitors expose as a
   first-class action; Haptool's API is the only prior art for machine
   consumption, and even it is not paired with the human page's own copy
   button.
5. **Error/edge states:** fewer than 18 characters → neutral "incomplete"
   state, not a false "invalid"; disallowed characters (`I`, `O`, `Z`, `S`,
   `V`, lowercase) flagged inline at the offending position immediately,
   without waiting for 18 characters.

*configure-then-generate*

1. Same page, second tab/section: four controls — 登记管理部门 (enum select,
   default "任意有效值/random valid"), 机构类别 (enum select), 行政区划
   (searchable province/city select, default "随机"), and 数量 (1–1000,
   matching UFreeTools' own cap as a sane, already-market-validated ceiling).
2. Output regenerates live as any option changes (no separate "Generate"
   click required once at least one code exists) — but also offer an explicit
   "重新生成/Regenerate" button for the case where the user wants a fresh
   batch with the *same* settings, since changing an option won't naturally
   retrigger a batch under otherwise-identical options.
3. Every generated code carries a visible, structural
   `isTestData: true` marker in both the UI (a badge, not just prose) and the
   JSON output — closing the compliance gap both Meetool and UFreeTools flag
   in prose but neither enforces structurally.
4. **Output actions:** copy-one, copy-all, export CSV/JSON (skip TXT/Excel —
   CSV covers the same need with one format, JSON is the agent contract;
   Excel export is UFreeTools' padding, not a must-have).
5. A single-line compliance note sits directly under the output ("Test data
   only — does not correspond to a registered entity; verify real codes at
   the national registry"), with a link out to cods.org.cn — stating our
   scope limitation honestly rather than implying authority we don't have.

### 9.2 Layout

- Above the fold: two tabs (验证/Verify, 生成/Generate) at the top of the
  tool card; whichever tab is active shows its full input+legend / options+
  output in one viewport on desktop — no scrolling needed to get a first
  result, matching UFreeTools' side-by-side options/results pattern rather
  than Meetool's stacked-sections pattern.
- Options density: Verify tab has zero configurable options (paste and go);
  Generate tab has exactly four controls, all with sane defaults so the
  first "生成" click works with zero configuration — honoring "instant use"
  (§6.5 gate 1) on both tabs.
- Mobile: single-column stack — tabs, then input/legend or options, then
  output — no sidebar-dependent layout (unlike Meetool's station-wide nav,
  which is a house-level concern, not this tool's).

### 9.3 Must-have

*without these, users bounce back to a competitor*

- Field-level failure diagnostics on invalid input (none of the four
  competitors do this — direct differentiator).
- Both validate and generate on one page/tool (Haptool and Meetool do both;
  UFreeTools does generate-only — matching the stronger pattern).
- Admin-division validation against real GB/T 2260 codes, not just charset
  (closes know-how gap #1).
- Structured `isTestData` flag on generated codes, enforced in both UI and
  JSON (closes the compliance gap every competitor only states in prose).
- JSON output on both endpoints, OpenAPI + MCP callable, no rate limit as
  tight as Haptool's 6/min (this is the Core-tier machine contract none of
  the four fully deliver).

### 9.4 Deliberately skipped

- TXT/Excel export (UFreeTools) — CSV + JSON cover the real need with less
  surface area.
- Bundled fake-name/fake-company generators (Meetool's "相关工具" row) — out
  of scope for a Verifier; if useful, that is a separate Generator-root tool,
  not bolted onto this one.
- Name/registration-number lookup against a live database (cods.org.cn's
  entire product) — a fundamentally different, stateful, external-data
  product; we link out to it rather than half-build it.
- The long-form "complete guide" SEO essay UFreeTools ships beneath its tool
  — useful for their ranking, but Forge's SEO copy is handled by the shared
  page-model layer per §6.3, not a bespoke essay per tool.

### 9.5 Differentiator

**Our differentiator:** field-level diagnostic output (which segment failed
and why) that none of the four reached competitors provide; both directions
(validate + generate) on one page with one shared schema, unlike UFreeTools'
generate-only scope; a structural `isTestData` flag instead of prose-only
disclaimers; and full OpenAPI + MCP callability with a workable rate limit,
where the strongest competitor found (Haptool) throttles its API to 6
requests/minute/IP — too tight for any real CI or batch workflow.

### 9.6 I/O contract

*for the implementer*

```
POST /verify
input:  { code: string }
output: {
  valid: boolean,
  fields: {
    registrationDept:   { value: string, valid: boolean },
    orgCategory:        { value: string, valid: boolean },
    adminDivision:      { value: string, valid: boolean, region?: string },
    orgIdentifier:      { value: string, valid: boolean, legacyChecksumChecked: boolean },
    checkDigit:         { expected: string, actual: string, valid: boolean }
  },
  error?: string   // human-readable, e.g. "checksum mismatch"
}

POST /generate
input:  { registrationDept?: string, orgCategory?: string, adminDivision?: string, count?: number /* 1-1000, default 1 */ }
output: {
  codes: Array<{ code: string, isTestData: true, fields: { ...same shape as verify } }>
}
```
Side effect: `pure`. Engine: implement the ISO 7064:1983 MOD 11-2 checksum
and the GB 32100-2015/GB 32107-2015 field structure directly (small,
well-specified, checksum-class algorithm — not a "手搓禁止" violation the way
a statistical charset detector would be, since this is a closed-form
checksum with a published spec, comparable in kind to how `credit-card-luhn`
is already implemented in the existing thin Verifier set) rather than porting
Hutool's Java implementation; validate the admin-division digits against a
real GB/T 2260 code table rather than a bare regex, per know-how item 1.

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

- [ ] **Haptool has no screenshot** (§2) — `research-screenshot.mjs` failed
      twice on a JS error in the site's own header handler. Every Haptool
      claim in this brief comes from WebFetch text only. Do not cite a Haptool
      image anywhere downstream.
- [ ] **GB 32100-2015 was not read directly.** The five-field structure and
      checksum rules (§7) are sourced from competitors' on-page legends
      (UFreeTools, Meetool) and Hutool's library docs, all of which cite the
      standard — not from the standard's own text. For a Verifier whose whole
      value is being right, this is the load-bearing unclosed gap: get the
      normative text before shipping a correctness claim.
- [ ] **GB/T 2260 administrative-division data has no named source or update
      path** (§7 item 1). Validating positions 3–8 against real division codes
      is our stated differentiator; where that table comes from, how stale it
      may be, and what we report for a historically-valid-but-now-retired
      division code are all undecided.
- [ ] **Whether Haptool or Meetool actually validate the division digits is
      unconfirmed** (§7 item 1) — neither was exercised with a code carrying a
      structurally valid checksum and a nonsense division code, which is the
      one test that would settle it. Until then, "no competitor does this"
      (§9.5) is an inference from their copy.
- [ ] **No competitor was exercised at all**, in fact: all descriptions are
      entry-state captures plus page copy, so generate-tab output shape and
      copy behaviour (§4) are inferred.
- [ ] **Generated codes must be unmistakably marked as test data.** The
      generate half of this tool emits strings that look like real registered
      entities; the brief does not yet state how the UI, the copy payload, and
      the API response each make that unambiguous.
- [ ] **Mobile behaviour unverified** for all reached competitors.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in this brief.
