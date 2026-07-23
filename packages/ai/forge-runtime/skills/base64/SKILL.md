---
name: base64
description: UTF-8 text Base64 encode/decode
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

POST /api/v1/tools/codec/base64/invoke
{"input":{"text":"hello","mode":"encode"}}

MCP: codec__base64
