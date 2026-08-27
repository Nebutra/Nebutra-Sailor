---
name: uuid-validate
description: Validate UUID format and version nibble (RFC 4122)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Validate UUID format and version nibble (RFC 4122)

中文：校验 UUID 格式与版本位（RFC 4122）

## When to use

- Human or agent needs **UUID Validator** (`dev/uuid-validate`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.uuid_validate`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/uuid-validate
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__uuid-validate`

## Engine

- **uuid-shape** 0.1.0
- Upstream: RFC 4122

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
