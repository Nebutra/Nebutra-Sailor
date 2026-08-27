# play-marketplace Capability Map

## Boundary

`play-marketplace` is an ecosystem-product package. It validates SKILL.md Plays
through play-loader and writes local registry/install artifacts.

## Owns

- Play publish validation flow.
- Controlled paid publishing gate.
- Registry artifact metadata.
- Install handoff records.
- Honest usage metric placeholders.

## Does Not Own

- SKILL.md parsing.
- Billing deduction.
- Remote registry transport.
- Verified review operations.

## Current Closure

- `pnpm play-marketplace:doctor`
- `pnpm play-marketplace:quickstart`
- `pnpm play-marketplace:debug`
