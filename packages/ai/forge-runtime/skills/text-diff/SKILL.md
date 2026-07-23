---
name: text-diff
description: Line-level unified diff between two texts using the jsdiff library.
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## Invoke

```http
POST /api/v1/tools/text/diff/invoke
{"input":{"left":"a\\nb","right":"a\\nc","context":3}}
```

MCP: `text__diff`

## Engine

https://github.com/kpdecker/jsdiff
