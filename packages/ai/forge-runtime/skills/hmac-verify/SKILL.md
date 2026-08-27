---
name: hmac-verify
description: Verify HMAC-SHA256 signature matches payload
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Verify HMAC-SHA256 signature matches payload

中文：校验 HMAC-SHA256 签名是否匹配

## When to use

- Human or agent needs **HMAC Verify** (`hash/hmac-verify`).
- Tier: `core` · side-effect: `pure` · meter: `forge.hash.hmac_verify`.

## How to invoke

```http
POST /api/v1/tools/invoke/hash/hmac-verify
Content-Type: application/json

{"input":{"text":"hello"}}
```

MCP name: `hash__hmac-verify`

## Engine

- **crypto.createHmac** runtime
- Upstream: node:crypto

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
