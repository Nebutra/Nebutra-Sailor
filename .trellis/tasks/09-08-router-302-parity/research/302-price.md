# 302.AI price table — full capture (`https://302.ai/price`)

Captured 2026-09-09 via opencli session `r302p` (logged-in owner account) plus `curl` of the static HTML. Read-only; nothing was typed except the price-page search box, and the outer-nav currency dropdown was only opened, never selected.

## 1. Summary

`302.ai/price` is a thin Nuxt shell (top nav + footer + floating right rail) that embeds an **iframe** `https://price.302.ai/en/pricing_website/` (zh: `https://price.302.ai/pricing_website/`, ja: `/ja/`). The iframe is a fully **static Astro page**: all **430 price tables / 3,695 rows** (Bot 25 tables · 734 rows, Other Applications 227 · 969, API 178 · 1,992) are pre-rendered in the HTML and simply toggled with `hidden`; the raw catalog is also carried once more as a JSON string in `<astro-pricing data-dataList="…">` (3.2 MB) which the client script parses then blanks. There is **no pricing API** to call. Every price cell holds four precomputed currency spans (`pricing-en $`, `pricing-zh ¥`, `pricing-jp ¥`, `pricing-ru ₽`) at fixed FX (**USD×7 = CNY, ×147 = JPY, ×78 = RUB**); the `$ ¥ 円 ₽` toggle only flips visibility and does not persist. Units are free text inside the price string: 1,503 cells are `Input/Output … / 1M tokens`, 862 `/ call`, 76 `/ second`, 53 `/ image`, 45 `/ 1M characters`, plus `/ min`, `/ page`, `/ URL`, `/ Point`, `/ MP (megapixel)`, `/ day/Key` and ~30 prose formulas (`Sandbox runtime (seconds) * 0.001 PTC`, `Refer to LLM`, `Charged according to the corresponding image model`). LLM rows carry `302.AI` price, `OpenAI Price` (mis-labelled: it means *upstream list price*), `Compare` (`Original Price` ×621 / `Original Price＋10%` ×110) and `Context`. Tiering is expressed as **duplicate rows** with a `Description` such as `<272K context length` / `>272K context length`, `≤ 200K input tokens`, `0<Token≤32K`. **Cache pricing appears only as a footnote on 2 rows** (claude-opus-4-6: `Cache write: $12.5 / 1M tokens, Cache Read: $1 /1M tokens`); there is **no batch-API pricing** (the 4 "batch" hits are Firecrawl/AMiner endpoint names); there are no volume discounts. Search is a client-side substring match over the parsed catalog that returns `<label> - <group>` rows and, on click, expands the sidebar, shows the table and scrolls the row into view. The whole thing is one 8.8 MB HTML document.

Artifacts next to this file:
- `302-price.normalized.json` — all 430 tables, every row, en + cny strings (1.3 MB)
- `302-price.parse.py` — stdlib parser used (HTMLParser over the static HTML; note the `<` escaping fix for `Token<=256K`)
- `shots/price-*.png` — screenshots (§5)

## 2. Page / feature inventory

| URL | Purpose | Key fields / columns | Actions / buttons | States / empty / error | Notes |
|---|---|---|---|---|---|
| `https://302.ai/price` | Nuxt shell page "Pricing - 302.AI" | Top nav: `USD $ ▾` (options `USD$ / CNY ¥ / JPY ¥ / RUB₽`), `English ▾`, `<user> ▾`, `Home`, `Dashboard`, `Quick-Start`, `Technical Support ▾`, `Change Log`, `Notify` (Discord popover). Floating right rail: `Contact us`, `Price List`, `Token Calculator`, `Client`, `Help Center`. Footer: Quick Access / Support / Popular Products / About Us / Legal Statement | Currency dropdown is an **account-level display setting** (Nuxt) and does **not** propagate into the iframe; the iframe keeps its own `$ ¥ 円 ₽` toggle. Language switch changes iframe `src` locale prefix | No loading/empty state; iframe is `cross-origin`, height fixed by parent (`#layout-content` scroll) | Prior study §3.6 called this "双入口"; confirmed: two independent currency controls |
| `https://price.302.ai/en/pricing_website/` (iframe) | Static Astro price catalog (`<astro-pricing class="pricing-item">`) | H1 `All robots and tools are created and shared without limit, only for the amount of AI or the number of calls`; lede ends `The top-up balance is permanently valid and never expires.(1PTC=1USD)`; tab pills `Bot` / `Other Applications` / `API` (`.pricingItem-tag .tag`, `data-index` 0/1/2); `Search` input (`.search-input`) + magnifier icon; left accordion sidebar (`.{robot,tools,api}-tags` → `.tagsTitle-btn` group + `.tags-btn` provider, `data-index="g,p"`); currency toggle `$ ¥ 円 ₽` (`.change-pricing[data-lang=en|zh|jp|ru]`); table area `.pricing.scroll-item` (max-h 780px, inner scroll) | Tab click → `V(tab)`: hides all other tabs' sidebars+tables, opens first group, selects first provider. Group title click → toggles `active` / `hidden` on its provider list (multiple groups may stay open). Provider click → shows `[data-index]` table. Currency click → toggles `.pricing-<lang>` spans globally. Search: `input` event builds dropdown `.search-list`; Enter or icon click = click first (or exact) result; blur hides after 200 ms. Deep link `?tool_index=0|1|2` selects tab on load | No empty state for search (list just hidden); no "no results" copy; no loading (SSG). Search results include duplicates (one per matching cell) and description text hits | Analytics: Matomo + GA4. Mobile: `max-sm:text-xs`, sidebar stacks (`max-[830px]:ml-0`) |
| `https://price.302.ai/pricing_website/` | zh catalog | Same DOM, zh header strings (`原价 / 对比 / 说明 / 上下文长度`) | Same | Default currency is still `$` even on zh page (`pricing-en` visible, `pricing-zh` hidden) | JS at `/_astro/hoisted.dd38a149.js` (behaviour), `/_astro/page.993a363a.js` (Alpine runtime) |

### 2.1 Table anatomy (what one `.grid-item` is)

- Rendered as CSS grid `grid-flow-col`, `grid-template-rows: 54px repeat(N, minmax(0,1fr))` — i.e. **column-major**: each column is a run of N+1 cells, first cell is the header (`bg-[#e4e0ff]`). Column 1 is `min-w-[200px]`, others `min-w-[120px]`. Horizontal overflow scrolls inside the card (`overflow-x-scroll`), vertical inside `.scroll-item`.
- Header of column 1 is the **provider name** (`OpenAI Model`, `Kling`, `Feature`…), not "Model".
- API column shapes (178 tables, first header = provider name): `302.AI | Description` ×163; `302.AI | OpenAI Price | Compare | Description | Context` ×10 (the LLM provider tables); `302.AI | OpenAI Price | Compare | Description` ×5 (DALL·E, Google image, Baidu, Doubao TTS, Google embedding).
- Bot/Tools tabs reuse the same shapes (`302.AI | OpenAI Price | Compare | Description | Context` ×150, `302.AI | Description` ×92, 4-col ×10).
- Price cell HTML: `Input: <span class="pricing-en">$0.2</span><span class="hidden pricing-zh">¥1.4</span><span class="hidden pricing-jp">¥29.4</span><span class="hidden pricing-ru">₽15.6</span> / 1M tokens <span class="… h-[2px] …"></span> Output: …` — the divider is a styled span, so a11y/text extraction reads it as one run.
- `Description` cells are `<a href="https://302ai-en.apifox.cn/api-…">` (or `https://doc.302.ai/…`) around the note → every row links to its Apifox doc page.

### 2.2 Sidebar taxonomy (complete)

| Tab | Groups (data-index) | Providers / sub-tags |
|---|---|---|
| Bot (`robot`) | `Chat-bot` (0) · `App-bot` (1) · `Drawing-bot` (2) · `Knowledge Base-bot` (3) | Chat-bot: OpenAI Model, Anthropic Model, Google Model, China AI Model, SiliconFlow, PPIO, SophNet, Expert Model, Open Source Model, Other Models, Feature · App-bot: App Proprietary Model · Drawing-bot: Midjourney, Flux, Stable-Diffusion, Ideogram, Recraft, Luma, Doubao · KB-bot: OpenAI Model, China AI Model, Open Source Model, Anthropic Model, Jina, Feature |
| Other Applications (`tools`) | 56 app groups (AI Translate Master … AI Avatar Generator) | mostly the LLM provider list per app, plus app-specific vendors (DeepL, Azure, Fish Audio, Chanjing, Hedra…) and a `Feature` table of per-call surcharges |
| API (`api`) | `LLM` (0) · `Image Generations` (1) · `Image Processing` (2) · `Video Generation` (3) · `Audio-Video Processing` (4) · `Data Processing` (5) · `RAG-related` (6) · `Tools API` (7) · `MCP Server` (8) | LLM: OpenAI Model, Anthropic Model, Google Model, China AI Model, SiliconFlow, PPIO, SophNet, Expert Model, Open Source Model, Other Models, **Custom Model, Reasoning mode, Link Parsing, Search online, Image analysis, Long-Term Memory(Beta), Depth-First Search, tool invocation, Asynchronous call, Claude Format, Claude Code Sandbox** (feature surcharges live in the same group as models) · Image Generations: General Interface, GPT-Image, DALL·E, Stability.ai, Midjourney, Midjourney-Relax, 302.AI, Glif, Flux, Ideogram, Recraft, Luma, Jimeng, Google, Minimax, ZHIPU, Baidu, Hidream, Bagel, SiliconFlow, Higgsfield, Kling, Tongyi Wanxiang, Vidu, Grok · Image Processing: 25 vendors (302.AI, 302.AI-ComfyUI, Vectorizer, Stability.ai, Clipdrop, … Photoroom) · Video Generation: 31 (Unified Interface, 302.AI, Luma AI, Runway, Kling, … OpenAI, WaveSpeed) · Audio-Video: 18 (General Interface, OpenAI Model, Azure, Suno, Elevenlabs, Fish Audio, Minimax, …) · Data Processing: 24 (Tavily, SerpApi, Search1API, Doc2x, Jina, Exa, DeepL, Bocha AI, Firecrawl, MinerU, Perplexity, AMiner…) · RAG-related: OpenAI Model, China AI Model, Jina, 302.AI, SiliconFlow, Google · Tools API: 19 app-as-API entries · MCP Server: Audio Video, Browser Use, FIle, Image, Math, PPT, Sandbox, Web Deploy, Web Search Tools |

Full machine-readable taxonomy is in §7 block `taxonomy`.

### 2.3 What exists vs. what the task asked for

| Asked | Found |
|---|---|
| LLM | `API › LLM` — 10 provider tables (OpenAI 82 rows, Anthropic 21, Google 24, China AI 322, SiliconFlow 50, PPIO, SophNet, Expert 18, Open Source, Other 29) |
| image | `Image Generations` (25 vendors) + `Image Processing` (25) |
| audio | `Audio-Video Processing` (TTS/STT/music: OpenAI tts-1/whisper, Azure, Elevenlabs, Fish, Minimax, Suno, Mureka…) |
| video | `Video Generation` (31 vendors; per-call or per-second) |
| embedding | `RAG-related` (OpenAI, Jina incl. rerankers, Google gemini-embedding-001, SiliconFlow/BAAI, China AI) + KB endpoints |
| tools | `Data Processing` (search/scrape/parse/translate) + `Tools API` (19 302 apps exposed as API) |
| agents | no "agents" section; closest = `LLM › Claude Code Sandbox` (`(sandbox seconds) * 0.0005 PTC + LLM token fee`) and `MCP Server › Sandbox Tools` (`seconds * 0.001 PTC`) |
| storage | **none** — no per-GB SKU anywhere; file export from sandbox is `0.001 PTC/call`. Uploads in RAG-related are `Refer to LLM` |
| currency toggle | in-iframe `$ ¥ 円 ₽` (precomputed, ×7/×147/×78, no persistence) + outer nav `USD/CNY/JPY/RUB` (account display pref, does not affect iframe) |
| tiers/discounts | context-length tiers as duplicate rows; markup enum `Original Price` / `Original Price＋10%`; no volume tiers, no discounts, some `$0` / `FREE` rows and "Limited time offer, daily quota" notes |
| cache pricing | only 2 rows (claude-opus-4-6 / -thinking, 1M context) carry `Cache write $12.5 / Cache Read $1` as a footnote; 200K rows say `缓存写入：$6.25 /1M tokens， 缓存读取：$0.5 /1M tokens` (untranslated) |
| batch pricing | none |
| footnotes | all in `Description` column (linked to Apifox); global footnote only `(1PTC=1USD)` and `top-up balance … never expires` |

