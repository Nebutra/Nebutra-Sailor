---
name: multi-hash
description: Generate MD5, SHA-1, SHA-256, SHA-512 in one call
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Generate MD5, SHA-1, SHA-256, SHA-512 in one call

中文：一次输出 MD5 / SHA-1 / SHA-256 / SHA-512

## When to use

- Human or agent needs **Multi-Hash Generator** (`hash/multi-hash`).
- Tier: `core` · side-effect: `pure` · meter: `forge.hash.multi`.

## How to invoke

```http
POST /api/v1/tools/invoke/hash/multi-hash
Content-Type: application/json

{"input":{"text":"hello"}}
```

MCP name: `hash__multi-hash`

## Engine

- **node:crypto** runtime
- Upstream: node:crypto createHash

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
