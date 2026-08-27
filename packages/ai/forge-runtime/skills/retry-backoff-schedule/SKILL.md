---
name: retry-backoff-schedule
description: Expand a retry policy (exponential / linear / fixed, factor, cap, jitter, attempt budget) into a per-attempt delay and cumulative wait schedule — jitter as a min/expected/max range instead of one sampled draw, plus a verdict on whether the cumulative wait overruns your own timeout
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Expand a retry policy (exponential / linear / fixed, factor, cap, jitter, attempt budget) into a per-attempt delay and cumulative wait schedule — jitter as a min/expected/max range instead of one sampled draw, plus a verdict on whether the cumulative wait overruns your own timeout

中文：把重试策略（指数/线性/固定、倍数、上限、抖动、次数）展开成每次重试的延迟与累计等待；抖动给出最小/期望/最大区间而非单次采样，并判断累计等待是否超出调用方超时

## When to use

- Human or agent needs **Retry Backoff Schedule Simulator** (`dev/retry-backoff-schedule`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.retry_backoff_schedule`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/retry-backoff-schedule
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__retry-backoff-schedule`

## Engine

- **forge-retry-backoff-schedule** 1.0.0
- Upstream: AWS Architecture Blog "Exponential Backoff And Jitter" full/equal jitter pair (full = random(0,d); equal = d/2 + random(0,d/2)), as cited by k-lab.dev/retry's FAQ per brief §7 know-how #3 · retries.dev "Max Retries (excludes initial request)" attempt convention per know-how #1

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
