---
name: pdf-info
description: Read page count and document metadata via pdf-lib
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Read page count and document metadata via pdf-lib

中文：pdf-lib 读取页数与文档元数据

## When to use

- Human or agent needs **PDF Info** (`doc/pdf-info`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.pdf_info`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/pdf-info
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__pdf-info`

## Engine

- **pdf-lib** 1.x
- Upstream: https://github.com/Hopding/pdf-lib

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
