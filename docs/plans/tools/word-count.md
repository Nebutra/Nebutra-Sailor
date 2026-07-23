# Tool brief: word-count

## 1. User need

中英文混排字数（作文、公众号、论文）。

## 2. Competitors

各类「在线字数统计」— 区分字符/词/中文。

## 3–5. Engine

| Choice | Why |
|--------|-----|
| **Intl.Segmenter** (when available) + CJK ranges | 现代 Unicode 分词 SOTA 路径 |
| Fallback | 既有 latin token + CJK char 规则 |

**sota_status:** `production`（Intl.Segmenter + 实时统计 UX + 服务端/Agent 同契约）
