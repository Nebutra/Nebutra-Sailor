---
name: unified-social-credit-code
description: "Field-level validation of China's 18-character unified social credit code per GB 32100-2015 (ISO 7064 MOD 31-3 check digit, GB/T 2260 division, department and category tables), plus seeded reproducible test-code generation"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Field-level validation of China's 18-character unified social credit code per GB 32100-2015 (ISO 7064 MOD 31-3 check digit, GB/T 2260 division, department and category tables), plus seeded reproducible test-code generation

中文：按 GB 32100-2015 逐字段校验统一社会信用代码（ISO 7064 MOD 31-3 校验码、GB/T 2260 行政区划、登记管理部门与机构类别），并可按种子生成可复现的测试代码

## When to use

- Human or agent needs **Unified Social Credit Code Validator** (`cn/unified-social-credit-code`).
- Tier: `core` · side-effect: `pure` · meter: `forge.cn.unified_social_credit_code`.

## How to invoke

```http
POST /api/v1/tools/invoke/cn/unified-social-credit-code
Content-Type: application/json

{"input":{}}
```

MCP name: `cn__unified-social-credit-code`

## Engine

- **gb32100-uscc** GB 32100-2015
- Upstream: GB 32100-2015 + GB/T 17710 (ISO 7064 MOD 31-3) + GB/T 2260 + GB 11714-1997

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
