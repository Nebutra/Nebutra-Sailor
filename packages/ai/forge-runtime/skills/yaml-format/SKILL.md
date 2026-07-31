---
name: yaml-format
description: Pretty-print or compact YAML via js-yaml
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Pretty-print or compact YAML via js-yaml

中文：js-yaml 美化 / 紧凑 YAML

## When to use

- Human or agent needs **YAML Formatter** (`data/yaml-format`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.yaml_format`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/yaml-format
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__yaml-format`

## Engine

- **js-yaml** 4.x
- Upstream: https://github.com/nodeca/js-yaml

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
