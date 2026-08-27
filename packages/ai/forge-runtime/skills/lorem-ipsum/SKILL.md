---
name: lorem-ipsum
description: Generate classic Lorem Ipsum placeholder text
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Generate classic Lorem Ipsum placeholder text

中文：生成占位假文（经典 Lorem 词库）

## When to use

- Human or agent needs **Lorem Ipsum Generator** (`text/lorem-ipsum`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.lorem_ipsum`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/lorem-ipsum
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__lorem-ipsum`

## Engine

- **lorem-classic** 0.1.0
- Upstream: public-domain lorem word list

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
