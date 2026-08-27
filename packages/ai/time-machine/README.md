# @nebutra/time-machine

Status: **WIP**

Chronos product surface for founder-facing timeline views, branches, comparisons,
annotations, and rollback dry-runs.

## Boundary

`time-machine` does not own historical truth. Event truth stays in
`@nebutra/event-log`; this package projects it into product data and writes only
annotation artifacts to `@nebutra/content-store`.

## Commands

```bash
pnpm time-machine:doctor
pnpm time-machine:quickstart
pnpm time-machine:debug
```

## Current Closure

- Timeline projection over event-log.
- Branch creation through event-log.
- Compare narrative over affected assets.
- Rollback dry-run only.
- Star annotations as content-store artifacts.
