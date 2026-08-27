---
name: data-size
description: Convert B KB MB GB TB
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Convert B KB MB GB TB

中文：B/KB/MB/GB/TB

## When to use

- Human or agent needs **Data Size Converter** (`unit/data-size`).
- Tier: `core` · side-effect: `pure` · meter: `forge.unit.data_size`.

## How to invoke

```http
POST /api/v1/tools/invoke/unit/data-size
Content-Type: application/json

{"input":{}}
```

MCP name: `unit__data-size`

## Engine

- **unit-utils** 0.1.0
- Upstream: 1024-based binary units

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
