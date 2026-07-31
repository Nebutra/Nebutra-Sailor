# Nebutra Forge — F0 Tool Catalog & OSS SOTA Map

**Date:** 2026-07-23  
**Status:** **Shipped** (2026-07-31: **60/60** catalog rows live including `time/world-clock` + `dev/js-format`; inventory far beyond F0). Do **not** use this file as an open build backlog for more tools — see [2026-07-31-forge-f2-convergence.md](./2026-07-31-forge-f2-convergence.md).  
**Parent:** [2026-07-23-nebutra-router-forge-design.md](./2026-07-23-nebutra-router-forge-design.md)  
**Goal (historical):** ~50–60 everyday tools that already feel like a **tool station**, each backed by **OSS SOTA** and shipped with **AI-Native dual surface** (human page + API/MCP/SKILL where Core).

---

## 1. Rules for this catalog

1. **Cover drawers first** — density and familiarity beat cleverness.  
2. **SOTA via OSS** — choose maintained, widely used libraries; pin versions at impl time.  
3. **Do not re-research** — if a mature lib exists, wrap it.  
4. **Tier**  
   - **Core** = human + full Agent gate (OpenAPI + MCP + SKILL + meter)  
   - **Catalog** = human first; Agent can follow in F0.5 if cheap  
   - **Job** = async + artifact  
5. **Privacy**  
   - **Client** = runs in browser when safe (password, pure text transforms)  
   - **Edge/Server** = needs Node/native (PDF, heavy image, tokenizer files)

Engine names below are **candidate class leaders**, not irrevocable vendor locks. Swap only for equal-or-better maintained SOTA.

---

## 2. Shared engines (reuse across many tools)

| Engine id | Candidate OSS | Used by |
|-----------|---------------|---------|
| `text-utils` | Small pure TS modules (+ `opencc-js` for 简繁) | text drawer |
| `diff` | `diff` / `diff-match-patch` | text.diff, code.diff |
| `md` | `markdown-it` or `marked` + sanitizer (`isomorphic-dompurify`) | md preview/html |
| `md-pdf` | `md-to-pdf` / Playwright print / `@react-pdf` path — pick one SOTA in impl spike | md.to-pdf **Job** |
| `json` | Native `JSON` + `js-yaml` + `@iarna/toml` | format convert |
| `hash` | Web Crypto + Node `crypto` (no home-rolled digests) | hash tools |
| `jwt` | `jose` | jwt.decode |
| `cron` | `cron-parser` | cron explain |
| `uuid` | `uuid` / native `crypto.randomUUID` | id tools |
| `color` | `culori` or `colorjs.io` | color convert |
| `sql-fmt` | `sql-formatter` | sql.format |
| `prettier-lite` | Prettier (bounded) or language-specific beautifiers | code format |
| `regex` | Native `RegExp` + safe timeout wrapper | regex tester |
| `qr` | `qrcode` + `jsqr` | qr gen/parse |
| `image` | `sharp` (already in monorepo) | F1 primary; F0 only if needed |
| `tokenizer` | `js-tiktoken` (already in monorepo) + cl100k/o200k encodings | token estimate |
| `pinyin` | `pinyin-pro` | text.pinyin |
| `currency-cn` | well-tested nzh / `nzh` style lib | 人民币大写 |

---

## 3. F0 tool list (~55)

### 3.1 Text（~14）— SEO + daily

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `text/word-count` | 字数统计 | Core | Client+API | `text-utils` | Y |
| `text/remove-blank-lines` | 删除空行 | Catalog | Client | `text-utils` | optional |
| `text/remove-duplicate-lines` | 删除重复行 | Catalog | Client | `text-utils` | optional |
| `text/trim-whitespace` | 去除首尾/多余空格 | Catalog | Client | `text-utils` | optional |
| `text/replace` | 文本替换 | Catalog | Client | `text-utils` | optional |
| `text/case-convert` | 大小写转换 | Catalog | Client | `text-utils` | optional |
| `text/line-prefix-suffix` | 行首行尾批量添加 | Catalog | Client | `text-utils` | optional |
| `text/sort-lines` | 行排序 | Catalog | Client | `text-utils` | optional |
| `text/zh-cn-tw` | 简繁转换 | Core | Client+API | `opencc-js` | Y |
| `text/pinyin` | 汉字转拼音 | Core | Client+API | `pinyin-pro` | Y |
| `text/fullwidth-halfwidth` | 全角半角转换 | Catalog | Client | `text-utils` | optional |
| `text/rmb-uppercase` | 人民币大写金额 | Core | Client+API | `nzh` class | Y |
| `text/diff` | 文本对比 | Core | Client+API | `diff` | Y |
| `text/strip-html` | 去除 HTML 标签 | Catalog | Client | sanitizer | optional |

