# landing-builder Capability Map

## Boundary

`landing-builder` is a play-product package. It turns BrandContext and product
copy into site artifacts and a deploy handoff manifest.

## Owns

- One-page landing Play declaration.
- Brand-aware HTML and theme assembly.
- Static preview handoff metadata.
- Deploy manifest that requires explicit later consent.

## Does Not Own

- BrandContext schema.
- Sandbox preview processes.
- External deploy credentials.
- Agent runtime state.

## Current Closure

- `pnpm landing-builder:doctor`
- `pnpm landing-builder:quickstart`
- `pnpm landing-builder:debug`
