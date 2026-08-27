---
name: env-diff
description: "Compare two .env files by key, not by line: added / removed / changed / commented-out, with secret redaction that still reports whether the secret changed"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Compare two .env files by key, not by line: added / removed / changed / commented-out, with secret redaction that still reports whether the secret changed

中文：按键名（而非行）对比两个 .env 文件：新增/缺失/变更/被注释，密钥可脱敏且仍报告是否变化

## When to use

- Human or agent needs **Env Diff** (`dev/env-diff`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.env_diff`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/env-diff
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__env-diff`

## Engine

- **nebutra-dotenv-parity** 1.0.0
- Upstream: dotenv file grammar (motdotla/dotenv parse rules) + IEEE Std 1003.1-2017 §8.1

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
