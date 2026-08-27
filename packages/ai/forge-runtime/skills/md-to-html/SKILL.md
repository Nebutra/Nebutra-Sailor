---
name: md-to-html
description: Convert Markdown to HTML with marked
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Convert Markdown to HTML with marked

中文：marked 将 Markdown 转为 HTML 片段

## When to use

- Human or agent needs **Markdown to HTML** (`doc/md-to-html`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.md_to_html`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/md-to-html
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__md-to-html`

## Engine

- **marked** 15.x
- Upstream: https://github.com/markedjs/marked

## Composition (next)

Chain these after a successful run when the job continues:

- `doc/md-to-pdf` (MCP: `doc__md-to-pdf`)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
