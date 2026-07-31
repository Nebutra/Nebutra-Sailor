---
name: line-ending-detect
description: Detect LF / CRLF / CR with per-style counts and ratios, the dominant style, the stray line numbers, trailing-newline state and UTF-8 BOM — read-only, never rewrites
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Detect LF / CRLF / CR with per-style counts and ratios, the dominant style, the stray line numbers, trailing-newline state and UTF-8 BOM — read-only, never rewrites

中文：检测 LF / CRLF / CR：分别计数与占比、主导风格、混用行号、文件末尾换行与 UTF-8 BOM；只检测不改写

## When to use

- Human or agent needs **Line Ending Detector** (`text/line-ending-detect`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.line_ending_detect`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/line-ending-detect
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__line-ending-detect`

## Engine

- **forge-line-ending-scan** 1.0.0
- Upstream: IEEE Std 1003.1-2017 (POSIX) line/newline definitions · The Unicode Standard 15.0 §5.8 Newline Guidelines · §23.8 + RFC 3629 §6 (UTF-8 BOM) · RFC 3629 §4 (well-formed UTF-8)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
