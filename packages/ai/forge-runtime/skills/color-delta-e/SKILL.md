---
name: color-delta-e
description: Perceptual color difference via culori CIEDE2000 with Lab/OKLCH
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Perceptual color difference via culori CIEDE2000 with Lab/OKLCH

中文：culori CIEDE2000 计算两色感知色差；附 Lab/OKLCH

## When to use

- Human or agent needs **Color ΔE (CIEDE2000)** (`dev/color-delta-e`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.color_delta_e`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/color-delta-e
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__color-delta-e`

## Engine

- **culori** 4.x
- Upstream: https://github.com/Evercoder/culori (differenceCiede2000)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