## 3. Entities and fields as observed

### 3.1 `PriceTable` (one `.grid-item`, keyed by `tab` + `data-index="group,provider"`)
- `tab`: enum `robot | tools | api`
- `group`: string (sidebar title, e.g. `LLM`); `group_index`: int
- `provider`: string (sidebar leaf + column-1 header, e.g. `Anthropic Model`); `provider_index`: int
- `columns`: ordered list; observed set `{provider, "302.AI", "OpenAI Price", "Compare", "Description", "Context"}` — zh: `{…, "302.AI", "原价", "对比", "说明", "上下文长度"}`
- `rows[]`: `PriceRow`

### 3.2 `PriceRow`
- `name` (column 1): model id or endpoint label. Formats seen: OpenAI ids (`gpt-5.4-nano-2026-03-17`, `o4-mini`, `gpt-4-gizmo-*`), Anthropic dated ids (`claude-opus-4-5-20251101`) and 302 suffixes (`-thinking`, `-plus`, `-low/medium/high`, `-huoshan`, `-aliyun`, `-baidu`, `-302`), HF-style (`Qwen/Qwen3-30B-A3B-Instruct-2507`, `deepseek-ai/DeepSeek-R1-0528-Qwen3-8B`), endpoint verbs (`Imagine`, `Blend`, `Fetch`, `Cancel`, `Get task results`), bracketed variants (`Generate [flux-pro-1.1-ultra]`, `Image2Video(o3)`, `Generations（Modify Image gpt-image-1.5）`). **Not unique**: the same name repeats across tier rows and across endpoint rows.
- `price_302` (column `302.AI`): free-text string; grammar variants
  - `Input: $X / 1M tokens || Output: $Y / 1M tokens` (742 API rows; also `/ 1M characters` for TTS, `/ 1M Tokens` casing drift, one `/ 1M tonken` typo)
  - `$X / <unit>` (1,151 rows) with unit enum in §7 `unit_enum`
  - `<size> - $X / call` (DALL·E: `256x256`, `HD 1024x1792`…)
  - `FREE`, `$0 / call` (free query/fetch endpoints)
  - prose: `Refer to LLM`, `Refer to related model prices`, `Charged according to the corresponding image model`, `Charge based on the corresponding suppliers`, `Based on the original model + search cost`, `The original model price remains unchanged`, `$0.0005=1 point`, `$0.15=1 point`, `0.01 PTC/call+charge according to model price`, `Sandbox runtime (seconds) * 0.001 PTC`, `$0.625+n/call, n is determined by the number of characters in the script (0.25 PTC for every 400 characters) or the duration of the imported audio (0.25 PTC for every 30 seconds)`
- `price_upstream` (column `OpenAI Price` — label is wrong, it is the vendor list price; zh `原价`): same grammar; sometimes abused as a second description column (Google image rows put `gemini-3-pro-image-preview（4K）` here)
- `compare` (zh `对比`): enum `Original Price` | `Original Price＋10%` | `""`. +10% applies to resold Chinese/third-party models (gemini-2.0-flash, mistral-medium-latest, Baichuan, zzkj, Baichuan-Text-Embedding, claude-sonnet-4-5 >200K rows)
- `description` (zh `说明`): note + link `https://302ai-en.apifox.cn/api-<id>` or `/<id>e0`, some `https://doc.302.ai/<id>e0`. Carries tier condition, cache prices, "Latest …" labels, mode flags (`firstTail-pro-audio on`), and untranslated zh strings on the en page
- `context` (zh `上下文长度`): integer token count as string; observed enum 128000 ×207, 32000 ×86, 1000000 ×82, 256000 ×60, 200000 ×54, 64000, 400000, 131072, 8000, 4000, 258048, 16000, 262144, 992000, 204800, 1048576, 2000000 … and `0` ×2
- `currency` variants per numeric: `$` (en) · `¥` CNY (zh, ×7) · `¥` JPY (jp, ×147, same glyph as CNY!) · `₽` RUB (ru, ×78). Unit of account in prose is **PTC** (`1PTC=1USD`).

### 3.3 `Catalog` JSON (`data-dataList`)
```
[{ tag: "robot"|"tools"|"api",
   list: [{ title: <group>, tags: [<provider>…],
            item: [ [ {list:[<header>, <cell html>…]}  // one per column
                    ]…                                  // one per provider
                  ] }] }]
```
Cells are HTML strings (the same `<span class="pricing-en">` markup), so even the "data" layer is presentation-bound.

## 4. UX patterns worth copying / anti-patterns

**Copy**
- One-screen structure: tab pills (product family) → left accordion (group ▸ provider) → single table; sidebar state and table swap are instant because everything is pre-rendered.
- Typeahead search that spans model ids, endpoint names, sidebar labels *and* description text, with result rows formatted `<hit> - <group>`, and on pick: open the right group, select the provider, scroll the row into view (`I()` sets `scrollTop = row.offsetTop - 20`). Enter = first/exact result.
- Prices always show **both** 302 price and upstream list price side by side with an explicit `Compare` verdict — this is the trust device; copy the three-column idea (`ours | upstream | markup`).
- Per-row doc link on the description cell (every SKU deep-links to its API doc).
- Unit is rendered inline with the number (`$0.05 / call`, `$0.15 / second`) so mixed-unit tables remain readable; Input/Output split with a hairline divider inside one cell.
- Deep link `?tool_index=` for tab; `1PTC=1USD` stated once at the top.

**Anti-patterns**
- 8.8 MB HTML with 430 hidden tables and the catalog duplicated as a 3.2 MB attribute; no API, no pagination, no lazy load. Hydration errors would leave the page stuck on `Bot › OpenAI Model`.
- Column label `OpenAI Price` used for every vendor's list price (zh label `原价` is correct); JPY and CNY share the `¥` glyph; `Context` missing/`0` on some rows.
- Tiers encoded as duplicate rows with the condition buried in `Description` (`<272K context length` / `>272K …`, `0<Token≤32K`); cache prices as free text in a footnote on 2 rows only; untranslated zh strings in the en table; typos (`1M tonken`, `Lastest`, `FIle Tools`, `Al Answer Machine`).
- Free-text price grammar (~30 prose variants) — impossible to compute a bill from the table; `$0.0005=1 point` style indirection for 3D/Topaz.
- Two currency controls that don't talk to each other (nav `USD $ ▾` vs iframe `$ ¥ 円 ₽`); toggle not persisted; FX hard-coded at ×7/×147/×78 in the build.
- Search dropdown returns duplicates (one hit per matching cell), no "no results" state, no keyboard navigation of results; blur-hides after 200 ms (racy).
- Table cells are `div`s, not `<table>` — no semantics for screen readers; header row uses colour only.
- Group accordion allows several groups open at once but only one provider highlighted, so the highlighted item can be off-screen.

## 5. Screenshots

| Path | What |
|---|---|
| `shots/price-default.png` | iframe default: Bot › Chat-bot › OpenAI Model, `$` active |
| `shots/price-api-tab-usd.png` | API › LLM › OpenAI Model (USD) |
| `shots/price-api-tab-cny.png` | same after `¥` toggle (¥1.4 / ¥8.75 = $0.2 / $1.25 × 7) |
| `shots/price-search-claude.png` | search dropdown for `claude` (29 hits, `<hit> - LLM` format) |
| `shots/price-api-image-midjourney.png` | API › Image Generations › Midjourney (3-col shape `Midjourney | 302.AI | Description`) |
| `shots/price-outer-currency-dropdown.png` | outer `302.ai/price` with nav dropdown open (`USD$ / CNY ¥ / JPY ¥ / RUB₽`) + floating rail (`Contact us / Price List / Token Calculator / Client / Help Center`) |

Absolute dir: `/Users/tseka_luk/workspace/code/personal/nebutra/nebutra-sailor/seasnake/.trellis/tasks/09-08-router-302-parity/research/shots/`

## 6. Open questions

1. Does the outer-nav currency (`USD/CNY/JPY/RUB`) change billing currency or only display? Not selected (settings change is out of scope for a read-only pass).
2. The `OpenAI Price` column for `claude-sonnet-4-5-20250929-thinking` >200K row says `Input: $36` while 302 price is `$6.6` — data-entry error or real? (Same row for non-thinking says `$6`.)
3. Cache read/write is listed only for opus-4-6; whether prompt caching is billed for other Anthropic/OpenAI/DeepSeek models is not on this page (check `doc.302.ai` chat-completions docs / dashboard usage records).
4. `Context = 0` on 2 LLM rows and `Context` absent on the feature tables — unknown whether context is enforced by the gateway.
5. `Custom Model` = `$0.05 / day/Key` — what "Key" means (per API key per day?) is not explained on the page.
6. Whether the 302 dashboard exposes the same catalog via an authenticated JSON endpoint (the price site has none; `dashboard` was not probed here).
7. FX rates (×7/×147/×78) are compile-time constants — update cadence unknown.

## 7. Scraped data (JSON)

Method: `curl` of `price_en.html` / `price_zh.html` → `302-price.parse.py` (HTMLParser, column-major grid → rows, four currency spans kept) → normalized with regex on the `302.AI` string. Full dump: `302-price.normalized.json`. Blocks below are excerpts; numeric fields are USD, `unit` is verbatim from the page.


### 7 — `stats`

```json
{
 "tabs": {
  "robot": {
   "groups": 4,
   "tables": 25,
   "rows": 734
  },
  "tools": {
   "groups": 56,
   "tables": 227,
   "rows": 969
  },
  "api": {
   "groups": 9,
   "tables": 178,
   "rows": 1992
  }
 },
 "api_column_shapes": {
  "302.AI | OpenAI Price | Compare | Description | Context": 10,
  "302.AI | Description": 163,
  "302.AI | OpenAI Price | Compare | Description": 5
 },
 "compare_enum": {
  "Original Price": 621,
  "Original Price＋10%": 110,
  "": 19
 },
 "fx_precomputed": {
  "USD": 1,
  "CNY": 7,
  "JPY": 147,
  "RUB": 78
 }
}
```

### 7 — `unit_enum`

```json
{
 "1M tokens": 1503,
 "call": 862,
 "second": 76,
 "image": 53,
 "1M characters": 45,
 "min": 22,
 "1000 characters": 10,
 "MP (megapixel)": 9,
 "1M Tokens": 8,
 "sec": 7,
 "Credits": 7,
 "page": 6,
 "1 point": 5,
 "minute": 5,
 "Point": 4,
 "Call": 4,
 "frame": 4,
 "call)": 4,
 "1S": 3,
 "credits": 3,
 "1M character": 3,
 "call, n is determined by the number of characters in the script (0.25 PTC for every 400 characters) or the duration of the imported audio (0.25 PTC for every 30 seconds)": 2,
 "second + Model Invocation Fee": 2,
 "day/Key": 1,
 "setting the global system prompt/setting the MCP will incur a small time overhead)": 1,
 "Second": 1,
 "100 characters": 1,
 "1k tokens": 1,
 "1M charac-Speech Generationters": 1,
 "voice": 1,
 "One million characters": 1,
 "1 Credits": 1,
 "URL": 1,
 "Page": 1,
 "call+charge according to model price": 1,
 "1M tonken": 1
}
```

### 7 — `taxonomy`

