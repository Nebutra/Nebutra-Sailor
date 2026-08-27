---
name: unix-timestamp
description: Convert between unix timestamps and ISO dates; mode now|to_date|to_unix
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

POST /api/v1/tools/time/unix-timestamp/invoke
{"input":{"mode":"now"}}

MCP: time__unix-timestamp
