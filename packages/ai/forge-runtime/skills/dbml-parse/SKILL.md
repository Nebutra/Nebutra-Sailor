---
name: dbml-parse
description: Parse DBML with @dbml/core into tables/columns/refs (no ERD canvas)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Parse DBML with @dbml/core into tables/columns/refs (no ERD canvas)

中文：@dbml/core 解析 DBML，列出表/字段/关系（不含 ER 图画布）

## When to use

- Human or agent needs **DBML Parse** (`data/dbml-parse`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.dbml_parse`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/dbml-parse
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__dbml-parse`

## Engine

- **@dbml/core** 9.x
- Upstream: https://github.com/holistics/dbml

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
