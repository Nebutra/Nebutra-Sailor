---
name: ean-upc-gtin
description: "Validate or calculate the GS1 check digit in bulk: GTIN-8/12/13/14, SSCC-18, GLN-13"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Validate or calculate the GS1 check digit in bulk: GTIN-8/12/13/14, SSCC-18, GLN-13

中文：批量校验或计算 GS1 标准校验位：GTIN-8/12/13/14、SSCC-18、GLN-13

## When to use

- Human or agent needs **EAN / UPC / GTIN Check Digit** (`life/ean-upc-gtin`).
- Tier: `core` · side-effect: `pure` · meter: `forge.life.ean_upc_gtin`.

## How to invoke

```http
POST /api/v1/tools/invoke/life/ean-upc-gtin
Content-Type: application/json

{"input":{}}
```

MCP name: `life__ean-upc-gtin`

## Engine

- **gs1-mod10** 1.0.0
- Upstream: GS1 General Specifications — standard check digit calculation for GS1 data structures (mod 10, 3/1 weighting anchored at the rightmost payload digit), applied to GTIN-8/12/13/14, SSCC and GLN

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Batch

This tool supports the Processor batch surface (`resultKind=json`, accept=`lines`).

- MCP: `forge.batch.create` with `toolId: "life/ean-upc-gtin"`
- Poll: `forge.batch.get`
## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
