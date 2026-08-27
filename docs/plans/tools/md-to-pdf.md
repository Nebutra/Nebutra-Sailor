# Tool brief: md-to-pdf

**Status:** shipped before the §6.7.10 research protocol existed. This file has
been reshaped onto the canonical template; the sections it cannot evidence are
marked as holes rather than filled in retroactively.

## 1. Demand

- **JTBD:** 把 Markdown 说明/README/笔记立刻变成可分享 PDF
- **Keywords:** markdown转pdf, md to pdf, md2pdf
- **Pain:** 格式乱、中文缺字、大文档超时、隐私上传焦虑

## 2. Competitors (named, reached, captured)

*Not yet researched to protocol — predates §6.7.10.* Three entries are named
with a one-line strength/weakness judgement each, but none has a URL, a reach
status or a capture, so none satisfies the "named, reached, captured" bar:

| Product | Strength | Weakness |
|---------|----------|----------|
| TinyWow | 上传即用 | 广告、隐私 |
| Dillinger / StackEdit export | 编辑体验 | 非独立工具站 |
| 各类 md2pdf SaaS | 排版好看 | 闭源、贵 |

`_processor-batch-surface.md` reached and captured CloudConvert (which converts
Markdown among many other formats) for a different purpose — the batch-queue
archetype — so that capture is adjacent evidence, not a teardown of this
tool's category. See §11.

## 3. Feature inventory

*Not yet researched — predates the §6.7.10 protocol.* The strength/weakness
column above is the whole of what was recorded: no per-product feature set, no
core-strength-versus-upsell separation.

## 4. Journey maps

*Not yet researched — predates the §6.7.10 protocol.*

## 5. Layout + screenshots

*Not yet researched — predates the §6.7.10 protocol.* No captures exist under
`docs/research/forge/md-to-pdf/`.

## 6. Their debt

Recorded as two words against one competitor — TinyWow: 广告、隐私 (ads,
privacy). That is a real observation and it is also the entire debt analysis;
it was never evidenced against a reached page. *Otherwise not yet researched.*

## 7. Domain know-how

**Solutions / OSS surveyed:**

| Option | Notes |
|--------|-------|
| Playwright/Puppeteer print | **排版 SOTA**（HTML/CSS 打印） |
| md-to-pdf (npm) | 封装 puppeteer |
| marked + pdf 引擎 | 解析 SOTA（marked）+ 可控输出 |

**Engine choice:**

| Layer | Choice | Why |
|-------|--------|-----|
| Markdown parse | **marked** | 解析速度/生态事实标准 |
| PDF render (SOTA) | **Playwright Chromium `page.pdf`** | HTML/CSS 打印是排版 fidelity 行业 SOTA |
| Fallback | structured text PDF | CI / 无浏览器环境；**不得单独对外宣称 production 排版** |

**Policy:** 产品要求 SOTA → **必须走 Playwright**（`engine: playwright` 或
`auto` 成功路径）。会话 plan 的 non-goal **不能**豁免 SOTA 硬门槛。

**Rejected:** 仅手写 PDF 字符串冒充 production。

**Host registration policy (2026-07-24)** — a real deployment constraint, not a
preference: Playwright stays an optional peer dependency, so the tool is
registered only by the product host, never by the shared registry default.

| Consumer | md-to-pdf registered? |
|----------|----------------------|
| `ForgeRegistry.openDefault()` / `F0_BATCH1_TOOLS` | **No** — Playwright stays optional peer |
| `apps/forge` (`src/lib/registry.ts`) | **Yes** — product host imports `@nebutra/forge-runtime/pdf` |

Full operator notes: `apps/forge/README.md` § md-to-pdf registry policy.

## 8. Chosen archetype

*Not argued — predates the §6.7.10 archetype requirement.* The shipped shape
(drop a `.md`, get a file back from a server-side render) is closest to
**Batch queue**'s single-item case or to a job-tier configure-then-generate;
`_processor-batch-surface.md` treats md→pdf as a file-producing job-tier tool
needing result bundling. Nothing on file picks an archetype and the other six
were never argued away. §6.5 gate 12 is not met. See §11.

