---
name: pdf-text
description: Extract PDF text via pdftotext (poppler); fails honestly if missing
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Extract PDF text via pdftotext (poppler); fails honestly if missing

中文：pdftotext（poppler）提取 PDF 文本；无二进制则诚实失败

## When to use

- Human or agent needs **PDF Text Extract** (`doc/pdf-text`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.pdf_text`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/pdf-text
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__pdf-text`

## Engine

- **pdftotext** host
- Upstream: poppler-utils pdftotext

## Composition (next)

Chain these after a successful run when the job continues:

- `llm/router-translate` (MCP: `llm__router-translate`)
- `llm/token-count` (MCP: `llm__token-count`)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
