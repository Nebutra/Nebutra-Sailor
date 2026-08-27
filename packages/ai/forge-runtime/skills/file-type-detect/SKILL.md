---
name: file-type-detect
description: "Match a file's leading bytes against 180 signatures to name its true format; ZIP/ISO-BMFF/OLE2 containers are opened for real, and a lying extension is tiered benign / mismatch / high-risk"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Match a file's leading bytes against 180 signatures to name its true format; ZIP/ISO-BMFF/OLE2 containers are opened for real, and a lying extension is tiered benign / mismatch / high-risk

中文：读取文件头字节，比对 180 条签名，识别文件真实格式；ZIP/ISO-BMFF/OLE2 容器做真实内部读取，扩展名不符按 良性/不符/高风险 分级

## When to use

- Human or agent needs **File Type Detector (Magic Bytes)** (`dev/file-type-detect`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.file_type_detect`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/file-type-detect
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__file-type-detect`

## Engine

- **nebutra-magic-table** 1.0.0
- Upstream: File signature table compiled from format specifications (PNG ISO/IEC 15948, ISO/IEC 14496-12 ftyp, ZIP APPNOTE 6.3.x local file header, POSIX 1003.1 ustar at offset 257, ISO 9660 CD001 at 32769, ECMA-376 OOXML, ODF/EPUB stored mimetype member, JVMS §4.1 class file, ELF gABI, Mach-O)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