### 3.2 Encode / decode（~8）

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `codec/base64` | Base64 编码解码 | Core | Client+API | Web/Node std | Y |
| `codec/url` | URL 编码解码 | Core | Client+API | std | Y |
| `codec/html-entities` | HTML 实体转义 | Core | Client+API | `he` or std | Y |
| `codec/unicode` | Unicode 转换 | Catalog | Client | std | optional |
| `codec/hex` | Hex 编码解码 | Catalog | Client | std | optional |
| `codec/jwt-decode` | JWT 解析 | Core | Client+API | `jose` | Y |
| `codec/image-base64` | 图片 Base64 | Catalog | Client | FileReader | optional |
| `codec/query-string` | QueryString 解析 | Catalog | Client | std | optional |

### 3.3 Hash / password（~7）

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `hash/md5` | MD5 | Core | Client+API | WebCrypto/node | Y |
| `hash/sha256` | SHA-256 | Core | Client+API | WebCrypto | Y |
| `hash/sha512` | SHA-512 | Catalog | Client+API | WebCrypto | optional |
| `hash/hmac` | HMAC | Core | API preferred | WebCrypto | Y |
| `hash/file-checksum` | 文件校验和 | Catalog | Client | WebCrypto | optional |
| `security/password-generate` | 随机密码生成 | Core | Client | WebCrypto | Y |
| `security/password-strength` | 密码强度 | Catalog | Client | zxcvbn-class | optional |

### 3.4 JSON / data（~7）

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `data/json-format` | JSON 格式化/压缩/校验 | Core | Client+API | JSON | Y |
| `data/json-yaml` | JSON ⇄ YAML | Core | Client+API | `js-yaml` | Y |
| `data/json-toml` | JSON ⇄ TOML | Catalog | Client+API | `@iarna/toml` | optional |
| `data/json-csv` | JSON ⇄ CSV | Core | Client+API | papaparse-class | Y |
| `data/json-path` | JSON Path 查询 | Catalog | Client+API | `jsonpath-plus` | optional |
| `data/xml-format` | XML 格式化 | Catalog | Client | fast-xml-parser-class | optional |
| `data/csv-preview` | CSV 预览 | Catalog | Client | papaparse-class | optional |

### 3.5 Time（~6）

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `time/unix-timestamp` | Unix 时间戳转换 | Core | Client+API | `dayjs`/`Temporal` | Y |
| `time/timezone` | 时区转换 | Core | Client+API | `dayjs`+tz | Y |
| `time/date-diff` | 日期间隔 | Catalog | Client | dayjs | optional |
| `time/cron-explain` | Cron 解析/说明 | Core | Client+API | `cron-parser` | Y |
| `time/world-clock` | 世界时钟 | Catalog | Client | dayjs | N |
| `time/lunar` | 公历农历转换 | Catalog | Client | `lunar-javascript` class | optional |

### 3.6 Dev knives（~10）

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `dev/uuid` | UUID 生成 | Core | Client+API | uuid/crypto | Y |
| `dev/nanoid` | NanoID 生成 | Catalog | Client | `nanoid` | optional |
| `dev/regex-tester` | 正则测试 | Core | Client+API* | RegExp+timeout | Y |
| `dev/sql-format` | SQL 格式化 | Core | Client+API | `sql-formatter` | Y |
| `dev/js-format` | JS/TS 格式化 | Catalog | Client | prettier | optional |
| `dev/css-format` | CSS 格式化 | Catalog | Client | prettier | optional |
| `dev/color-convert` | 颜色转换 | Core | Client+API | `culori` | Y |
| `dev/number-base` | 进制转换 | Core | Client+API | std | Y |
| `dev/user-agent` | UA 解析 | Catalog | Client+API | `ua-parser-js` | optional |
| `dev/markdown-preview` | Markdown 预览 | Core | Client+API | `md` engine | Y |

