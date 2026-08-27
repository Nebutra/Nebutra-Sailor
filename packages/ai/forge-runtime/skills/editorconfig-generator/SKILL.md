---
name: editorconfig-generator
description: Generate a spec-valid .editorconfig from glob sections, validate every property value, and flag the footguns (later section wins, utf-8-bom, indent_size vs tab_width); can also import an existing file
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Generate a spec-valid .editorconfig from glob sections, validate every property value, and flag the footguns (later section wins, utf-8-bom, indent_size vs tab_width); can also import an existing file

中文：按 glob 分节生成 .editorconfig，校验属性取值，并提示后声明分节覆盖前者等易错点；也可粘贴已有文件规范化导入

## When to use

- Human or agent needs **.editorconfig Generator** (`dev/editorconfig-generator`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.editorconfig_generator`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/editorconfig-generator
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__editorconfig-generator`

## Engine

- **EditorConfig File Format Specification** 0.17.x properties set
- Upstream: editorconfig.org specification (properties + wildcard patterns)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
