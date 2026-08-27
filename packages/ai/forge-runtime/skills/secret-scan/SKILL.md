---
name: secret-scan
description: Paste a .env, config, log or code snippet and find API keys, tokens and private keys — vendor patterns plus entropy and variable-name context, values masked by default, read-only and never verified against any vendor
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Paste a .env, config, log or code snippet and find API keys, tokens and private keys — vendor patterns plus entropy and variable-name context, values masked by default, read-only and never verified against any vendor

中文：粘贴 .env、配置、日志或代码，检出疑似 API Key / Token / 私钥：正则指纹 + 熵值 + 变量名上下文，只读不验证，命中值默认脱敏并给出行号

## When to use

- Human or agent needs **Secret & API Key Scanner** (`dev/secret-scan`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.secret_scan`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/secret-scan
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__secret-scan`

## Engine

- **forge-secret-scan** 1.0.0
- Upstream: gitleaks rule corpus (github.com/gitleaks/gitleaks, MIT) — vendor-prefix patterns · Shannon entropy (C. E. Shannon, A Mathematical Theory of Communication, 1948) · RFC 7519 (JWT) · RFC 7468 (PEM textual encodings) · RFC 3986 §3.2.1 (userinfo in URIs)

## Composition (next)

Chain these after a successful run when the job continues:

- `security/secret-generate` (MCP: `security__secret-generate`)
- `security/password-generate` (MCP: `security__password-generate`)

## Batch

This tool supports the Processor batch surface (`resultKind=json`, accept=`files`).

- MCP: `forge.batch.create` with `toolId: "dev/secret-scan"`
- Poll: `forge.batch.get`
## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
