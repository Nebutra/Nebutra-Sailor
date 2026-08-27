---
name: area
description: m² hectare mu ft²
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

m² hectare mu ft²

中文：平方米/公顷/亩/平方英尺

## When to use

- Human or agent needs **Area Converter** (`unit/area`).
- Tier: `core` · side-effect: `pure` · meter: `forge.unit.area`.

## How to invoke

```http
POST /api/v1/tools/invoke/unit/area
Content-Type: application/json

{"input":{}}
```

MCP name: `unit__area`

## Engine

- **si-unit-tables** 1.0.0
- Upstream: NIST / SI conversion factors

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
