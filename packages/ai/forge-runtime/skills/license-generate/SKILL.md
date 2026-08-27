---
name: license-generate
description: "Ready-to-commit LICENSE by SPDX id: canonical text verbatim, copyright line filled, plus the SPDX source-file header"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Ready-to-commit LICENSE by SPDX id: canonical text verbatim, copyright line filled, plus the SPDX source-file header

中文：按 SPDX id 生成可直接提交的 LICENSE：规范原文逐字，仅替换著作权行，并附 SPDX 头注释

## When to use

- Human or agent needs **LICENSE File Generator** (`template/license-generate`).
- Tier: `core` · side-effect: `pure` · meter: `forge.template.license_generate`.

## How to invoke

```http
POST /api/v1/tools/invoke/template/license-generate
Content-Type: application/json

{"input":{}}
```

MCP name: `template__license-generate`

## Engine

- **SPDX License List** e4c1f27 (2026-07-16)
- Upstream: spdx/license-list-data — text/<id>.txt, vendored verbatim

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
