---
name: temperature
description: Celsius Fahrenheit Kelvin
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Celsius Fahrenheit Kelvin

中文：摄氏/华氏/开尔文

## When to use

- Human or agent needs **Temperature Converter** (`unit/temperature`).
- Tier: `core` · side-effect: `pure` · meter: `forge.unit.temperature`.

## How to invoke

```http
POST /api/v1/tools/invoke/unit/temperature
Content-Type: application/json

{"input":{}}
```

MCP name: `unit__temperature`

## Engine

- **si-unit-tables** 1.0.0
- Upstream: NIST / SI conversion factors

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