```json
{
 "robot": [
  {
   "group": "Chat-bot",
   "index": "robot-0,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "SiliconFlow",
    "PPIO",
    "SophNet",
    "Expert Model",
    "Open Source Model",
    "Other Models",
    "Feature"
   ]
  },
  {
   "group": "App-bot",
   "index": "robot-1,0",
   "providers": [
    "App Proprietary Model"
   ]
  },
  {
   "group": "Drawing-bot",
   "index": "robot-2,0",
   "providers": [
    "Midjourney",
    "Flux",
    "Stable-Diffusion",
    "Ideogram",
    "Recraft",
    "Luma",
    "Doubao"
   ]
  },
  {
   "group": "Knowledge Base-bot",
   "index": "robot-3,0",
   "providers": [
    "OpenAI Model",
    "China AI Model",
    "Open Source Model",
    "Anthropic Model",
    "Jina",
    "Feature"
   ]
  }
 ],
 "tools": [
  {
   "group": "AI Translate Master",
   "index": "tools-0,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model",
    "DeepL"
   ]
  },
  {
   "group": "Model Arena",
   "index": "tools-1,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "SiliconFlow",
    "Expert Model",
    "Open Source Model",
    "Other Models"
   ]
  },
  {
   "group": "Image Arena",
   "index": "tools-2,0",
   "providers": [
    "OpenAI Model",
    "Feature"
   ]
  },
  {
   "group": "Code Arena",
   "index": "tools-3,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "AI Web Page Generator",
   "index": "tools-4,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model"
   ]
  },
  {
   "group": "AI Video Creation Hub",
   "index": "tools-5,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model",
    "Feature"
   ]
  },
  {
   "group": "AI Old-Photo Restoration",
   "index": "tools-6,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "AI Academic Paper Search",
   "index": "tools-7,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI E-commerce Scene Generation",
   "index": "tools-8,0",
   "providers": [
    "Open Source Model"
   ]
  },
  {
   "group": "AI Prompt Expert",
   "index": "tools-9,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model"
   ]
  },
  {
   "group": "AI Prompt Expert 2.0",
   "index": "tools-10,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "PDF Toolbox",
   "index": "tools-11,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "Lora Style Creative Hub",
   "index": "tools-12,0",
   "providers": [
    "OpenAI Model",
    "Feature"
   ]
  },
  {
   "group": "AI Video Generator",
   "index": "tools-13,0",
   "providers": [
    "302.AI",
    "Luma AI",
    "Kling",
    "CogVideoX",
    "Minimax",
    "Pika",
    "Genmo",
    "Haiper",
    "Hunyuan",
    "PixVerse",
    "Tongyi Wanxiang",
    "Runway",
    "Lightricks",
    "Vidu",
    "Jimeng",
    "Google",
    "Midjourney",
    "Higgsfield",
    "Feature"
   ]
  },
  {
   "group": "AI Search Master 3.0",
   "index": "tools-14,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Patent Search",
   "index": "tools-15,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Image Toolbox",
   "index": "tools-16,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "AI Audio/Video Summarization",
   "index": "tools-17,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Writing Assistant",
   "index": "tools-18,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Paper Writing",
   "index": "tools-19,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI E-Commerce Writing Assistant",
   "index": "tools-20,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Financial Information Assistant",
   "index": "tools-21,0",
   "providers": [
    "OpenAI Model",
    "Google Model",
    "Anthropic Model",
    "China AI Model",
    "Feature"
   ]
  },
  {
   "group": "AI Video Real-Time Translation",
   "index": "tools-22,0",
   "providers": [
    "DeepL",
    "Feature"
   ]
  },
  {
   "group": "AI Video Deep Translation",
   "index": "tools-23,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model",
    "Other Models",
    "Feature"
   ]
  },
  {
   "group": "AI Document Editor",
   "index": "tools-24,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model",
    "Feature"
   ]
  },
  {
   "group": "AI Talking Photo",
   "index": "tools-25,0",
   "providers": [
    "OpenAI Model",
    "Feature"
   ]
  },
  {
   "group": "AI Music Production",
   "index": "tools-26,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model",
    "Feature"
   ]
  },
  {
   "group": "AI Image Translation",
   "index": "tools-27,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "AI Web Page Generator 2.0",
   "index": "tools-28,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Podcast Production",
   "index": "tools-29,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model",
    "Tavily",
    "SearchAPI",
    "Search1API",
    "Bocha AI",
    "Feature"
   ]
  },
  {
   "group": "AI Resume Creation",
   "index": "tools-30,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model"
   ]
  },
  {
   "group": "AI Webpage Summary",
   "index": "tools-31,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI Answer Machine",
   "index": "tools-32,0",
   "providers": [
    "OpenAI Model",
    "Google Model",
    "Anthropic Model",
    "China AI Model"
   ]
  },
  {
   "group": "AI Vector Graphics Generation",
   "index": "tools-33,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "AI Voice Generator",
   "index": "tools-34,0",
   "providers": [
    "OpenAI Model",
    "Azure",
    "Doubao",
    "Fish Audio"
   ]
  },
  {
   "group": "AI Voice Call",
   "index": "tools-35,0",
   "providers": [
    "OpenAI Model"
   ]
  },
  {
   "group": "AI Whiteboard",
   "index": "tools-36,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI PPT Generator",
   "index": "tools-37,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "AI Excel",
   "index": "tools-38,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "AI 3D Modeling",
   "index": "tools-39,0",
   "providers": [
    "Open Source Model",
    "Feature"
   ]
  },
  {
   "group": "AI Avatar Maker",
   "index": "tools-40,0",
   "providers": [
    "OpenAI Model",
    "Feature"
   ]
  },
  {
   "group": "AI Virtual Try On",
   "index": "tools-41,0",
   "providers": [
    "China AI Model",
    "Feature"
   ]
  },
  {
   "group": "AI Red Pocket Cover Generation",
   "index": "tools-42,0",
   "providers": [
    "OpenAI Model",
    "Feature"
   ]
  },
  {
   "group": "ID Photo Generation",
   "index": "tools-43,0",
   "providers": [
    "Feature"
   ]
  },
  {
   "group": "Web Data Extraction Tool",
   "index": "tools-44,0",
   "providers": [
    "OpenAI Model"
   ]
  },
  {
   "group": "AI Facts Proof",
   "index": "tools-45,0",
   "providers": [
    "OpenAI Model",
    "China AI Model",
    "Open Source Model",
    "SiliconFlow",
    "Anthropic Model",
    "Other models",
    "Feature"
   ]
  },
  {
   "group": "Video Arena",
   "index": "tools-46,0",
   "providers": [
    "Luma AI",
    "Stable Diffusion",
    "Runway",
    "Kling",
    "Zhipu",
    "Minimax",
    "Pika",
    "Genmo",
    "Pixverse",
    "Haiper",
    "Lightricks",
    "Wanx",
    "Seaweed",
    "SiliconFlow",
    "Google",
    "Skyreels"
   ]
  },
  {
   "group": "ComfyUI Toolbox",
   "index": "tools-47,0",
   "providers": [
    "OpenAI Models",
    "302.AI-ComfyUI",
    "Kling"
   ]
  },
  {
   "group": "Deploy web pages by one-click",
   "index": "tools-48,0",
   "providers": [
    "OpenAI Model",
    "功能"
   ]
  },
  {
   "group": "AI drawing prompt word expert",
   "index": "tools-49,0",
   "providers": [
    "功能"
   ]
  },
  {
   "group": "AI Card Generation",
   "index": "tools-50,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Feature"
   ]
  },
  {
   "group": "AI Image Creative Station",
   "index": "tools-51,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Flux Model",
    "Google"
   ]
  },
  {
   "group": "AI Model Judge",
   "index": "tools-52,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Expert Model",
    "Open Source Model",
    "Other Models",
    "SiliconFlow"
   ]
  },
  {
   "group": "AI Novel Writing",
   "index": "tools-53,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "Open Source Model"
   ]
  },
  {
   "group": "Voice Arena",
   "index": "tools-54,0",
   "providers": [
    "OpenAI Model",
    "Azure",
    "Doubao",
    "Fish Audio",
    "Minimax"
   ]
  },
  {
   "group": "AI Avatar Generator",
   "index": "tools-55,0",
   "providers": [
    "Chanjing",
    "Hedra",
    "Jimeng",
    "Topview",
    "Fish Audio"
   ]
  }
 ],
 "api": [
  {
   "group": "LLM",
   "index": "api-0,0",
   "providers": [
    "OpenAI Model",
    "Anthropic Model",
    "Google Model",
    "China AI Model",
    "SiliconFlow",
    "PPIO",
    "SophNet",
    "Expert Model",
    "Open Source Model",
    "Other Models",
    "Custom Model",
    "Reasoning mode",
    "Link Parsing",
    "Search online",
    "Image analysis",
    "Long-Term Memory(Beta)",
    "Depth-First Search",
    "tool invocation",
    "Asynchronous call",
    "Claude Format",
    "Claude Code Sandbox"
   ]
  },
  {
   "group": "Image Generations",
   "index": "api-1,0",
   "providers": [
    "General Interface",
    "GPT-Image",
    "DALL·E",
    "Stability.ai",
    "Midjourney",
    "Midjourney-Relax",
    "302.AI",
    "Glif",
    "Flux",
    "Ideogram",
    "Recraft",
    "Luma",
    "Jimeng",
    "Google",
    "Minimax",
    "ZHIPU",
    "Baidu",
    "Hidream",
    "Bagel",
    "SiliconFlow",
    "Higgsfield",
    "Kling",
    "Tongyi Wanxiang",
    "Vidu",
    "Grok"
   ]
  },
  {
   "group": "Image Processing",
   "index": "api-2,0",
   "providers": [
    "302.AI",
    "302.AI-ComfyUI",
    "Vectorizer",
    "Stability.ai",
    "Clipdrop",
    "Glif",
    "Recraft",
    "BRIA",
    "Flux",
    "Hyper3d",
    "Tripo3D",
    "FASHN",
    "Ideogram",
    "Jimeng",
    "Kling",
    "Stepfun",
    "Bagel",
    "Gongji Computing",
    "Hunyuan3D",
    "Hidream",
    "Tongyi Wanxiang",
    "Topazlabs",
    "Topview",
    "WaveSpeed",
    "Photoroom"
   ]
  },
  {
   "group": "Video Generation",
   "index": "api-3,0",
   "providers": [
    "Unified Interface",
    "302.AI",
    "302.AI-ComfyUI",
    "Luma AI",
    "Runway",
    "Kling",
    "CogVideoX",
    "Minimax",
    "Pika",
    "PixVerse",
    "Gaga",
    "Genmo",
    "Hedra",
    "Haiper",
    "Sync.",
    "Lightricks",
    "Hunyuan",
    "Vidu",
    "Tongyi Wanxiang",
    "SiliconFlow",
    "Jimeng",
    "CogVideoX（ZHIPU AI）",
    "Google",
    "Kunlun Tech",
    "Higgsfield",
    "Chanjing",
    "Midjourney",
    "Topview",
    "OpenAI",
    "WaveSpeed",
    "Gongji Computing"
   ]
  },
  {
   "group": "Audio-Video Processing",
   "index": "api-4,0",
   "providers": [
    "General Interface",
    "OpenAI Model",
    "Azure",
    "Suno",
    "302.AI",
    "Doubao",
    "Fish Audio",
    "Minimax",
    "Dubbingx",
    "Elevenlabs",
    "Mureka",
    "SiliconFlow",
    "Google",
    "Chanjing",
    "Tongyi Wanxiang",
    "Topazlabs",
    "Stability.ai",
    "Zhipu"
   ]
  },
  {
   "group": "Data Processing",
   "index": "api-5,0",
   "providers": [
    "General Interface",
    "Tavily",
    "SerpApi",
    "Search1API",
    "Doc2x",
    "Glif",
    "Jina",
    "Exa",
    "DeepL",
    "Bocha AI",
    "302.AI",
    "RSSHub",
    "Firefly card",
    "Youdao",
    "Mistral",
    "Firecrawl",
    "MetaSota Search",
    "MinerU",
    "Zhiyu Agent",
    "Unifuncs",
    "SophNet",
    "Doubao",
    "Perplexity",
    "AMiner"
   ]
  },
  {
   "group": "RAG-related",
   "index": "api-6,0",
   "providers": [
    "OpenAI Model",
    "China AI Model",
    "Jina",
    "302.AI",
    "SiliconFlow",
    "Google"
   ]
  },
  {
   "group": "Tools API",
   "index": "api-7,0",
   "providers": [
    "AI Video Creation Hub",
    "AI Paper Writing",
    "AI Podcast Production",
    "AI Writing Assistant",
    "AI Video Deep Translation",
    "AI Document Editor",
    "Web Data Extraction Tool",
    "Al Answer Machine",
    "AI Prompt Expert",
    "AI Academic Paper Search",
    "AI Search Master 3.0",
    "AI Vector Graphics Generation",
    "AI PPT Generator",
    "AI 3D Modeling",
    "Deploy web pages by one-click",
    "AI Avatar Maker",
    "AI Card Generation",
    "AI Image Creative Station",
    "AI Digital Human"
   ]
  },
  {
   "group": "MCP Server",
   "index": "api-8,0",
   "providers": [
    "Audio Video Tools",
    "Browser Use Tools",
    "FIle Tools",
    "Image Tools",
    "Math Tools",
    "PPT Tools",
    "Sandbox Tools",
    "Web Deploy Tools",
    "Web Search Tools"
   ]
  }
 ]
}
```

