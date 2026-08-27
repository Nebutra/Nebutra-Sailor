---
name: json-format
description: Validate, pretty-print, or minify JSON with line/column errors on failure.
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Parses JSON via ECMAScript JSON.parse; formats or minifies; reports parse errors with line/column.

## How to invoke

```http
POST /api/v1/tools/data/json-format/invoke
{"input":{"text":"{\"a\":1}","mode":"format","indent":2}}
```

MCP: `data__json-format`

## Engine

JSON.parse / JSON.stringify (language standard).
