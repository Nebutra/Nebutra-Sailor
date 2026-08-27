---
name: xlsx-text
description: Extract first sheet of .xlsx as CSV (ZIP + sheet1.xml, no Excel suite)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Extract first sheet of .xlsx as CSV (ZIP + sheet1.xml, no Excel suite)

中文：从 .xlsx 首表提取 CSV（ZIP + sheet1.xml，无需 Excel）

## When to use

- Human or agent needs **XLSX Sheet Extract** (`doc/xlsx-text`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.xlsx_text`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/xlsx-text
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__xlsx-text`

## Engine

- **pure-zip** 0
- Upstream: Node zlib inflateRaw + OOXML sheet1

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