### 7 — `llm_openai`

```json
[
 {
  "model": "gpt-5.4-nano-2026-03-17",
  "input_usd": 0.2,
  "output_usd": 1.25,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "侧重于处理高频小任务的低成本、低延迟模型",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4-nano",
  "input_usd": 0.2,
  "output_usd": 1.25,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "侧重于处理高频小任务的低成本、低延迟模型",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4",
  "input_usd": 2.5,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "<272K context length",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4",
  "input_usd": 5.0,
  "output_usd": 22.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": ">272K context length",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4-pro",
  "input_usd": 30.0,
  "output_usd": 180.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "<272K context length",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4-pro",
  "input_usd": 60.0,
  "output_usd": 270.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": ">272K context length",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4-mini",
  "input_usd": 0.75,
  "output_usd": 4.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "适用于对成本和速度敏感的高频简单场景的GPT-5.4轻量化版本",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.3-codex",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "GPT-5.3的升级版，针对Codex或类似环境中的代理编码任务进行了优化",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.3-chat-latest",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "GPT-5.3高效率、高性能的日常对话模型",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.4-mini-2026-03-17",
  "input_usd": 0.75,
  "output_usd": 4.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "适用于对成本和速度敏感的高频简单场景的GPT-5.4轻量化版本",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.2-2025-12-11",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.2",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.2-codex",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model gpt-5.2-codex",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.2-pro",
  "input_usd": 21.0,
  "output_usd": 168.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.2",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.2",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.2",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.2-chat-latest",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "OpenAI's latest model GPT-5.2",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.2-chat-latest",
  "input_usd": 1.75,
  "output_usd": 14.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "OpenAI's latest model GPT-5.2",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1-plus",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "ChatGPT Plus",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1-thinking-plus",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "ChatGPT Plus",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.1",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1-2025-11-13",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.1",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1-chat-latest",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "OpenAI's latest model GPT-5.1",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1-codex",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.1-codex",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5.1-codex-mini",
  "input_usd": 0.25,
  "output_usd": 2.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5.1-Codex",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-pro",
  "input_usd": 15.0,
  "output_usd": 120.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5-Pro",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-pro-2025-10-06",
  "input_usd": 15.0,
  "output_usd": 120.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5-Pro",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-2025-08-07",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5-2025-08-07",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-mini",
  "input_usd": 0.25,
  "output_usd": 2.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5 MINI",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-mini-2025-08-07",
  "input_usd": 0.25,
  "output_usd": 2.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5 MINI-2025-08-07",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-nano",
  "input_usd": 0.05,
  "output_usd": 0.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's latest model GPT-5 Nano",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-nano-2025-08-07",
  "input_usd": 0.05,
  "output_usd": 0.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's model GPT-5 Nano-2025-08-07",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-chat-latest",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "OpenAI's model GPT-5 Chat",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-codex",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "GPT-5 Coding Model",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-codex-low",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "GPT-5 Coding Model",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-codex-medium",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "GPT-5 Coding Model",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-5-codex-high",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 400000,
  "note": "GPT-5 Coding Model",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-4o-search-preview",
  "input_usd": 2.5,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "4o Search Version",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-4o-mini-search-preview",
  "input_usd": 0.15,
  "output_usd": 0.6,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "4o mini Search Version",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "gpt-3.5-turbo",
  "input_usd": 1.5,
  "output_usd": 2.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 4000,
  "note": "GPT3.5",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-3.5-turbo-1106",
  "input_usd": 1.0,
  "output_usd": 2.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 4000,
  "note": "GPT3.5",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-3.5-turbo-16k",
  "input_usd": 3.0,
  "output_usd": 4.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 16000,
  "note": "16k context 3.5",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4-0125-preview",
  "input_usd": 10.0,
  "output_usd": 30.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Old GPT4.0",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4",
  "input_usd": 30.0,
  "output_usd": 60.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 8000,
  "note": "Orignal GPT4.0",
  "doc": "https://302ai-en.apifox.cn/api-207705104"
 },
 {
  "model": "gpt-4-gizmo-*",
  "input_usd": 30.0,
  "output_usd": 60.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "GPT4.0",
  "doc": "https://302ai-en.apifox.cn/api-216495992"
 },
 {
  "model": "gpt-4-plus",
  "input_usd": 30.0,
  "output_usd": 60.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "ChatGPT Plus",
  "doc": "https://302ai-en.apifox.cn/api-207705104"
 },
 {
  "model": "gpt-4-0613",
  "input_usd": 30.0,
  "output_usd": 60.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 16000,
  "note": "GPT4.0",
  "doc": "https://302ai-en.apifox.cn/api-207705103"
 },
 {
  "model": "gpt-4-1106-preview",
  "input_usd": 10.0,
  "output_usd": 30.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Old GPT4.0",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4-32k",
  "input_usd": 60.0,
  "output_usd": 120.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 32000,
  "note": "GPT4.0-32k",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4-32k-0613",
  "input_usd": 60.0,
  "output_usd": 120.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 32000,
  "note": "32k context 4.0",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4.1",
  "input_usd": 2.0,
  "output_usd": 8.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Latest GPT 4.1",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "gpt-4.1-2025-04-14",
  "input_usd": 2.0,
  "output_usd": 8.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Latest GPT 4.1",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "gpt-4.1-mini",
  "input_usd": 0.4,
  "output_usd": 1.6,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Latest GPT 4.1 mini",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "gpt-4.1-mini-2025-04-14",
  "input_usd": 0.4,
  "output_usd": 1.6,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Latest GPT 4.1 mini",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "gpt-4.1-nano",
  "input_usd": 0.1,
  "output_usd": 0.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Latest GPT 4.1 nano",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "o4-mini-2025-04-16",
  "input_usd": 1.1,
  "output_usd": 4.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest o4-mini",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "o4-mini",
  "input_usd": 1.1,
  "output_usd": 4.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest o4-mini",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "o3",
  "input_usd": 2.0,
  "output_usd": 8.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest o3",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "o3-mini",
  "input_usd": 1.1,
  "output_usd": 4.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest o3-mini",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "o3-mini-2025-01-31",
  "input_usd": 1.1,
  "output_usd": 4.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest o3-mini",
  "doc": "https://302ai-en.apifox.cn/api-258254135"
 },
 {
  "model": "o1-plus",
  "price_usd": 0.1,
  "unit": "per call",
  "compare": "Original Price",
  "context": 128000,
  "note": "Full Version O1",
  "doc": "https://302ai-en.apifox.cn/api-216495992"
 },
 {
  "model": "o1",
  "input_usd": 15.0,
  "output_usd": 60.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Full Version O1",
  "doc": "https://302ai-en.apifox.cn/api-216495992"
 },
 {
  "model": "o1-preview",
  "input_usd": 15.0,
  "output_usd": 60.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest Strawberry Model",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "o1-mini",
  "input_usd": 3.0,
  "output_usd": 12.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest Strawberry Mini Model",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4o-audio-preview",
  "input_usd": 2.5,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Multimodal Speech Model",
  "doc": "https://302ai-en.apifox.cn/api-225241341"
 },
 {
  "model": "gpt-4o-plus",
  "input_usd": 5.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "ChatGPT Plus 4o",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4o",
  "input_usd": 2.5,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Multi-Model GPT4.0",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4o-mini-2024-07-18",
  "input_usd": 0.15,
  "output_usd": 0.6,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Cheap GPT-4o",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4o-2024-05-13",
  "input_usd": 5.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Old GPT4o"
 },
 {
  "model": "gpt-4o-2024-08-06",
  "input_usd": 2.5,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Old GPT4o",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4o-2024-11-20",
  "input_usd": 2.5,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest GPT4o",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "chatgpt-4o-latest",
  "input_usd": 5.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest OpenAI Model",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-4o-image-generation",
  "price_usd": 0.03,
  "unit": "per call",
  "compare": "Original Price",
  "context": 128000,
  "note": "GPT-4o-Image-Generation",
  "doc": "https://302ai-en.apifox.cn/api-282181336"
 },
 {
  "model": "gpt-4-turbo",
  "input_usd": 10.0,
  "output_usd": 30.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Best GPT4.0",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "gpt-3.5-turbo-instruct",
  "input_usd": 1.5,
  "output_usd": 2.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 4000,
  "note": "GPT3.5",
  "doc": "https://302ai-en.apifox.cn/api-216495992"
 },
 {
  "model": "gpt-3.5-turbo-0125",
  "input_usd": 0.5,
  "output_usd": 1.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 16000,
  "note": "Cheapest 3.5",
  "doc": "https://302ai-en.apifox.cn/doc-5030894"
 },
 {
  "model": "o3-pro",
  "input_usd": 20.0,
  "output_usd": 80.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "supports only the Response interface.",
  "doc": "https://302ai-en.apifox.cn/api-308965988"
 },
 {
  "model": "zai-org/glm-4.5",
  "input_usd": 0.572,
  "output_usd": 2.288,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "supports only the Response interface.",
  "doc": "https://302ai-en.apifox.cn/api-308965988"
 },
 {
  "model": "codex-mini-latest",
  "input_usd": 1.5,
  "output_usd": 6.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Supports only the Response interface.",
  "doc": "https://302ai-en.apifox.cn/api-308965988"
 },
 {
  "model": "o3-deep-research",
  "input_usd": 10.0,
  "output_usd": 40.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "o3-deep-research model",
  "doc": "https://302ai-en.apifox.cn/api-315837721"
 },
 {
  "model": "o3-deep-research-2025-06-26",
  "input_usd": 10.0,
  "output_usd": 40.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "o3-deep-research model",
  "doc": "https://302ai-en.apifox.cn/api-315837721"
 },
 {
  "model": "o4-mini-deep-research",
  "input_usd": 2.0,
  "output_usd": 8.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "o4-mini-deep-research model",
  "doc": "https://302ai-en.apifox.cn/api-315837721"
 },
 {
  "model": "o4-mini-deep-research-2025-06-26",
  "input_usd": 2.0,
  "output_usd": 8.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "o4-mini-deep-research-2025-06-26 model",
  "doc": "https://302ai-en.apifox.cn/api-315837721"
 }
]
```

### 7 — `llm_anthropic`

