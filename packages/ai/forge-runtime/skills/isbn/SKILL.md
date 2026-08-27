---
name: isbn
description: Bulk-validate ISBN-10/ISBN-13 check digits, suggest the correct one, convert 10↔13
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Bulk-validate ISBN-10/ISBN-13 check digits, suggest the correct one, convert 10↔13

中文：批量校验 ISBN-10/ISBN-13 校验位，给出应有校验位并互转（979 无 ISBN-10）

## When to use

- Human or agent needs **ISBN Validator & Converter** (`text/isbn`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.isbn`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/isbn
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__isbn`

## Engine

- **isbn-check-digit** ISO 2108:2017
- Upstream: ISO 2108 (ISBN) + GS1 General Specifications (EAN-13 check digit)

## Composition (next)

Chain these after a successful run when the job continues:

- `life/ean-upc-gtin` (MCP: `life__ean-upc-gtin`)

## Batch

This tool supports the Processor batch surface (`resultKind=json`, accept=`lines`).

- MCP: `forge.batch.create` with `toolId: "text/isbn"`
- Poll: `forge.batch.get`
## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
