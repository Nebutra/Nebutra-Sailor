---
name: loan-amortization
description: "Fixed-payment loan schedule: per-period interest, principal and balance, total interest, early payoff with extra payments, and the crossover period where principal first exceeds interest"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Fixed-payment loan schedule: per-period interest, principal and balance, total interest, early payoff with extra payments, and the crossover period where principal first exceeds interest

中文：按等额本息公式生成逐期还款计划：每期利息/本金/余额、总利息、提前还款后的提前结清期数，以及本金首次超过利息的交叉点

## When to use

- Human or agent needs **Loan Amortization Schedule** (`finance/loan-amortization`).
- Tier: `core` · side-effect: `pure` · meter: `forge.finance.loan_amortization`.

## How to invoke

```http
POST /api/v1/tools/invoke/finance/loan-amortization
Content-Type: application/json

{"input":{}}
```

MCP name: `finance__loan-amortization`

## Engine

- **annuity-amortization** 0.1.0
- Upstream: Fixed-payment (annuity) amortization, nominal APR convention r = annualRate/12, integer-cent arithmetic with forced final-period payoff

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