```json
[
 {
  "model": "claude-opus-4-6-thinking",
  "input_usd": 10.0,
  "output_usd": 37.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Cache write: $12.5 / 1M tokens, Cache Read: $1 /1M tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-opus-4-6-thinking",
  "input_usd": 5.0,
  "output_usd": 25.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "缓存写入：$6.25 /1M tokens， 缓存读取：$0.5 /1M tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-opus-4-6",
  "input_usd": 10.0,
  "output_usd": 37.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Cache write: $12.5 / 1M tokens, Cache Read: $1 /1M tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-opus-4-6",
  "input_usd": 5.0,
  "output_usd": 25.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest claude-opus-4-6",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-opus-4-5-20251101",
  "input_usd": 5.0,
  "output_usd": 25.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest claude-opus-4-5",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-haiku-4-5-20251001",
  "input_usd": 1.0,
  "output_usd": 5.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest claude-haiku-4-5",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-sonnet-4-5-20250929",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "≤ 200K input tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-sonnet-4-5-20250929",
  "input_usd": 6.6,
  "output_usd": 24.75,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $6 / 1M tokens || Output: $22.5 / 1M tokens",
  "context": 1000000,
  "note": "> 200K input tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-sonnet-4-5-20250929-thinking",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "≤ 200K input tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-sonnet-4-5-20250929-thinking",
  "input_usd": 6.6,
  "output_usd": 24.75,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $36 / 1M tokens || Output: $22.5 / 1M tokens",
  "context": 200000,
  "note": "> 200K input tokens",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-opus-4-1-20250805",
  "input_usd": 15.0,
  "output_usd": 75.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest Claude4-Opus",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-opus-4-20250514",
  "input_usd": 15.0,
  "output_usd": 75.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest Claude4",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-sonnet-4-20250514",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Lastest Claude4",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-7-sonnet-latest",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Lastest Claude3.7",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-7-sonnet-20250219",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Lastest Claude3.7",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-5-sonnet-latest",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Lastest Claude3.5"
 },
 {
  "model": "claude-3-5-sonnet-20241022",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest Claude3.5",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-5-sonnet-20240620",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Old Claude3.5",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-opus-20240229",
  "input_usd": 15.0,
  "output_usd": 75.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Best Claude 3",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-5-haiku-20241022",
  "input_usd": 0.8,
  "output_usd": 4.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Latest Claude3.5",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 },
 {
  "model": "claude-3-haiku-20240307",
  "input_usd": 0.25,
  "output_usd": 1.25,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Cheapest Claude 3",
  "doc": "https://302ai-en.apifox.cn/api-207705109"
 }
]
```

### 7 — `llm_google`

```json
[
 {
  "model": "gemini-3.1-flash-lite-preview",
  "input_usd": 0.25,
  "output_usd": 1.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "gemini最新的轻量版模型，性价比极高",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-3-flash-preview",
  "input_usd": 0.5,
  "output_usd": 3.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "gemini-3-flash",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-3-pro-preview",
  "input_usd": 2.0,
  "output_usd": 12.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Input/Output < = 200K tokens fee",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-3-pro-preview",
  "input_usd": 4.0,
  "output_usd": 18.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Input/output > 200K tokens fee",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-flash-preview-09-2025",
  "input_usd": 0.3,
  "output_usd": 2.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/274416667e0"
 },
 {
  "model": "gemini-2.5-flash-lite-preview-09-2025",
  "input_usd": 0.1,
  "output_usd": 0.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/274416667e0"
 },
 {
  "model": "gemini-2.5-flash-image",
  "input_usd": 0.3,
  "output_usd": 30.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 32768,
  "note": "Google's latest image generation model",
  "doc": "https://302ai-en.apifox.cn/274416667e0"
 },
 {
  "model": "gemini-2.0-flash",
  "input_usd": 0.11,
  "output_usd": 0.44,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $0.1 / 1M tokens || Output: $0.4 / 1M tokens",
  "context": 1000000,
  "note": "Gemini 2.0 Flash",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-pro-exp-03-25",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Gemini 2.5 Pro",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-flash-preview-04-17",
  "input_usd": 0.15,
  "output_usd": 3.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Gemini 2.5 Flash",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-pro-search",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "gemini-2.5-pro-search",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-flash-search",
  "input_usd": 0.3,
  "output_usd": 2.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "gemini-2.5-pro-search",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-exp-1121",
  "input_usd": 5.0,
  "output_usd": 20.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model-20241121",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.0-flash-exp",
  "input_usd": 0.2,
  "output_usd": 0.6,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Gemini 2.0 Flash",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-1.5-pro",
  "input_usd": 7.0,
  "output_usd": 21.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 2000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-1.5-pro-0801",
  "input_usd": 3.5,
  "output_usd": 10.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-1.5-pro-latest",
  "input_usd": 7.0,
  "output_usd": 21.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Latest Google Model",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-1.5-pro-001",
  "input_usd": 2.5,
  "output_usd": 7.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 2000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.0-flash-exp-image-generation",
  "input_usd": 2.0,
  "output_usd": 5.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-274416667"
 },
 {
  "model": "gemini-2.0-flash-preview-image-generation",
  "input_usd": 2.0,
  "output_usd": 5.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-274416667"
 },
 {
  "model": "gemini-2.5-pro",
  "input_usd": 1.25,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Input/Output ≤ 200K tokens cost",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-pro",
  "input_usd": 2.5,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Input/Output > 200K tokens cost",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-flash",
  "input_usd": 0.3,
  "output_usd": 2.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 },
 {
  "model": "gemini-2.5-flash-lite",
  "input_usd": 0.1,
  "output_usd": 0.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "Google Model",
  "doc": "https://302ai-en.apifox.cn/api-207705111"
 }
]
```

### 7 — `llm_china_sample`

```json
[
 {
  "model": "DeepSeek-R1-0528",
  "input_usd": 0.6,
  "output_usd": 2.3,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "DeepSeek R1 0528",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "deepseek-r1-aliyun",
  "input_usd": 0.6,
  "output_usd": 2.3,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 64000,
  "note": "DeepSeek R1",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "deepseek-v3-aliyun",
  "input_usd": 0.3,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 64000,
  "note": "DeepSeek V3",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "deepseek-r1-huoshan-250528",
  "input_usd": 0.6,
  "output_usd": 2.3,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "DeepSeek R1-0528",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "deepseek-r1-huoshan",
  "input_usd": 0.6,
  "output_usd": 2.3,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 64000,
  "note": "DeepSeek R1",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "deepseek-v3-huoshan",
  "input_usd": 0.3,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 64000,
  "note": "DeepSeek V3",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "deepseek-r1-baidu",
  "input_usd": 0.6,
  "output_usd": 2.3,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 64000,
  "note": "DeepSeek R1",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "MiniMax-M2.7",
  "input_usd": 0.3,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 204800,
  "note": "MiniMax 推出的全新文本生成模型",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "deepseek-v3-baidu",
  "input_usd": 0.3,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 64000,
  "note": "DeepSeek V3",
  "doc": "https://302ai-en.apifox.cn/api-207705121"
 },
 {
  "model": "M2-her",
  "input_usd": 0.3,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "M2-Her",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "MiniMax-M2.7-highspeed",
  "input_usd": 0.6,
  "output_usd": 4.8,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 204800,
  "note": "Mininax-M2.7的极速版",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "MiniMax-M2.1-lightning",
  "input_usd": 0.3,
  "output_usd": 2.4,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "MiniMax-M2.1-lightning",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "qwen3.6-plus",
  "input_usd": 0.3,
  "output_usd": 1.8,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "Input <= 256k",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3.6-plus",
  "input_usd": 1.2,
  "output_usd": 7.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "Input 256K-1M",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3.5-122b-a10b",
  "input_usd": 0.12,
  "output_usd": 0.92,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "Input <= 128K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "MiniMax-M2.1",
  "input_usd": 0.3,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 1000000,
  "note": "MiniMax-M2.1",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "MiniMax-M2",
  "input_usd": 0.33,
  "output_usd": 1.32,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $0.3 / 1M tokens || Output: $1.2 / 1M tokens",
  "context": 1000000,
  "note": "Minimax Model",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "qwen3.5-122b-a10b",
  "input_usd": 0.29,
  "output_usd": 2.29,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "128K-256K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3.5-27b",
  "input_usd": 0.09,
  "output_usd": 0.69,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "Input <= 128K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3.5-27b",
  "input_usd": 0.26,
  "output_usd": 2.06,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "128K-256K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3.5-35b-a3b",
  "input_usd": 0.06,
  "output_usd": 0.46,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "Input <= 128K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3.5-35b-a3b",
  "input_usd": 0.23,
  "output_usd": 1.83,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 992000,
  "note": "128K-256K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "MiniMax-Text-01",
  "input_usd": 0.154,
  "output_usd": 1.232,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $0.14 / 1M tokens || Output: $1.12 / 1M tokens",
  "context": 1000000,
  "note": "Minimax Model",
  "doc": "https://302ai-en.apifox.cn/api-240583947"
 },
 {
  "model": "qwen3-max-2026-01-23",
  "input_usd": 0.36,
  "output_usd": 1.43,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 252000,
  "note": "Input 0~32K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 },
 {
  "model": "qwen3-max-2026-01-23",
  "input_usd": 0.572,
  "output_usd": 2.29,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 252000,
  "note": "Input 32K~128K",
  "doc": "https://302ai-en.apifox.cn/api-242312995"
 }
]
```

### 7 — `llm_other`

```json
[
 {
  "model": "command-r-plus",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Cohere Model",
  "doc": "https://302ai-en.apifox.cn/api-217022578"
 },
 {
  "model": "command-r",
  "input_usd": 1.0,
  "output_usd": 3.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 4000,
  "note": "Cohere Model",
  "doc": "https://302ai-en.apifox.cn/api-207705102"
 },
 {
  "model": "grok-4.20-multi-agent-beta-0309",
  "input_usd": 2.0,
  "output_usd": 6.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "Grok最新模型",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-4-1-fast-non-reasoning",
  "input_usd": 0.2,
  "output_usd": 0.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "grok4-1-fast",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-4-1-fast-reasoning",
  "input_usd": 0.2,
  "output_usd": 0.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 200000,
  "note": "grok4-1-fast",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-4-fast-non-reasoning",
  "input_usd": 0.2,
  "output_usd": 0.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "grok4-fast",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-4-fast-reasoning",
  "input_usd": 0.2,
  "output_usd": 0.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "grok4-fast",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "mistral-medium-latest",
  "input_usd": 0.44,
  "output_usd": 6.6,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $0.4 / 1M tokens || Output: $6 / 1M tokens",
  "context": 128000,
  "note": "Mistral Lastest Model",
  "doc": "https://302ai-en.apifox.cn/api-235469484"
 },
 {
  "model": "grok-4",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Context window <=128k price",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-4",
  "input_usd": 6.0,
  "output_usd": 30.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "Context window >128k price",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3-reasoner",
  "input_usd": 2.0,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3-deepsearch",
  "input_usd": 2.0,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3-beta",
  "input_usd": 3.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3-fast-beta",
  "input_usd": 5.0,
  "output_usd": 25.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3-mini-beta",
  "input_usd": 0.3,
  "output_usd": 0.5,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-3-mini-fast-beta",
  "input_usd": 0.6,
  "output_usd": 4.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-263685475"
 },
 {
  "model": "grok-2-vision-1212",
  "input_usd": 2.0,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 8192,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-246122225"
 },
 {
  "model": "grok-2-1212",
  "input_usd": 2.0,
  "output_usd": 10.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-224540600"
 },
 {
  "model": "grok-vision-beta",
  "input_usd": 5.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 8000,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-224540600"
 },
 {
  "model": "grok-beta",
  "input_usd": 5.0,
  "output_usd": 15.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 131072,
  "note": "xAI Model",
  "doc": "https://302ai-en.apifox.cn/api-224540600"
 },
 {
  "model": "nova-micro",
  "input_usd": 0.035,
  "output_usd": 0.14,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 300000,
  "note": "Amazon Nova Micro",
  "doc": "https://302ai-en.apifox.cn/api-242303358"
 },
 {
  "model": "nova-lite",
  "input_usd": 0.06,
  "output_usd": 0.24,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 300000,
  "note": "Amazon Nova Lite",
  "doc": "https://302ai-en.apifox.cn/api-242303358"
 },
 {
  "model": "nova-pro",
  "input_usd": 0.8,
  "output_usd": 3.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 300000,
  "note": "Amazon Nova Pro",
  "doc": "https://302ai-en.apifox.cn/api-242303358"
 },
 {
  "model": "v0-1.5-md",
  "input_usd": 3.3,
  "output_usd": 16.5,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $3 / 1M tokens || Output: $15 / 1M tokens",
  "context": 128000,
  "note": "v0-1.5-md",
  "doc": "https://302ai-en.apifox.cn/api-312727858"
 },
 {
  "model": "v0-1.5-lg",
  "input_usd": 16.5,
  "output_usd": 82.5,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $15 / 1M tokens || Output: $75 / 1M tokens",
  "context": 512000,
  "note": "v0-1.5-lg",
  "doc": "https://302ai-en.apifox.cn/api-312727858"
 },
 {
  "model": "v0-1.0-md",
  "input_usd": 3.3,
  "output_usd": 16.5,
  "unit": "per 1M tokens",
  "compare": "Original Price＋10%",
  "original_price": "Input: $3 / 1M tokens || Output: $15 / 1M tokens",
  "context": 128000,
  "note": "v0-1.0-md",
  "doc": "https://302ai-en.apifox.cn/api-312727858"
 },
 {
  "model": "unifuncs-deepresearch",
  "input_usd": 1.2,
  "output_usd": 1.2,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 128000,
  "note": "UniFuncs Deep Research",
  "doc": "https://302ai-en.apifox.cn/329405860e0"
 },
 {
  "model": "Async Get Result",
  "price_usd": 0.0,
  "unit": "per 1M tokens",
  "compare": "Original Price",
  "context": 0,
  "note": "Async Get Result",
  "doc": "https://302ai-jp.apifox.cn/329409807e0"
 }
]
```

