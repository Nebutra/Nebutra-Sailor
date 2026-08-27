# tool-registry Capability Map

## Decision

WRAP loader. Use the existing `SKILL.md` format and do not create a new play format.

## Depends on

- `tool-protocol`
- `content-store`

## Three-tier map

| Tier | Scope | Landing |
| --- | --- | --- |
| SKIP | New skill file format | Not allowed |
| WRAP | SKILL.md parser, progressive loader, hot reload entrypoint | `packages/ai/tool-registry` |
| PORT | Local distribution/test CLI | `packages/ai/tool-registry` |

## Public contract

- `ToolRegistry.open(root, { tenantId })`
- `registry.list()`
- `registry.load(name)`
- `registry.writeSkill(name, markdown)`
- `registry.newSkill(name)`
- `registry.test(name)`
- `registry.watch(onChange)`
- `pnpm skill:list`
- `pnpm skill:new <name>`
- `pnpm skill:test <name>`

## Progressive disclosure

`list()` returns frontmatter metadata only. `load(name)` reads the markdown body only when the agent selects the skill.

## Storage posture

Skill files are stored under the content-store file root for the tenant, so file content remains the source of truth and the SQLite index remains rebuildable.
