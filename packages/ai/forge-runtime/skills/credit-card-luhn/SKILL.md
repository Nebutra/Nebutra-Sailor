---
name: credit-card-luhn
description: Luhn algorithm check for card numbers (offline, never stored)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Luhn algorithm check for card numbers (offline, never stored)

中文：Luhn 算法校验卡号格式（不联网、不存储）

## When to use

- Human or agent needs **Credit Card Luhn Checker** (`finance/credit-card-luhn`).
- Tier: `core` · side-effect: `pure` · meter: `forge.finance.credit_card_luhn`.

## How to invoke

```http
POST /api/v1/tools/invoke/finance/credit-card-luhn
Content-Type: application/json

{"input":{}}
```

MCP name: `finance__credit-card-luhn`

## Engine

- **luhn** 0.1.0
- Upstream: ISO/IEC 7812 Luhn algorithm

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
