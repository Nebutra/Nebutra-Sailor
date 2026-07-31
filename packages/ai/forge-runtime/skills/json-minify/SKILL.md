---
name: json-minify
description: Minify JSON by stripping whitespace via JSON.parse/stringify
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Minify JSON by stripping whitespace via JSON.parse/stringify

中文：压缩 JSON 去除空白（JSON.parse/stringify）

## When to use

- Human or agent needs **JSON Minifier** (`data/json-minify`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.json_minify`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/json-minify
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__json-minify`

## Engine

- **JSON.parse** runtime
- Upstream: ECMA-262 JSON

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
