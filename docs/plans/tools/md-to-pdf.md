# Tool brief: md-to-pdf

## 1. User need

- **JTBD:** 把 Markdown 说明/README/笔记立刻变成可分享 PDF  
- **Keywords:** markdown转pdf, md to pdf, md2pdf  
- **Pain:** 格式乱、中文缺字、大文档超时、隐私上传焦虑  

## 2. Competitors

| Product | Strength | Weakness |
|---------|----------|----------|
| TinyWow | 上传即用 | 广告、隐私 |
| Dillinger / StackEdit export | 编辑体验 | 非独立工具站 |
| 各类 md2pdf SaaS | 排版好看 | 闭源、贵 |

## 3–4. Solutions / OSS

| Option | Notes |
|--------|-------|
| Playwright/Puppeteer print | **排版 SOTA**（HTML/CSS 打印） |
| md-to-pdf (npm) | 封装 puppeteer |
| marked + pdf 引擎 | 解析 SOTA（marked）+ 可控输出 |

## 5. Engine choice

| Layer | Choice | Why |
|-------|--------|-----|
| Markdown parse | **marked** | 解析速度/生态事实标准 |
| PDF render (SOTA) | **Playwright Chromium `page.pdf`** | HTML/CSS 打印是排版 fidelity 行业 SOTA |
| Fallback | structured text PDF | CI / 无浏览器环境；**不得单独对外宣称 production 排版** |

**Policy:** 产品要求 SOTA → **必须走 Playwright**（`engine: playwright` 或 `auto` 成功路径）。  
会话 plan 的 non-goal **不能**豁免 SOTA 硬门槛。

**sota_status now:** `production`（Playwright 主路径 + 拖拽上传 UX + SKILL；CJK 依赖宿主字体）  
**Rejected:** 仅手写 PDF 字符串冒充 production  

## Host registration policy (2026-07-24)

| Consumer | md-to-pdf registered? |
|----------|----------------------|
| `ForgeRegistry.openDefault()` / `F0_BATCH1_TOOLS` | **No** — Playwright stays optional peer |
| `apps/forge` (`src/lib/registry.ts`) | **Yes** — product host imports `@nebutra/forge-runtime/pdf` |

Full operator notes: `apps/forge/README.md` § md-to-pdf registry policy.

## Gaps

- [x] Playwright HTML print as primary path  
- [x] 人用拖拽 .md 上传（MdToPdfRunner）  
- [x] Host-only registration + documented policy  
- [ ] 系统 CJK 字体保证（依赖宿主 OS 字体栈）  
- [ ] 嵌入式 CJK webfont 子集（可选增强）
