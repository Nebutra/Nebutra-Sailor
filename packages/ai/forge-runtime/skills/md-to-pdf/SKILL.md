---
name: md-to-pdf
description: Convert Markdown to PDF via marked + Playwright Chromium print (SOTA). engine auto|playwright|simple.
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

POST /api/v1/tools/doc/md-to-pdf/invoke
{"input":{"markdown":"# Hi","title":"Doc","engine":"auto"}}

MCP: doc__md-to-pdf

Prefer engine=playwright when Chromium is installed. CJK depends on host fonts.