### 7 — `llm_features`

```json
{
 "Custom Model": [
  {
   "model": "Custom Model",
   "price_usd": 0.05,
   "unit": "per day/Key",
   "note": "Daily charge, other features priced separately",
   "doc": "https://302ai-en.apifox.cn/api-207705102"
  }
 ],
 "Reasoning mode": [
  {
   "model": "Chat（Reasoning mode）",
   "raw": "Based on the original model + the cost of DeepSeek-R1-302 model",
   "note": "Reasoning mode",
   "doc": "https://302ai-en.apifox.cn/api-266354843"
  }
 ],
 "Link Parsing": [
  {
   "model": "Chat（Link Parsing）",
   "raw": "On the basis of the original model + the cost of the file parsing interface",
   "note": "Link Parsing",
   "doc": "https://302ai-en.apifox.cn/api-272503066"
  }
 ],
 "Search online": [
  {
   "model": "Chat（Search online）",
   "raw": "Based on the original model + search cost",
   "note": "Search online",
   "doc": "https://302ai-en.apifox.cn/api-273308610"
  }
 ],
 "Image analysis": [
  {
   "model": "Chat（Image analysis）",
   "raw": "On the basis of the original model + the cost of the multimodal model",
   "note": "Image analysis",
   "doc": "https://302ai-en.apifox.cn/api-260156326"
  }
 ],
 "Depth-First Search": [
  {
   "model": "Chat（Depth-First Search）",
   "raw": "Based on the original model + search cost",
   "note": "Depth-First Search",
   "doc": "https://302ai-en.apifox.cn/api-270155422"
  }
 ],
 "tool invocation": [
  {
   "model": "Chat（tool invocation）",
   "raw": "The original model price remains unchanged",
   "note": "Tool invocation",
   "doc": "https://302ai-en.apifox.cn/api-278668549"
  }
 ],
 "Asynchronous call": [
  {
   "model": "Asynchronous request to chat",
   "raw": "The original model price remains unchanged",
   "note": "Asynchronous request to chat",
   "doc": "https://302ai-en.apifox.cn/api-323087731"
  },
  {
   "model": "Asynchronously retrieve/get results",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Asynchronously retrieve/get results",
   "doc": "https://302ai-en.apifox.cn/api-323084919"
  }
 ],
 "Claude Format": [
  {
   "model": "Messages(Claude Format)",
   "raw": "The original model price remains unchanged",
   "note": "Supported calling all models using the Claude format.",
   "doc": "https://302ai-en.apifox.cn/326799367e0"
  }
 ],
 "Claude Code Sandbox": [
  {
   "model": "Creation Costs",
   "raw": "Actual time spent using the sandbox * 0.0005 PTC (Creating the sandbox/setting the global system prompt/setting the MCP will incur a small time overhead)",
   "note": "Creating a Claude-Code Sandbox",
   "doc": "https://doc.302.ai/365133931e0"
  },
  {
   "model": "Usage Costs",
   "raw": "The fee is calculated as follows: (Actual sandbox usage time in seconds) * 0.0005 PTC + LLM model token fee.",
   "note": "Calling the Claude-Code Sandbox",
   "doc": "https://doc.302.ai/368558119e0"
  }
 ]
}
```

### 7 — `rag`

```json
{
 "OpenAI Model": [
  {
   "model": "text-embedding-ada-002",
   "input_usd": 0.1,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705279"
  },
  {
   "model": "text-embedding-3-small",
   "input_usd": 0.02,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705279"
  },
  {
   "model": "text-embedding-3-large",
   "input_usd": 0.13,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705279"
  }
 ],
 "Jina": [
  {
   "model": "jina-embeddings-v4",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-clip-v1",
   "input_usd": 0.04,
   "output_usd": 0.04,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-clip-v2",
   "input_usd": 0.04,
   "output_usd": 0.04,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-embeddings-v2-base-en",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-embeddings-v2-base-de",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-embeddings-v2-base-zh",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-embeddings-v2-base-es",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-embeddings-v2-base-code",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Jina - Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705286"
  },
  {
   "model": "jina-reranker-v3",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Rerank",
   "doc": "https://302ai-en.apifox.cn/api-207705288"
  },
  {
   "model": "jina-reranker-v2-base-multilingual",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Rerank",
   "doc": "https://302ai-en.apifox.cn/api-207705288"
  },
  {
   "model": "jina-reranker-v1-base-en",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Rerank",
   "doc": "https://302ai-en.apifox.cn/api-207705288"
  },
  {
   "model": "jina-reranker-v1-tiny-en",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Rerank",
   "doc": "https://302ai-en.apifox.cn/api-207705288"
  },
  {
   "model": "jina-reranker-v1-turbo-en",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Rerank",
   "doc": "https://302ai-en.apifox.cn/api-207705288"
  },
  {
   "model": "jina-colbert-v1-en",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Rerank",
   "doc": "https://302ai-en.apifox.cn/api-207705288"
  },
  {
   "model": "cl100k_base",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Tokenizer",
   "doc": "https://302ai-en.apifox.cn/api-207705287"
  },
  {
   "model": "jina-reranker-m0",
   "input_usd": 0.05,
   "output_usd": 0.05,
   "unit": "per 1M tokens",
   "note": "Multimodal Reordering",
   "doc": "https://302ai-en.apifox.cn/api-282201344"
  }
 ],
 "Google": [
  {
   "model": "gemini-embedding-001",
   "input_usd": 0.15,
   "output_usd": 0.15,
   "unit": "per 1M tokens",
   "compare": "Original Price",
   "note": "Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-323758845"
  }
 ],
 "302.AI": [
  {
   "model": "Chat（with KB）",
   "raw": "Refer to LLM",
   "note": "Chat with KB",
   "doc": "https://302ai-en.apifox.cn/api-222611742"
  },
  {
   "model": "Chat（with KB-OpenAI compatible）",
   "raw": "Refer to LLM",
   "note": "Chat with KB-OpenAI compatible",
   "doc": "https://302ai-en.apifox.cn/api-238962472"
  },
  {
   "model": "Create（Knowledge Base）",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Create Knowledge Base",
   "doc": "https://302ai-en.apifox.cn/api-222611737"
  },
  {
   "model": "Delete（Knowledge Base）",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Delete Knowledge Base",
   "doc": "https://302ai-en.apifox.cn/api-222611741"
  },
  {
   "model": "Upload",
   "raw": "Refer to LLM",
   "note": "Upload",
   "doc": "https://302ai-en.apifox.cn/api-222611738"
  },
  {
   "model": "List（KB）",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Get List",
   "doc": "https://302ai-en.apifox.cn/api-222611739"
  },
  {
   "model": "Info",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Get Info",
   "doc": "https://302ai-en.apifox.cn/api-222611740"
  },
  {
   "model": "Meta-Chunking（Text LLM slices）",
   "raw": "Refer to LLM",
   "note": "Text LLM slices",
   "doc": "https://302ai-en.apifox.cn/api-245142513"
  },
  {
   "model": "Meta-Chunking（File LLM slices）",
   "raw": "Refer to LLM",
   "note": "File LLM slices",
   "doc": "https://302ai-en.apifox.cn/api-245142548"
  }
 ],
 "SiliconFlow": [
  {
   "model": "Qwen/Qwen3-Embedding-8B",
   "input_usd": 0.04,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Embeddings",
   "doc": "https://302ai-en.apifox.cn/api-323761393"
  },
  {
   "model": "Qwen/Qwen3-Embedding-4B",
   "input_usd": 0.02,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Embeddings",
   "doc": "https://302ai-en.apifox.cn/api-323761393"
  },
  {
   "model": "Qwen/Qwen3-Embedding-0.6B",
   "input_usd": 0.01,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Embeddings",
   "doc": "https://302ai-en.apifox.cn/api-323761393"
  },
  {
   "model": "Qwen/Qwen3-Reranker-8B",
   "input_usd": 0.04,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": " Re-ranking Model",
   "doc": "https://302ai-en.apifox.cn/api-323761394"
  },
  {
   "model": "Qwen/Qwen3-Reranker-4B",
   "input_usd": 0.02,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": " Re-ranking Model",
   "doc": "https://302ai-en.apifox.cn/api-323761394"
  },
  {
   "model": "Qwen/Qwen3-Reranker-0.6B",
   "input_usd": 0.01,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": " Re-ranking Model",
   "doc": "https://302ai-en.apifox.cn/api-323761394"
  }
 ],
 "China AI Model": [
  {
   "model": "qwen3-rerank",
   "input_usd": 0.07,
   "output_usd": 0.0,
   "unit": "per 1M tokens",
   "note": "Text sorting",
   "doc": "https://302ai-en.apifox.cn/411495982e0"
  },
  {
   "model": "zhipu-embedding-2",
   "input_usd": 0.07,
   "output_usd": 0.07,
   "unit": "per 1M tokens",
   "note": "Vector Generation",
   "doc": "https://302ai-en.apifox.cn/api-207705280"
  },
  {
   "model": "BAAI/bge-large-en-v1.5",
   "input_usd": 0.02,
   "output_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "BAAI",
   "doc": "https://302ai-en.apifox.cn/api-207705285"
  },
  {
   "model": "BAAI/bge-large-zh-v1.5",
   "input_usd": 0.02,
   "output_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "BAAI",
   "doc": "https://302ai-en.apifox.cn/api-207705285"
  },
  {
   "model": "Baichuan-Text-Embedding",
   "input_usd": 0.08,
   "output_usd": 0.08,
   "unit": "per 1M tokens",
   "note": "Baichuan",
   "doc": "https://302ai-en.apifox.cn/api-207705281"
  },
  {
   "model": "bce-embedding-base_v1",
   "input_usd": 0.02,
   "output_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "Youdao",
   "doc": "https://302ai-en.apifox.cn/api-207705282"
  },
  {
   "model": "bce-reranker-base_v1",
   "input_usd": 0.02,
   "output_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "Youdao",
   "doc": "https://302ai-en.apifox.cn/api-207705283"
  },
  {
   "model": "bge-reranker-v2-m3",
   "input_usd": 0.02,
   "output_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "BAAI",
   "doc": "https://302ai-en.apifox.cn/api-207705284"
  }
 ]
}
```

### 7 — `image_gpt_dalle_mj`

