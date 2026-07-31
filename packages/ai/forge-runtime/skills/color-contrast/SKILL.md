---
name: color-contrast
description: WCAG contrast ratio and AA/AAA pass/fail
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

WCAG contrast ratio and AA/AAA pass/fail

中文：计算两色对比度并给出 WCAG AA/AAA 判定

## When to use

- Human or agent needs **Color Contrast (WCAG)** (`dev/color-contrast`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.color_contrast`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/color-contrast
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__color-contrast`

## Engine

- **wcag-contrast** 0.1.0
- Upstream: WCAG 2.x relative luminance

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
