---
name: weight
description: kg g lb oz ton
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

kg g lb oz ton

中文：千克/克/磅/盎司/吨

## When to use

- Human or agent needs **Weight Converter** (`unit/weight`).
- Tier: `core` · side-effect: `pure` · meter: `forge.unit.weight`.

## How to invoke

```http
POST /api/v1/tools/invoke/unit/weight
Content-Type: application/json

{"input":{}}
```

MCP name: `unit__weight`

## Engine

- **si-unit-tables** 1.0.0
- Upstream: NIST / SI conversion factors

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
