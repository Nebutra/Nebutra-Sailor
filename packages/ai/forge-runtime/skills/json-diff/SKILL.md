---
name: json-diff
description: Structural JSON compare with path-level ops (agent-friendly)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Structural JSON compare with path-level ops (agent-friendly)

中文：结构化对比两段 JSON，输出路径级差异（Agent 友好）

## When to use

- Human or agent needs **JSON Diff** (`data/json-diff`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.json_diff`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/json-diff
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__json-diff`

## Engine

- **json-structural-diff** 0.1.0
- Upstream: nebutra pure path diff

## Composition (next)

Chain these after a successful run when the job continues:

- `data/json-format` (MCP: `data__json-format`)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
