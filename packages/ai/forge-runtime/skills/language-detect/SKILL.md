---
name: language-detect
description: "Identify the language of a filename-less code snippet: three-tier confidence plus a 0-100 score, explicit data-format verdict, multi-language paste flag, and Linguist-style disambiguation when a filename hint is supplied"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Identify the language of a filename-less code snippet: three-tier confidence plus a 0-100 score, explicit data-format verdict, multi-language paste flag, and Linguist-style disambiguation when a filename hint is supplied

中文：识别无文件名代码片段的编程语言：三档置信度 + 0-100 分数、数据格式判定、多语言粘贴提示；可选文件名提示按 Linguist 规则消歧

## When to use

- Human or agent needs **Programming Language Detector** (`dev/language-detect`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.language_detect`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/language-detect
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__language-detect`

## Engine

- **forge-linguist-heuristics** 0.1.0
- Upstream: github-linguist detection strategy + heuristics.yml rule shape

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
