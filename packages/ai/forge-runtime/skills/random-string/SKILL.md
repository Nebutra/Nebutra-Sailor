---
name: random-string
description: "Cryptographically strong random strings (node:crypto)"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Cryptographically strong random strings (node:crypto)

中文：密码学安全随机字符串（node:crypto）

## When to use

- Human or agent needs **Random String Generator** (`dev/random-string`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.random_string`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/random-string
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__random-string`

## Engine

- **crypto.randomInt** runtime
- Upstream: node:crypto

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
