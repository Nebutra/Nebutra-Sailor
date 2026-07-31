---
name: iban
description: "Validate an IBAN per ISO 13616: structure, per-country length and the MOD 97-10 check digits (offline, never stored)"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Validate an IBAN per ISO 13616: structure, per-country length and the MOD 97-10 check digits (offline, never stored)

中文：按 ISO 13616 校验 IBAN：结构、国别长度与 MOD 97-10 校验位（离线、不存储）

## When to use

- Human or agent needs **IBAN Validator** (`finance/iban`).
- Tier: `core` · side-effect: `pure` · meter: `forge.finance.iban`.

## How to invoke

```http
POST /api/v1/tools/invoke/finance/iban
Content-Type: application/json

{"input":{}}
```

MCP name: `finance__iban`

## Engine

- **iban-mod97** 0.1.0
- Upstream: ISO 13616-1:2020 (structure + check digits) / ISO/IEC 7064 MOD 97-10

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
