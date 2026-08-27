---
name: docx-text
description: Extract plain text from .docx (ZIP + document.xml, no Office suite)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Extract plain text from .docx (ZIP + document.xml, no Office suite)

中文：从 .docx 提取纯文本（ZIP + document.xml，无需 Office）

## When to use

- Human or agent needs **DOCX Text Extract** (`doc/docx-text`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.docx_text`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/docx-text
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__docx-text`

## Engine

- **pure-zip** 0
- Upstream: Node zlib inflateRaw + OOXML document.xml

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
