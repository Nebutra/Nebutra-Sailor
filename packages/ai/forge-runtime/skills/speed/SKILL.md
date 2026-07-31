---
name: speed
description: m/s km/h mph knots
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

m/s km/h mph knots

中文：m/s · km/h · mph · kn

## When to use

- Human or agent needs **Speed Converter** (`unit/speed`).
- Tier: `core` · side-effect: `pure` · meter: `forge.unit.speed`.

## How to invoke

```http
POST /api/v1/tools/invoke/unit/speed
Content-Type: application/json

{"input":{}}
```

MCP name: `unit__speed`

## Engine

- **si-unit-tables** 1.0.0
- Upstream: NIST / SI conversion factors

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
