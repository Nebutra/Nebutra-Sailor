---
name: ip-validate
description: Validate IPv4 / IPv6 format offline
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Validate IPv4 / IPv6 format offline

中文：校验 IPv4 / IPv6 格式（离线）

## When to use

- Human or agent needs **IP Address Validator** (`dev/ip-validate`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.ip_validate`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/ip-validate
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__ip-validate`

## Engine

- **ip-regex** 0.1.0
- Upstream: RFC 791 / 4291 practical patterns

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
