---
name: vin
description: "Validate a 17-character VIN against 49 CFR 565.15 / ISO 3779: length, character set (no I/O/Q) and the position-9 check digit, with the position-by-position math"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Validate a 17-character VIN against 49 CFR 565.15 / ISO 3779: length, character set (no I/O/Q) and the position-9 check digit, with the position-by-position math

中文：按 49 CFR 565.15 / ISO 3779 校验 17 位车架号：长度、字符集（无 I/O/Q）、第 9 位校验位，并给出逐位算式

## When to use

- Human or agent needs **VIN Check-Digit Validator** (`text/vin`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.vin`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/vin
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__vin`

## Engine

- **vin-check-digit** 49 CFR 565.15
- Upstream: 49 CFR §565.15 (Table III transliteration, Table IV weights, Table V remainder) + ISO 3779

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
