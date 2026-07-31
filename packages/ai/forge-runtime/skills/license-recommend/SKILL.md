---
name: license-recommend
description: "One-step scenario triage: a recommended license with its rationale, permissions/conditions/limitations and alternates, by SPDX id"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

One-step scenario triage: a recommended license with its rationale, permissions/conditions/limitations and alternates, by SPDX id

中文：一步场景三分诊：按用途给出推荐许可证、理由、权限/条件/限制与备选方案（SPDX id）

## When to use

- Human or agent needs **Open Source License Chooser** (`template/license-recommend`).
- Tier: `core` · side-effect: `pure` · meter: `forge.template.license_recommend`.

## How to invoke

```http
POST /api/v1/tools/invoke/template/license-recommend
Content-Type: application/json

{"input":{}}
```

MCP name: `template__license-recommend`

## Engine

- **SPDX License List** e4c1f27 (2026-07-16)
- Upstream: spdx/license-list-data (texts + identifiers); decision table per docs/plans/tools/license-chooser.md §9.1

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
