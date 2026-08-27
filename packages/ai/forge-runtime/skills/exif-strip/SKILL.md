---
name: exif-strip
description: Remove EXIF, IPTC, XMP and comment metadata (GPS, capture time, device serial, embedded thumbnail) from JPEG/PNG/WebP without re-encoding pixels; orientation and colour profile are preserved
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Remove EXIF, IPTC, XMP and comment metadata (GPS, capture time, device serial, embedded thumbnail) from JPEG/PNG/WebP without re-encoding pixels; orientation and colour profile are preserved

中文：移除 JPEG/PNG/WebP 的 EXIF、IPTC、XMP 与注释元数据（GPS、拍摄时间、设备序列号、内嵌缩略图），像素不重新编码，方向与色彩配置保留

## When to use

- Human or agent needs **EXIF Metadata Remover** (`image/exif-strip`).
- Tier: `core` · side-effect: `pure` · meter: `forge.image.exif_strip`.

## How to invoke

```http
POST /api/v1/tools/invoke/image/exif-strip
Content-Type: application/json

{"input":{"text":"https://nebutra.com"}}
```

MCP name: `image__exif-strip`

## Engine

- **forge-metadata-splice** 1.0.0
- Upstream: CIPA DC-008-2019 (Exif 2.32) + TIFF 6.0 + ISO/IEC 10918-1 (JPEG) + ISO/IEC 15948 (PNG) + RFC 9649 (WebP) + IPTC IIM 4.2 + Adobe XMP Part 3

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
