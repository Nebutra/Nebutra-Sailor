---
name: list-set-compare
description: "Compare two lists: only-in-A, only-in-B, intersection, union, symmetric difference, plus duplicates and per-item counts. NFC-normalized, deterministic order."
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Compare two lists: only-in-A, only-in-B, intersection, union, symmetric difference, plus duplicates and per-item counts. NFC-normalized, deterministic order.

中文：对比两个列表：仅在 A / 仅在 B / 交集 / 并集 / 对称差，含重复项与逐项计数；NFC 归一化，顺序确定

## When to use

- Human or agent needs **Compare Two Lists (Set Diff)** (`text/list-set-compare`).
- Tier: `core` · side-effect: `pure` · meter: `forge.text.list_set_compare`.

## How to invoke

```http
POST /api/v1/tools/invoke/text/list-set-compare
Content-Type: application/json

{"input":{"text":"Hello Nebutra"}}
```

MCP name: `text__list-set-compare`

## Engine

- **list-set-compare** 1.0.0
- Upstream: Unicode 15.0 UAX #15 (NFC) + Unicode 15.0 §5.18 case mapping + ISO 80000-2:2019 set operations

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