```json
{
 "GPT-Image": [
  {
   "model": "Generations（Modify Image gpt-image-1.5）",
   "price_usd": 32.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1.5Image output",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Generations（Modify Image gpt-image-1.5）",
   "price_usd": 8.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1.5Image input",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Generations（Modify Image gpt-image-1.5）",
   "price_usd": 5.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1.5Text input",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Generations（Generate image gpt-image-1.5）",
   "price_usd": 32.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1.5Image output",
   "doc": "https://302ai-en.apifox.cn/api-290106862"
  },
  {
   "model": "Generations（Generate image gpt-image-1.5）",
   "price_usd": 10.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1.5Text output",
   "doc": "https://302ai-en.apifox.cn/api-290106862"
  },
  {
   "model": "Generations（Generate image gpt-image-1.5）",
   "price_usd": 5.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1.5Text input",
   "doc": "https://302ai-en.apifox.cn/api-290106862"
  },
  {
   "model": "Generations（Generate image gpt-image-1）",
   "price_usd": 5.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1Text input",
   "doc": "https://302ai-en.apifox.cn/api-290106862"
  },
  {
   "model": "Generations（Generate image gpt-image-1）",
   "price_usd": 40.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1 Image output",
   "doc": "https://302ai-en.apifox.cn/api-290106862"
  },
  {
   "model": "Edit（Modify Image gpt-image-1）",
   "price_usd": 5.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1 Text input",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Generations（Generate image gpt-image-1-mini）",
   "input_usd": 2.0,
   "output_usd": 8.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1-mini Image output",
   "doc": "https://302ai-en.apifox.cn/api-290106862"
  },
  {
   "model": "Edit（Modify Image gpt-image-1）",
   "price_usd": 10.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1 Image input",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Edit（Modify Image gpt-image-1）",
   "price_usd": 40.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1 Image output",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Edit（Modify Image gpt-image-1-mini）",
   "input_usd": 2.0,
   "output_usd": 8.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1-mini Text iutput",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  },
  {
   "model": "Edit（Modify Image gpt-image-1-mini）",
   "input_usd": 2.5,
   "output_usd": 8.0,
   "unit": "per 1M tokens",
   "note": "gpt-image-1-mini Image iutput",
   "doc": "https://302ai-en.apifox.cn/api-290106863"
  }
 ],
 "DALL·E": [
  {
   "model": "dall-e-2",
   "raw": "256x256 - $0.016 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-2",
   "raw": "512x512 - $0.018 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-2",
   "raw": "1024x1024 - $0.02 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-3",
   "raw": "1024x1024 - $0.04 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 3",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-3",
   "raw": "1024x1792 - $0.08 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 3",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-3",
   "raw": "1792x1024 - $0.08 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 3",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-3",
   "raw": "HD 1024x1024 - $0.08 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 3",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-3",
   "raw": "HD 1024x1792 - $0.12 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 3",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-3",
   "raw": "HD 1792x1024 - $0.12 / call",
   "compare": "Original Price",
   "note": "Text to Image DALL·E 3",
   "doc": "https://302ai-en.apifox.cn/api-207705140"
  },
  {
   "model": "dall-e-2",
   "raw": "256x256 - $0.016 / call",
   "compare": "Original Price",
   "note": "Image Edit DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705142"
  },
  {
   "model": "dall-e-2",
   "raw": "512x512 - $0.018 / call",
   "compare": "Original Price",
   "note": "Image Edit DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705142"
  },
  {
   "model": "dall-e-2",
   "raw": "1024x1024 - $0.02 / call",
   "compare": "Original Price",
   "note": "Image Edit DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705142"
  },
  {
   "model": "dall-e-2",
   "raw": "256x256 - $0.016 / call",
   "compare": "Original Price",
   "note": "Image Variant DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705141"
  },
  {
   "model": "dall-e-2",
   "raw": "512x512 - $0.018 / call",
   "compare": "Original Price",
   "note": "Image Variant DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705141"
  },
  {
   "model": "dall-e-2",
   "raw": "1024x1024 - $0.02 / call",
   "compare": "Original Price",
   "note": "Image Variant DALL·E 2",
   "doc": "https://302ai-en.apifox.cn/api-207705141"
  }
 ],
 "Midjourney": [
  {
   "model": "Imagine",
   "price_usd": 0.05,
   "unit": "per call",
   "note": "Draw",
   "doc": "https://302ai-en.apifox.cn/api-207705151"
  },
  {
   "model": "Blend",
   "price_usd": 0.05,
   "unit": "per call",
   "note": "Mixing images",
   "doc": "https://302ai-en.apifox.cn/api-207705149"
  },
  {
   "model": "Modal",
   "price_usd": 0.05,
   "unit": "per call",
   "note": "Local Redrawing",
   "doc": "https://302ai-en.apifox.cn/api-207705152"
  },
  {
   "model": "Action-Upscale",
   "price_usd": 0.025,
   "unit": "per call",
   "note": "Enlarge",
   "doc": "https://302ai-en.apifox.cn/api-207705148"
  },
  {
   "model": "Action-Pan",
   "price_usd": 0.025,
   "unit": "per call",
   "note": "Extend",
   "doc": "https://302ai-en.apifox.cn/api-207705148"
  },
  {
   "model": "Action-Other",
   "price_usd": 0.05,
   "unit": "per call",
   "note": "Other Operations",
   "doc": "https://302ai-en.apifox.cn/api-207705148"
  },
  {
   "model": "Describe",
   "price_usd": 0.025,
   "unit": "per call",
   "note": "Describe Image",
   "doc": "https://302ai-en.apifox.cn/api-207705150"
  },
  {
   "model": "Fetch",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Fetch Task",
   "doc": "https://302ai-en.apifox.cn/api-207705153"
  },
  {
   "model": "Cancel",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "Cancel Task",
   "doc": "https://302ai-en.apifox.cn/api-207705154"
  }
 ],
 "Flux": [
  {
   "model": "Generate [flux-pro-1.1-ultra]",
   "price_usd": 0.06,
   "unit": "per image",
   "note": "Generate images flux-pro-1.1-ultra(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.1]",
   "price_usd": 0.04,
   "unit": "per image",
   "note": "Generate images flux-pro-1.1(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro]",
   "price_usd": 0.05,
   "unit": "per image",
   "note": "Generate images flux-pro(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-dev]",
   "price_usd": 0.025,
   "unit": "per image",
   "note": "Generate images flux-dev(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.0-fill]",
   "price_usd": 0.05,
   "unit": "per image",
   "note": "Generate images flux-pro-1.0-fill(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.0-canny]",
   "price_usd": 0.05,
   "unit": "per image",
   "note": "Generate images flux-pro-1.0-canny(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.0-depth]",
   "price_usd": 0.05,
   "unit": "per image",
   "note": "Generate images flux-pro-1.0-depth(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.1-ultra-finetuned]",
   "price_usd": 0.07,
   "unit": "per image",
   "note": "Generate images flux-pro-1.1-ultra-finetuned(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.0-finetuned]",
   "price_usd": 0.06,
   "unit": "per image",
   "note": "Generate images flux-pro-1.0-finetuned(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  },
  {
   "model": "Generate [flux-pro-1.0-depth-finetuned]",
   "price_usd": 0.06,
   "unit": "per image",
   "note": "Generate images flux-pro-1.0-depth-finetuned(Official API)",
   "doc": "https://302ai-en.apifox.cn/api-256980713"
  }
 ]
}
```

### 7 — `video_google`

```json
[
 {
  "model": "Veo2(Text to Video)",
  "price_usd": 5.0,
  "unit": "per call",
  "note": "Text to Video",
  "doc": "https://302ai-en.apifox.cn/api-263672348"
 },
 {
  "model": "Veo2-i2v(Image to video generation)",
  "price_usd": 5.0,
  "unit": "per call",
  "note": "Image to video generation",
  "doc": "https://302ai-en.apifox.cn/api-305943205"
 },
 {
  "model": "Veo2(Get task results)",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "Get task results",
  "doc": "https://302ai-en.apifox.cn/api-263672349"
 },
 {
  "model": "Veo3(Text to Video)",
  "price_usd": 7.0,
  "unit": "per call",
  "note": "Text to Video",
  "doc": "https://302ai-en.apifox.cn/api-305943206"
 },
 {
  "model": "Veo3(Get task results)",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "Get task results",
  "doc": "https://302ai-en.apifox.cn/api-305943207"
 },
 {
  "model": "Veo3-Fast (Text-to-Video Generation)",
  "price_usd": 0.5,
  "unit": "per call",
  "note": "Text-to-Video Generation",
  "doc": "https://302ai-en.apifox.cn/api-314500532"
 },
 {
  "model": "Veo3-Fast(Get task results)",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "Get task results",
  "doc": "https://302ai-en.apifox.cn/api-314500533"
 },
 {
  "model": "Veo3-Fast-Frames (Text and Image to Video)",
  "price_usd": 0.5,
  "unit": "per call",
  "note": "(Text and Image to Video",
  "doc": "https://302ai-en.apifox.cn/api-323639969"
 },
 {
  "model": "Veo3-Fast-Frames(Get task results)",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "Get task results",
  "doc": "https://302ai-en.apifox.cn/api-323639970"
 },
 {
  "model": "Veo3-Pro(Text-to-Video Generation)",
  "price_usd": 1.0,
  "unit": "per call",
  "note": "Text-to-Video Generation",
  "doc": "https://302ai-en.apifox.cn/api-314500534"
 },
 {
  "model": "Veo3-Pro(Get task results)",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "Get task results",
  "doc": "https://302ai-en.apifox.cn/api-314500535"
 },
 {
  "model": "Veo3-Pro-Frames（Image and Text to Video Generation）",
  "price_usd": 1.0,
  "unit": "per call",
  "note": "Image and Text to Video Generation",
  "doc": "https://302ai-en.apifox.cn/api-315837722"
 },
 {
  "model": "Veo3-Pro-Frames（Veo3-Pro-Frames）",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "Get task results",
  "doc": "https://302ai-en.apifox.cn/api-315837723"
 },
 {
  "model": "Veo3-Fast",
  "price_usd": 0.5,
  "unit": "per call",
  "note": "Veo3-V2 API format call",
  "doc": "https://302ai-en.apifox.cn/332397149e0"
 },
 {
  "model": "Veo3-Fast-Frames",
  "price_usd": 0.5,
  "unit": "per call",
  "note": "Veo3-V2 API format call",
  "doc": "https://302ai-en.apifox.cn/332397149e0"
 },
 {
  "model": "Veo3-Pro",
  "price_usd": 1.0,
  "unit": "per call",
  "note": "Veo3-V2 API format call",
  "doc": "https://302ai-en.apifox.cn/332397149e0"
 },
 {
  "model": "Veo3-Pro-Frames",
  "price_usd": 1.0,
  "unit": "per call",
  "note": "Veo3-V2 API format call",
  "doc": "https://302ai-en.apifox.cn/332397149e0"
 },
 {
  "model": "veo3.1",
  "price_usd": 0.5,
  "unit": "per call",
  "note": "Text-to-Video",
  "doc": "https://302ai-en.apifox.cn/361708990e0"
 },
 {
  "model": "veo3.1-pro",
  "price_usd": 1.0,
  "unit": "per call",
  "note": "Text-to-Video",
  "doc": "https://302ai-en.apifox.cn/361708990e0"
 },
 {
  "model": "Get results",
  "price_usd": 0.0,
  "unit": "per call",
  "note": "-",
  "doc": "https://302ai-en.apifox.cn/361708991e0"
 }
]
```

### 7 — `audio_openai`

