---
name: yaml-diff
description: "Semantic YAML/JSON comparison: key order, quoting and indentation ignored; anchors, aliases and merge keys expanded; sequences matched by identity field; structured path + change-type output"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Semantic YAML/JSON comparison: key order, quoting and indentation ignored; anchors, aliases and merge keys expanded; sequences matched by identity field; structured path + change-type output

中文：语义化对比两份 YAML/JSON：忽略键顺序与引号缩进噪声，展开锚点/别名与合并键，按身份字段匹配序列项，输出带路径与类型的结构化变更

## When to use

- Human or agent needs **YAML Diff** (`data/yaml-diff`).
- Tier: `core` · side-effect: `pure` · meter: `forge.data.yaml_diff`.

## How to invoke

```http
POST /api/v1/tools/invoke/data/yaml-diff
Content-Type: application/json

{"input":{"text":"{\"a\":1}"}}
```

MCP name: `data__yaml-diff`

## Engine

- **nebutra-yaml-diff** 1.0.0
- Upstream: YAML 1.2.2 §10.2 Core Schema · YAML 1.2.2 §7.1 alias nodes · §8.1.1.2 block chomping · tag:yaml.org,2002:merge · RFC 8259 (JSON) · js-yaml 5.x parser

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
