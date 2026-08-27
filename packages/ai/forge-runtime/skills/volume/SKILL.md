---
name: volume
description: L mL gallon m³
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

L mL gallon m³

中文：升/毫升/加仑/立方米

## When to use

- Human or agent needs **Volume Converter** (`unit/volume`).
- Tier: `core` · side-effect: `pure` · meter: `forge.unit.volume`.

## How to invoke

```http
POST /api/v1/tools/invoke/unit/volume
Content-Type: application/json

{"input":{}}
```

MCP name: `unit__volume`

## Engine

- **si-unit-tables** 1.0.0
- Upstream: NIST / SI conversion factors

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
