---
name: dns-lookup
description: Resolve A/AAAA/MX/TXT/NS/CNAME (Node dns; answers from the Forge host resolver)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Resolve A/AAAA/MX/TXT/NS/CNAME (Node dns; answers from the Forge host resolver)

中文：解析 A/AAAA/MX/TXT/NS/CNAME 等记录（Node dns，结果随 Forge 出口解析器）

## When to use

- Human or agent needs **DNS Lookup** (`net/dns-lookup`).
- Tier: `core` · side-effect: `pure` · meter: `forge.net.dns_lookup`.

## How to invoke

```http
POST /api/v1/tools/invoke/net/dns-lookup
Content-Type: application/json

{"input":{}}
```

MCP name: `net__dns-lookup`

## Engine

- **node:dns** runtime
- Upstream: https://nodejs.org/api/dns.html

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
