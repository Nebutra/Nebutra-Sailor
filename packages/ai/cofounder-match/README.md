# @nebutra/cofounder-match

Status: **WIP**

Behavior-derived founder profiles, explainable cofounder matching, and
mutual-consent introduction records.

## Boundary

This package does not own chat transport, identity providers, or social graph
truth. It writes profile and match artifacts only after real activity and mutual
consent checks.

## Commands

```bash
pnpm cofounder-match:doctor
pnpm cofounder-match:quickstart
pnpm cofounder-match:debug
```

## Current Closure

- 30-day activity gate.
- Skill complementarity scoring.
- Visible `why` explanations.
- Mutual-interest-only chat handoff.
- Local profile and intro artifacts.