## 9. Our design

### 9.1 Journey

*Not written as a journey.* What shipped: drag-and-drop a `.md` file
(`MdToPdfRunner`) → server-side Playwright render → PDF.

### 9.2 Layout

*Not recorded — predates the §6.7.10 protocol.*

### 9.3 Must-have

*Not recorded as a list.* What shipped, per the acceptance note: the Playwright
primary path, human drag-and-drop `.md` upload, a SKILL, and host-only
registration with a written policy.

### 9.4 Deliberately skipped

- **A hand-written PDF string generator passed off as production typography** —
  explicitly rejected (§7).
- **Registering md-to-pdf in the shared registry default** — deliberate, so
  Playwright stays an optional peer (§7, host registration policy).

### 9.5 Differentiator

*Not argued against reached competitors* (see §2). Two claims are on record and
both are posture rather than measured comparison: Playwright HTML/CSS print as
the primary path (against SaaS competitors' 闭源/贵), and none of the ad or
upload-anxiety debt flagged against TinyWow.

### 9.6 I/O contract

*Not written out in this brief.* The `engine: playwright | auto` selector is
the one contract detail on record.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Shipped — drag-and-drop `.md` upload (`MdToPdfRunner`); empty/error and mobile states not separately reviewed against this gate |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not recorded in this brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not recorded in this brief |
| 4 | SKILL.md (what / when / how / limits) | **Met** — SKILL shipped per the acceptance note |
| 5 | Meter id + wallet hooks | Not recorded in this brief |
| 6 | Side-effect class declared | Not recorded in this brief — non-trivial here, since rendering runs server-side on uploaded content |
| 7 | Stable error codes; `request_id` on server paths | Not recorded in this brief |
| 8 | Privacy note: client-only vs uploaded; retention | **Open** — §1 names 隐私上传焦虑 as a user pain and this tool does upload; no retention or privacy statement exists |
| 9 | Decl/ads: intent title, unique value, related tools | Not recorded in this brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Partially — engines named (marked, Playwright Chromium `page.pdf`), no versions pinned |
| 11 | **Competitor teardown on file** (§6.7.10) | **Not met** — three entries named, none reached or captured (§2) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Not met** — no archetype chosen (§8) |

**内部验收状态：** `production`（Playwright 主路径 + 拖拽上传 UX + SKILL；CJK 依赖宿主字体）

## 11. Gaps and open questions

- [x] Playwright HTML print as primary path
- [x] 人用拖拽 `.md` 上传（`MdToPdfRunner`）
- [x] Host-only registration + documented policy
- [ ] **系统 CJK 字体保证** — CJK rendering depends on the host OS font stack,
      so the same document can render differently, or with missing glyphs,
      depending on where the render runs. §1 names 中文缺字 as a user pain, so
      this is the tool's own headline pain, still open.
- [ ] **嵌入式 CJK webfont 子集（可选增强）** — the durable fix for the above.
- [ ] **No competitor teardown exists** (§6.5 gate 11): TinyWow, Dillinger /
      StackEdit and the md2pdf SaaS category are judged in one line each, never
      reached, never captured.
- [ ] **No archetype chosen** (§6.5 gate 12) — and it matters, because
      `_processor-batch-surface.md` treats this tool as file-producing job-tier
      work needing result bundling, which is a different journey from a single
      synchronous drop.
- [ ] **Privacy and retention are unwritten** while the brief itself names
      隐私上传焦虑 as a reason users hesitate (§1, §10 gate 8).
- [ ] **大文档超时 is named as a pain in §1 with no recorded answer** — no
      document-size ceiling, no timeout budget, no degradation path for the
      Playwright render.
- [ ] **The fallback path's user-facing framing is a policy, not a UI
      decision** — §7 forbids claiming production typography for the
      structured-text fallback, but nothing says what the user is told when the
      fallback is what actually ran.
- [ ] **Gates 2, 3, 5, 6, 7 and 9 are unrecorded, not necessarily unmet.**
