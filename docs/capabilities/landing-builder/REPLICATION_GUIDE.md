# landing-builder Replication Guide

## Quickstart

```bash
pnpm landing-builder:doctor
pnpm landing-builder:quickstart "AI debugging for indie devs"
pnpm play:parse packages/ai/landing-builder/plays/one_pager/SKILL.md
```

## Expected Output

- `company/landing/index.html`
- `company/landing/theme.css`
- `company/landing/deploy.json`

The deploy file is a handoff manifest, not a hidden deploy side effect.
