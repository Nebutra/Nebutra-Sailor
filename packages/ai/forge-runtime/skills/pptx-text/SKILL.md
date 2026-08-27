---
name: pptx-text
description: Extract per-slide text outline from .pptx (ZIP + slide XML, no PowerPoint)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Extract per-slide text outline from .pptx (ZIP + slide XML, no PowerPoint)

中文：从 .pptx 提取每页文字大纲（ZIP + slide XML，无需 PowerPoint）

## When to use

- Human or agent needs **PPTX Outline Extract** (`doc/pptx-text`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.pptx_text`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/pptx-text
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__pptx-text`

## Engine

- **pure-zip** 0
- Upstream: Node zlib inflateRaw + OOXML a:t runs

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
