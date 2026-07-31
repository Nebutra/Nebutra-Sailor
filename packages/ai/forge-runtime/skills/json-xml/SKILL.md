---
name: json-xml
description: Convert between JSON and XML via fast-xml-parser
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Convert between JSON and XML via fast-xml-parser

中文：fast-xml-parser 双向转换

## When to use

- Human or agent needs **JSON ↔ XML** (`data/json-xml`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.json_xml`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/json-xml
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__json-xml`

## Engine

- **fast-xml-parser** 5.x
- Upstream: https://github.com/NaturalIntelligence/fast-xml-parser

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
