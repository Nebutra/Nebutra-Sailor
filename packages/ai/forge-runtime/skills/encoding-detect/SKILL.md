---
name: encoding-detect
description: Detect charset, BOM, line endings and byte stats — read-only, with a ranked confidence list instead of a single guess
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Detect charset, BOM, line endings and byte stats — read-only, with a ranked confidence list instead of a single guess

中文：检测字符编码、BOM、换行符与字节统计；只判断不改写，给出带置信度的候选排名

## When to use

- Human or agent needs **Text Encoding Detector** (`text/encoding-detect`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.encoding_detect`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/encoding-detect
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__encoding-detect`

## Engine

- **charset-structure-probe** 1.0.0
- Upstream: RFC 3629 + Unicode Table 3-7 (well-formed UTF-8) · Unicode byte order mark signatures · GB 18030-2022 · Big5 · JIS X 0201/0208 (Shift_JIS, EUC-JP) · KS X 1001 (EUC-KR)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
