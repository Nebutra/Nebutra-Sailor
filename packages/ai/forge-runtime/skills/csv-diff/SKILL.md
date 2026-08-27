---
name: csv-diff
description: "Row-identity CSV comparison: added / removed / changed / unchanged with per-cell old→new, column-rename mapping and full/inner/left joins"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Row-identity CSV comparison: added / removed / changed / unchanged with per-cell old→new, column-rename mapping and full/inner/left joins

中文：按主键匹配行、逐单元格对比两个 CSV：新增/删除/修改/未变，支持列改名映射与 full/inner/left 连接

## When to use

- Human or agent needs **CSV Diff** (`data/csv-diff`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.csv_diff`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/csv-diff
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__csv-diff`

## Engine

- **nebutra-csv-diff** 1.0.0
- Upstream: RFC 4180 · WHATWG Encoding §12.2.2 windows-1252 · ISO/IEC 9075 join semantics

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
