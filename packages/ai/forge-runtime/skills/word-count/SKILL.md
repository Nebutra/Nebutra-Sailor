---
name: word-count
description: Count words/characters for mixed CJK+Latin text. Use for essay limits, copy budgets, pre-token estimates.
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Counts words, characters (with/without spaces), CJK chars, lines, and paragraphs.

## How to invoke

```http
POST /api/v1/tools/text/word-count/invoke
{"input":{"text":"你好 world"}}
```

MCP tool name: `text__word-count`

## Engine

`Intl.Segmenter` when available (Unicode word segmentation).
