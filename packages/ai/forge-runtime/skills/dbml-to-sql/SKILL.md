---
name: dbml-to-sql
description: Export DBML to PostgreSQL / MySQL / MSSQL / Oracle via @dbml/core
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Export DBML to PostgreSQL / MySQL / MSSQL / Oracle via @dbml/core

中文：@dbml/core 将 DBML 导出为 PostgreSQL / MySQL / MSSQL / Oracle SQL

## When to use

- Human or agent needs **DBML to SQL** (`data/dbml-to-sql`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.dbml_to_sql`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/dbml-to-sql
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__dbml-to-sql`

## Engine

- **@dbml/core ModelExporter** 9.x
- Upstream: https://github.com/holistics/dbml

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
