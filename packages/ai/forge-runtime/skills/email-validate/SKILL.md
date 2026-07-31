---
name: email-validate
description: Validate email format (batch, one per line)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Validate email format (batch, one per line)

中文：校验邮箱格式（支持批量，一行一个）

## When to use

- Human or agent needs **Email Validator** (`text/email-validate`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.email_validate`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/email-validate
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__email-validate`

## Engine

- **email-shape** 0.1.0
- Upstream: practical email regex (WHATWG-inspired)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
