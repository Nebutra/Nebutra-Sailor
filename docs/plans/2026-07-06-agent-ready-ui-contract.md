# Agent-Ready UI Contract

**Status:** Implemented through CLI/MCP contract closure  
**Date:** 2026-07-06  
**Owner:** Design Systems  
**Scope:** `@nebutra/ui`, `@nebutra/tokens`, `apps/design-docs`, UI governance tooling

## Context

Astryx is useful to Nebutra less as a runtime component dependency and more as
an architecture pattern: a design system that exposes machine-readable
components, templates, docs, conventions, and migration hints to agents.

Nebutra already owns the right runtime foundation:

- `@nebutra/tokens` is the runtime token authority.
- `@nebutra/ui` is the component and product-pattern authority.
- `apps/design-docs` hosts docs, registry manifests, and governance surfaces.
- `ui:verify-governance` guards token, motion, story, export, and dependency
  boundaries.

The missing layer is an agent-facing contract that lets coding agents discover
what to use, how to use it, whether it is production-ready, and what evidence
backs that claim.

## Decision

Build a Nebutra-owned **agent-ready UI contract** on top of the existing
registry pipeline. Do not adopt Astryx as a runtime dependency or replace the
Nebutra design system.

The first production artifact is generated from the same source as the public
registry:

- `apps/design-docs/public/agent-manifest.json`
- `apps/design-docs/public/agent/components/<name>.json`

These files are machine-readable contracts, not a new design authority. They
summarize source, docs metadata, registry metadata, token usage, dependencies,
states, accessibility claims, and migration hooks that are already owned by
source, MDX, Storybook, and token packages.

## Goals

1. Make `@nebutra/ui` discoverable by agents without scraping docs pages.
2. Keep registry, docs, Storybook, and source aligned through generated
   metadata.
3. Give agents a stable JSON contract for search, component lookup, template
   generation, validation, and future MCP integration.
4. Require production components to expose maturity, evidence, and governance
   status before agents recommend them.
5. Provide a path for future `nebutra ui` CLI and UI MCP tools without changing
   the runtime component model.

## Non-Goals

- Do not import `@astryxdesign/core` into production apps.
- Do not introduce StyleX or a second token/theme authority.
- Do not make public registry JSON the internal source of truth.
- Do not generate arbitrary page UI from templates without state, dependency,
  and governance metadata.

## Contract Shape

The top-level manifest is optimized for discovery:

```json
{
  "name": "nebutra-ui-agent",
  "version": 1,
  "generatedAt": "2026-07-06",
  "homepage": "https://ui.nebutra.com",
  "commands": [
    { "name": "search", "description": "Find components and templates" },
    { "name": "component", "description": "Read one component contract" },
    { "name": "validate", "description": "Check component evidence" }
  ],
  "components": []
}
```

Each component contract is optimized for safe generation:

```json
{
  "name": "button",
  "title": "Button",
  "status": "stable",
  "maturity": "canonical",
  "source": "packages/design/ui/src/primitives/button.tsx",
  "imports": {
    "package": "@nebutra/ui/primitives",
    "registry": "https://ui.nebutra.com/r/button.json"
  },
  "evidence": {
    "docs": true,
    "storybook": true,
    "registry": true,
    "tokens": true
  },
  "usage": {
    "recommended": "Use package imports inside Nebutra apps; use registry only for standalone consumers.",
    "antiPatterns": []
  }
}
```

## Governance Rules

1. Agent contracts are generated from source metadata and registry output.
2. A public component may not be marked `canonical` without source, docs,
   Storybook, registry, and token evidence.
3. Component API changes must add migration hints before templates or agents
   can recommend the new API.
4. Templates must declare required components, state assumptions, slot
   ownership, and unsupported contexts.
5. Future MCP tools must read the agent contract instead of scraping rendered
   docs or importing package internals.

## Phases

### Phase 1: Generated Agent Manifest

- Extend `packages/design/ui/scripts/build-registry.ts`.
- Emit top-level and per-component agent JSON.
- Add generated outputs to `apps/design-docs/turbo.json`.
- Verify JSON generation through `@nebutra/design-docs build:registry`.

### Phase 2: CLI

Add `nebutra ui` commands:

- `nebutra ui search <query> --json`
- `nebutra ui component <name> --json`
- `nebutra ui validate <name>`
- `nebutra ui template <name> --json`

The CLI must read the generated agent contract and fail closed when evidence is
missing.

Implemented:

- `nebutra ui search [query] --format json`
- `nebutra ui component <name> --format json`
- `nebutra ui validate [name] --format json`
- `nebutra ui migrate <name> --format json`

`template` remains intentionally unimplemented until template contracts exist.

### Phase 3: MCP

Expose the same contract through MCP tools:

- `nebutra_ui_search_components`
- `nebutra_ui_get_component`
- `nebutra_ui_validate_component`
- `nebutra_ui_get_migration_hints`

The MCP server remains an adapter over the manifest. It is not a second source
of truth.

### Phase 4: Codemods And Migration Hints

Add structured migration entries for breaking component API changes and common
anti-patterns, then wire them into `nebutra ui migrate --dry-run`.

Implemented:

- Every component contract carries `migration.requiredForBreakingChanges`.
- Every component contract carries migration `hints`.
- `nebutra ui migrate <name>` emits the dry-run plan.
- MCP exposes the same payload through `nebutra_ui_get_migration_hints`.

## Acceptance Criteria

- `pnpm --filter @nebutra/design-docs build:registry` emits agent manifests.
- The generated top-level manifest includes every registry component.
- Every per-component contract includes source, import guidance, evidence, and
  governance metadata.
- Generated files are deterministic.
- Existing registry output remains compatible with shadcn consumers.
