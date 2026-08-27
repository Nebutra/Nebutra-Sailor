---
name: image-meta
description: Read width/height/format/orientation via sharp (EXIF buffer summary)
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Read width/height/format/orientation via sharp (EXIF buffer summary)

中文：sharp 读取宽高/格式/方向等（EXIF 缓冲摘要）

## When to use

- Human or agent needs **Image Metadata** (`image/image-meta`).
- Tier: `core` · side-effect: `pure` · meter: `forge.image.meta`.

## How to invoke

```http
POST /api/v1/tools/invoke/image/image-meta
Content-Type: application/json

{"input":{"text":"https://nebutra.com"}}
```

MCP name: `image__image-meta`

## Engine

- **sharp** 0.34.x
- Upstream: lovell/sharp

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
