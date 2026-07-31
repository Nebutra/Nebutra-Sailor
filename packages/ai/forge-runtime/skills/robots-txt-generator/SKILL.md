---
name: robots-txt-generator
description: "Generate an RFC 9309 robots.txt: default access, search-engine and AI-crawler groups, crawl-delay, sitemaps and path rules — with the group-precedence, empty-Disallow and trailing-slash traps flagged"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Generate an RFC 9309 robots.txt: default access, search-engine and AI-crawler groups, crawl-delay, sitemaps and path rules — with the group-precedence, empty-Disallow and trailing-slash traps flagged

中文：按 RFC 9309 生成 robots.txt：默认放行/拒绝、搜索引擎与 AI 抓取器分组、crawl-delay、sitemap、目录限制，并提示分组互斥、空 Disallow、尾斜杠等易错点

## When to use

- Human or agent needs **robots.txt Generator** (`dev/robots-txt-generator`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.robots_txt_generator`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/robots-txt-generator
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__robots-txt-generator`

## Engine

- **Robots Exclusion Protocol** RFC 9309 (2022-09)
- Upstream: RFC 9309 (+ sitemaps.org Sitemap directive)

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
