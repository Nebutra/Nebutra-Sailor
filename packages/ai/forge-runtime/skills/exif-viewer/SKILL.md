---
name: exif-viewer
description: Read photo EXIF (exifr preferred, pure JPEG fallback)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Read photo EXIF (exifr preferred, pure JPEG fallback)

中文：读取照片 EXIF（exifr 优先，JPEG 纯解析回落）

## When to use

- Human or agent needs **EXIF Viewer** (`image/exif-viewer`).
- Tier: `core` · side-effect: `pure` · meter: `forge.image.exif`.

## How to invoke

```http
POST /api/v1/tools/invoke/image/exif-viewer
Content-Type: application/json

{"input":{"text":"https://nebutra.com"}}
```

MCP name: `image__exif-viewer`

## Engine

- **exifr|jpeg-pure** 0.2.0
- Upstream: https://github.com/MikeKovarik/exifr + pure JPEG APP1

## Composition (next)

Chain these after a successful run when the job continues:

- `image/exif-strip` (MCP: `image__exif-strip`)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
