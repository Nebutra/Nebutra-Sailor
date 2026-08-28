---
name: dns-leak
description: Authority-zone system-DNS recursive capture + multi-resolver + browser DoH/WebRTC; honest degrade when no hits, no fake Geo/ASN
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Authority-zone system-DNS recursive capture + multi-resolver + browser DoH/WebRTC; honest degrade when no hits, no fake Geo/ASN

中文：权威区系统 DNS 递归捕获 + 多解析器路径 + 浏览器 DoH/WebRTC；无命中时诚实降级，不伪造 Geo/ASN

## When to use

- Human or agent needs **DNS Leak Check** (`net/dns-leak`).
- Tier: `core` · side-effect: `pure` · meter: `forge.net.dns_leak`.

## How to invoke

```http
POST /api/v1/tools/invoke/net/dns-leak
Content-Type: application/json

{"input":{}}
```

MCP name: `net__dns-leak`

## Engine

- **node:dns.Resolver+browser-probes** runtime
- Upstream: https://nodejs.org/api/dns.html

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
