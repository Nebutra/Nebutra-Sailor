---
name: sql-to-dbml
description: Import SQL DDL to DBML via @dbml/core
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Import SQL DDL to DBML via @dbml/core

中文：@dbml/core 将 SQL DDL 导入为 DBML

## When to use

- Human or agent needs **SQL to DBML** (`data/sql-to-dbml`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.sql_to_dbml`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/sql-to-dbml
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__sql-to-dbml`

## Engine

- **@dbml/core importer** 9.x
- Upstream: https://github.com/holistics/dbml

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
