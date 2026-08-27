---
name: hash-compare
description: Constant-time compare two hashes or secrets
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Constant-time compare two hashes or secrets

中文：常量时间比对两个哈希/字符串是否一致

## When to use

- Human or agent needs **Hash Comparator** (`hash/hash-compare`).
- Tier: `core` · side-effect: `pure` · meter: `forge.hash.compare`.

## How to invoke

```http
POST /api/v1/tools/invoke/hash/hash-compare
Content-Type: application/json

{"input":{"text":"hello"}}
```

MCP name: `hash__hash-compare`

## Engine

- **timing-safe-equal** 0.1.0
- Upstream: constant-time string compare

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
