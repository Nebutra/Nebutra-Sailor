---
name: my-ip
description: Show client IP and key headers as seen by Forge (host-injected; no fake geo)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Show client IP and key headers as seen by Forge (host-injected; no fake geo)

中文：查看请求到达 Forge 时的客户端 IP 与关键头（由主机注入，不含虚假 Geo）

## When to use

- Human or agent needs **My IP** (`net/my-ip`).
- Tier: `core` · side-effect: `pure` · meter: `forge.net.my_ip`.

## How to invoke

```http
POST /api/v1/tools/invoke/net/my-ip
Content-Type: application/json

{"input":{}}
```

MCP name: `net__my-ip`

## Engine

- **request-headers** 0.1.0
- Upstream: Forge host injects connection metadata

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
