---
name: tls-cert-inspect
description: "Connect to host:443 and read subject, SANs, validity, fingerprints"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Connect to host:443 and read subject, SANs, validity, fingerprints

中文：连接主机 443 读取证书主体、SAN、有效期与指纹

## When to use

- Human or agent needs **TLS Certificate Inspect** (`net/tls-cert-inspect`).
- Tier: `core` · side-effect: `pure` · meter: `forge.net.tls_cert`.

## How to invoke

```http
POST /api/v1/tools/invoke/net/tls-cert-inspect
Content-Type: application/json

{"input":{}}
```

MCP name: `net__tls-cert-inspect`

## Engine

- **node:tls** runtime
- Upstream: https://nodejs.org/api/tls.html

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
