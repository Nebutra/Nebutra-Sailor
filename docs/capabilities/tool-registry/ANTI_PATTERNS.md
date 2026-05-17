# tool-registry Anti-patterns

## New file format

Do not invent a Nebutra-only skill format. `SKILL.md` is the compatibility boundary.

## Loading every body

Only frontmatter belongs in the initial list. Markdown bodies are loaded after selection.

## Duplicated capability facts

One capability belongs to one skill. If two skills describe the same operation, merge them.

## Direct unmanaged writes

Skill files should be written through the registry/content-store contract so the index and debug log stay coherent.

## Hidden tools

Allowed tools and MCP servers must be declared in frontmatter. Do not bury tool requirements inside prose.
