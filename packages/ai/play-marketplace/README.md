# @nebutra/play-marketplace

Controlled Play registry surface for validating, publishing, searching, and
installing SKILL.md Plays.

## Boundary

SKILL.md parsing belongs to `@nebutra/play-loader`. This package consumes that
parser and writes local registry/install artifacts. It does not own billing
deduction, remote registry transport, or verified review operations.

## Commands

```bash
pnpm play-marketplace:doctor
pnpm play-marketplace:quickstart
pnpm play-marketplace:debug
```

## Current Closure

- Play validation through play-loader.
- Controlled paid publishing gate.
- Local signed registry artifact.
- Search and install handoff.
- Quality metrics placeholders kept honest.
