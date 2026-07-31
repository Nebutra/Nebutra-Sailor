---
name: url-validate
description: Parse and validate URL shape (WHATWG URL)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Parse and validate URL shape (WHATWG URL)

中文：解析并校验 URL 结构（WHATWG URL）

## When to use

- Human or agent needs **URL Validator** (`dev/url-validate`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.url_validate`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/url-validate
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__url-validate`

## Engine

- **URL** runtime
- Upstream: WHATWG URL Standard

## Composition (next)

Chain these after a successful run when the job continues:

- `image/qr-generate` (MCP: `image__qr-generate`)
- `codec/url` (MCP: `codec__url`)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