\*Regex on server must use timeout/size limits (ReDoS).

### 3.7 QR + light image（~2）— bridge to F1

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `image/qr-generate` | 二维码生成 | Core | Client+API | `qrcode` | Y |
| `image/qr-decode` | 二维码解析 | Catalog | Client | `jsqr` | optional |

### 3.8 Markdown job（~2）

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `doc/md-to-html` | Markdown 转 HTML | Core | Client+API | `md` | Y |
| `doc/md-to-pdf` | Markdown 转 PDF | **Job** | Server | `md-pdf` SOTA spike | Y |

### 3.9 Agent blades（~4）— Router bridge

| slug | title (zh) | tier | runtime | engine | Agent |
|------|------------|------|---------|--------|-------|
| `llm/token-count` | Token 计数 | Core | API | `js-tiktoken` | Y |
| `llm/token-estimate-text` | 文本 Token 估算 | Core | Client+API | `js-tiktoken` | Y |
| `llm/cost-estimate` | 调用费用估算 | Core | API | Router price card + tokens | Y |
| `llm/json-schema-validate` | JSON Schema 校验 | Core | Client+API | Ajv | Y |

---

## 4. F0 totals

| Metric | Count |
|--------|-------|
| Tools listed | **~55** |
| Core (full Agent gate) | **~30** |
| Catalog (human-first) | **~23** |
| Job | **1** (`doc/md-to-pdf`) |
| Drawers touched | text, codec, hash, data, time, dev, image(light), doc, llm |

This is enough for **Swiss-army first impression** without waiting for full PDF/image suite (F1).

---

## 5. Dual-surface metadata (per tool)

Every catalog row becomes a registry record:

```yaml
id: text/word-count
slug: word-count
category: text
title: { zh: 字数统计, en: Word Counter }
tier: core
runtime: [client, server]
engine: { name: text-utils, upstream: "in-house pure + segmenter", version: pinned }
side_effect: pure
meter: forge.text.word_count
seo:
  zh: ["在线字数统计", "字符统计"]
  en: ["word counter online"]
agent:
  openapi: true
  mcp: true
  skill: true
```

---

## 6. F1 preview (not in F0 build, planned next)

To be catalogued in a follow-up file when F0 ships:

- Image: compress, convert, resize, watermark, 证件照, png→svg (`sharp` + specialized OSS)  
- PDF: merge, split, compress, pdf↔image (`pdf-lib` / qpdf-class / mutool as spike)  
- Units: full converter family (one engine, many SEO pages)  
- Life: mortgage, BMI, 亲戚称呼  
- CN: 身份证校验, 手机归属地  

---

## 7. Implementation notes

1. **Client-first pure tools** — ship WASM/JS in page; API reuses same pure function module (one implementation).  
2. **Monorepo placement (suggested)** — `packages/ai/forge-tools` or `packages/platform/forge-runtime` for pure engines; `apps/forge` for Next surface; registry JSON/YAML as source of truth.  
3. **Spike before F0 freeze** — only `doc/md-to-pdf` engine choice needs a short bake-off.  
4. **Do not** block F0 on perfect design polish for all 55 pages — shared tool layout template + per-tool config.  

---

## 8. Acceptance for F0

- [ ] Home: search + ≥8 category entries + hot list  
- [ ] ≥50 tools routable on human URLs  
- [ ] ≥25 Core tools pass AI-Native ship gate  
- [ ] `doc/md-to-pdf` job works end-to-end  
- [ ] `llm/token-count` + `llm/cost-estimate` document link to Router  
- [ ] Each Core tool declares OSS/engine in metadata  
- [ ] Contract tests for invoke API on Core set sample  
