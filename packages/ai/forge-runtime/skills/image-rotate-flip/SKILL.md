---
name: image-rotate-flip
description: "Rotate an image by any angle and mirror it horizontally or vertically: multiples of 90° resample nothing, other angles choose expand / crop / fit, and EXIF orientation is resolved on load so the rotation you ask for is the rotation you see"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Rotate an image by any angle and mirror it horizontally or vertically: multiples of 90° resample nothing, other angles choose expand / crop / fit, and EXIF orientation is resolved on load so the rotation you ask for is the rotation you see

中文：按任意角度旋转、水平/垂直翻转图片：90 的倍数无重采样，非直角可选扩画布/裁切/缩放内嵌；加载时先解算 EXIF 方向，导出不留过期方向标签

## When to use

- Human or agent needs **Rotate & Flip Image** (`image/image-rotate-flip`).
- Tier: `core` · side-effect: `pure` · meter: `forge.image.image_rotate_flip`.

## How to invoke

```http
POST /api/v1/tools/invoke/image/image-rotate-flip
Content-Type: application/json

{"input":{"text":"https://nebutra.com"}}
```

MCP name: `image__image-rotate-flip`

## Engine

- **forge-image-rotate-flip** 1.0.0
- Upstream: CIPA DC-008-2019 (Exif 2.32) §4.6.4 tag 0x0112 Orientation values 1–8 · ISO/IEC 10918-1 (JPEG) · ISO/IEC 15948 (PNG) · RFC 9649 (WebP) · pixel work via libvips/sharp

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
