# @nebutra/idea-plaza

Opt-in idea publishing and fork lineage for Nebutra ecosystem artifacts.

## Boundary

Ideas are private by default. This package writes explicit public snapshots and
fork metadata; it does not expose private founder data or own a global registry
transport.

## Commands

```bash
pnpm idea-plaza:doctor
pnpm idea-plaza:quickstart
pnpm idea-plaza:debug
```

## Current Closure

- Sensitive-field scan before publish.
- Surface/detail/cloneable publication levels.
- Immutable local snapshot artifacts.
- Fork attribution always enabled.
- Cemetery warning metadata on cards.