```json
[
 {
  "model": "tts-1-1106",
  "input_usd": 15.0,
  "output_usd": 0.0,
  "unit": "per 1M characters",
  "note": "Text to Speech tts-1",
  "doc": "https://302ai-en.apifox.cn/api-207705220"
 },
 {
  "model": "tts-1-1106",
  "input_usd": 15.0,
  "output_usd": 0.0,
  "unit": "per 1M characters",
  "note": "From OpenAI's latest Real-time Voice Conversation API",
  "doc": "https://302ai-en.apifox.cn/222610017e0"
 },
 {
  "model": "tts-1-1106",
  "input_usd": 15.0,
  "output_usd": 0.0,
  "unit": "per 1M characters",
  "note": "From OpenAI's latest Real-time Voice Conversation API",
  "doc": "https://302ai-en.apifox.cn/222610017e0"
 },
 {
  "model": "tts-1-hd-1106",
  "input_usd": 30.0,
  "output_usd": 0.0,
  "unit": "per 1M characters",
  "note": "Text to Speech-HD tts-1-hd-1160）",
  "doc": "https://302ai-en.apifox.cn/api-207705220"
 },
 {
  "model": "Transcriptions",
  "price_usd": 0.006,
  "unit": "per min",
  "note": "$0.006 / min"
 },
 {
  "model": "Transcriptions",
  "price_usd": 0.002,
  "unit": "per min",
  "note": "$0.002 / min"
 },
 {
  "model": "Transcriptions",
  "price_usd": 0.002,
  "unit": "per min",
  "note": "$0.002 / min"
 },
 {
  "model": "Transcriptions",
  "price_usd": 0.002,
  "unit": "per min",
  "note": "$0.002 / min"
 },
 {
  "model": "Translations",
  "price_usd": 0.006,
  "unit": "per min",
  "note": "$0.006 / min"
 },
 {
  "model": "Translations",
  "price_usd": 0.002,
  "unit": "per min",
  "note": "$0.002 / min"
 },
 {
  "model": "Translations",
  "price_usd": 0.002,
  "unit": "per min",
  "note": "$0.002 / min"
 },
 {
  "model": "Translations",
  "price_usd": 0.002,
  "unit": "per min",
  "note": "$0.002 / min"
 },
 {
  "model": "gpt-4o-mini-realtime-preview-2024-12-17",
  "input_usd": 10.0,
  "output_usd": 20.0,
  "unit": "per 1M characters",
  "note": "Input: $10 / 1M characters || Output: $20 / 1M characters"
 },
 {
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "input_usd": 40.0,
  "output_usd": 80.0,
  "unit": "per 1M characters",
  "note": "Input: $40 / 1M characters || Output: $80 / 1M characters"
 },
 {
  "model": "gpt-4o-realtime-preview",
  "input_usd": 40.0,
  "output_usd": 80.0,
  "unit": "per 1M characters",
  "note": "Input: $40 / 1M characters || Output: $80 / 1M characters"
 },
 {
  "model": "gpt-4o-realtime-preview-2024-10-01",
  "input_usd": 100.0,
  "output_usd": 200.0,
  "unit": "per 1M characters",
  "note": "Input: $100 / 1M characters || Output: $200 / 1M characters"
 },
 {
  "model": "gpt-realtime-mini",
  "input_usd": 10.0,
  "output_usd": 20.0,
  "unit": "per 1M characters",
  "note": "Input: $10 / 1M characters || Output: $20 / 1M characters"
 },
 {
  "model": "gpt-4o-transcribe",
  "input_usd": 6.0,
  "output_usd": 10.0,
  "unit": "per 1M characters",
  "note": "Input: $6 / 1M characters || Output: $10 / 1M characters"
 },
 {
  "model": "gpt-4o-transcribe-diarize",
  "input_usd": 3.0,
  "output_usd": 5.0,
  "unit": "per 1M characters",
  "note": "Input: $3 / 1M characters || Output: $5 / 1M characters"
 },
 {
  "model": "gpt-4o-mini-transcribe",
  "input_usd": 6.0,
  "output_usd": 10.0,
  "unit": "per 1M characters",
  "note": "Input: $6 / 1M characters || Output: $10 / 1M characters"
 },
 {
  "model": "gpt-realtime-mini-2025-10-06",
  "input_usd": 10.0,
  "output_usd": 20.0,
  "unit": "per 1M characters",
  "note": "Input: $10 / 1M characters || Output: $20 / 1M characters"
 }
]
```

### 7 — `data_processing`

```json
{
 "Tavily": [
  {
   "model": "Search",
   "price_usd": 0.01,
   "unit": "per call",
   "note": "Search",
   "doc": "https://302ai-en.apifox.cn/api-207705253"
  },
  {
   "model": "Extract",
   "price_usd": 0.002,
   "unit": "per URL",
   "note": "Extract",
   "doc": "https://302ai-en.apifox.cn/api-235295291"
  }
 ],
 "Jina": [
  {
   "model": "Reader",
   "price_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "Web Page to Markdown Format",
   "doc": "https://302ai-en.apifox.cn/api-207705268"
  },
  {
   "model": "Search",
   "price_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "Internet Search",
   "doc": "https://302ai-en.apifox.cn/api-207705269"
  },
  {
   "model": "Grounding",
   "price_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "Fact-based Verification",
   "doc": "https://302ai-en.apifox.cn/api-230624831"
  },
  {
   "model": "Classify",
   "price_usd": 0.02,
   "unit": "per 1M tokens",
   "note": "Content Classification",
   "doc": "https://302ai-en.apifox.cn/api-230629283"
  }
 ],
 "Firecrawl": [
  {
   "model": "Scrape",
   "price_usd": 0.005,
   "unit": "per page",
   "note": "Web scraping service",
   "doc": "https://302ai-en.apifox.cn/api-288419862"
  },
  {
   "model": "Batch Scrape",
   "price_usd": 0.005,
   "unit": "per page",
   "note": "Web scraping service",
   "doc": "https://302ai-en.apifox.cn/api-288419926"
  },
  {
   "model": "Get Batch Scrape Status",
   "price_usd": 0.0,
   "unit": "per page",
   "note": "Get Batch Scrape Status",
   "doc": "https://302ai-en.apifox.cn/api-288419983"
  },
  {
   "model": "Get Batch Scrape Errors",
   "price_usd": 0.0,
   "unit": "per page",
   "note": "Get Batch Scrape Errors",
   "doc": "https://302ai-en.apifox.cn/api-288420166"
  },
  {
   "model": "Map",
   "price_usd": 0.005,
   "unit": "per call",
   "note": "Web sitemap retrieval",
   "doc": "https://302ai-en.apifox.cn/api-288420246"
  },
  {
   "model": "Search",
   "price_usd": 0.005,
   "unit": "per call",
   "note": "Search",
   "doc": "https://302ai-en.apifox.cn/api-288996528"
  }
 ],
 "Exa": [
  {
   "model": "Search",
   "price_usd": 0.01,
   "unit": "per call",
   "note": "Search",
   "doc": "https://302ai-en.apifox.cn/api-207705275"
  },
  {
   "model": "Contents",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "Get Contents",
   "doc": "https://302ai-en.apifox.cn/api-207705276"
  },
  {
   "model": "Answer",
   "price_usd": 0.01,
   "unit": "per call",
   "note": "AI Answer",
   "doc": "https://302ai-en.apifox.cn/api-276258454"
  }
 ],
 "DeepL": [
  {
   "model": "Chat（Translate into English）",
   "price_usd": 25.0,
   "unit": "per 1M characters",
   "note": "Translate into English",
   "doc": "https://302ai-en.apifox.cn/api-207705272"
  },
  {
   "model": "Chat（Translate into Chinese）",
   "price_usd": 25.0,
   "unit": "per 1M characters",
   "note": "Translate into Chinese",
   "doc": "https://302ai-en.apifox.cn/api-207705273"
  },
  {
   "model": "Chat（Translate into Japanese）",
   "price_usd": 25.0,
   "unit": "per 1M characters",
   "note": "Translate into Japanese",
   "doc": "https://302ai-en.apifox.cn/api-207705274"
  },
  {
   "model": "Translate",
   "price_usd": 25.0,
   "unit": "per 1M characters",
   "note": "Translate into any Language",
   "doc": "https://302ai-en.apifox.cn/api-214730964"
  }
 ],
 "Perplexity": [
  {
   "model": "Search",
   "price_usd": 0.005,
   "unit": "per call",
   "note": "Search API",
   "doc": "https://302ai-en.apifox.cn/357015915e0"
  }
 ]
}
```

### 7 — `mcp`

```json
{
 "Web Search Tools": [
  {
   "model": "web Crawl",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "web Crawl",
   "doc": "https://302ai-en.apifox.cn/api-235326269"
  },
  {
   "model": "youtube Video Search",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "youtube Video Search",
   "doc": "https://302ai-en.apifox.cn/api-236434477"
  },
  {
   "model": "youtube Video Subtitles",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "youtube Video Subtitles",
   "doc": "https://302ai-en.apifox.cn/api-252702346"
  },
  {
   "model": "youtube Video Info",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "youtube Video Info",
   "doc": "https://302ai-en.apifox.cn/api-222610812"
  },
  {
   "model": "tiktok Video Search",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "tiktok Video Search",
   "doc": "https://302ai-en.apifox.cn/api-214738990"
  },
  {
   "model": "xiaohongshu Note",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "xiaohongshu Note",
   "doc": "https://302ai-en.apifox.cn/api-214738985"
  },
  {
   "model": "xiaohongshu Search",
   "price_usd": 0.02,
   "unit": "per call",
   "note": "xiaohongshu Search",
   "doc": "https://302ai-en.apifox.cn/api-214738984"
  },
  {
   "model": "bilibiliVideoInfo",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "bilibiliVideoInfo",
   "doc": "https://302ai-en.apifox.cn/api-252702200"
  },
  {
   "model": "twitter Search",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "twitter Search",
   "doc": "https://302ai-en.apifox.cn/api-236434650"
  },
  {
   "model": "arxiv Search",
   "raw": "Refer to LLM",
   "note": "arxiv Search",
   "doc": "https://302ai-en.apifox.cn/api-265250453"
  },
  {
   "model": "wechat Mp Article",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "wechat Mp Article",
   "doc": "https://302ai-en.apifox.cn/api-269233916"
  },
  {
   "model": "wechat Mp Article List",
   "price_usd": 0.01,
   "unit": "per call",
   "note": "wechat Mp Article List",
   "doc": "https://302ai-en.apifox.cn/api-269224841"
  },
  {
   "model": "weibo User Posts",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "weibo User Posts",
   "doc": "https://302ai-en.apifox.cn/api-214738987"
  },
  {
   "model": "web Search",
   "price_usd": 0.001,
   "unit": "per call",
   "note": "web Search"
  },
  {
   "model": "wiki pediaSearch",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "wiki pediaSearch"
  }
 ],
 "Sandbox Tools": [
  {
   "model": "down load Sandbox Files",
   "raw": "Sandbox runtime (seconds) * 0.001 PTC + Exporting sandbox files to the 302 file system (0.001 PTC/call)",
   "note": "down load Sandbox Files",
   "doc": "https://302ai-en.apifox.cn/api-276830648"
  },
  {
   "model": "list Sand boxes",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "list Sand boxes",
   "doc": "https://302ai-en.apifox.cn/api-276826458"
  },
  {
   "model": "create Sandbox",
   "raw": "Sandbox runtime (seconds) * 0.001 PTC",
   "note": "create Sandbox",
   "doc": "https://302ai-en.apifox.cn/api-276825984"
  },
  {
   "model": "kill Sandbox",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "kill Sandbox",
   "doc": "https://302ai-en.apifox.cn/api-276826507"
  },
  {
   "model": "direct Run Code",
   "raw": "Sandbox runtime (seconds) * 0.001 PTC + Exporting sandbox files to the 302 file system (0.001 PTC/call)",
   "note": "direct Run Code",
   "doc": "https://302ai-en.apifox.cn/api-276825891"
  },
  {
   "model": "write Sandbox Files",
   "raw": "Sandbox runtime (seconds) * 0.001 PTC",
   "note": "write Sandbox Files",
   "doc": "https://302ai-en.apifox.cn/api-276829674"
  },
  {
   "model": "run Code",
   "raw": "Sandbox runtime (seconds) * 0.001 PTC",
   "note": "run Code",
   "doc": "https://302ai-en.apifox.cn/api-276828474"
  },
  {
   "model": "run Command",
   "raw": "Sandbox runtime (seconds) * 0.001 PTC",
   "note": "run Command",
   "doc": "https://302ai-en.apifox.cn/api-276829298"
  }
 ],
 "Browser Use Tools": [
  {
   "model": "create Browser Agent Task",
   "raw": "0.001 PTC/second + Model Invocation Fee",
   "note": "create Browser Agent Task",
   "doc": "https://302ai-en.apifox.cn/api-282235063"
  },
  {
   "model": "get Browser Agent Task Result",
   "price_usd": 0.0,
   "unit": "per call",
   "note": "get Browser Agent Task Result",
   "doc": "https://302ai-en.apifox.cn/api-282235713"
  }
 ]
}
```
