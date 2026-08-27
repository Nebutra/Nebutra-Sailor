---
name: secret-generate
description: Generate hex/base64url API secrets
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Generate hex/base64url API secrets

中文：生成 hex/base64url API 密钥

## When to use

- Human or agent needs **Secret Key Generator** (`security/secret-generate`).
- Tier: `core` · side-effect: `pure` · meter: `forge.security.secret_generate`.

## How to invoke

```http
POST /api/v1/tools/invoke/security/secret-generate
Content-Type: application/json

{"input":{"text":"hello"}}
```

MCP name: `security__secret-generate`

## Engine

- **crypto.randomBytes** runtime
- Upstream: node:crypto

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
