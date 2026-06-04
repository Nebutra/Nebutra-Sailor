# @nebutra/tool-registry

SKILL.md registry with progressive disclosure and content-store backing.

This package parses, stores, indexes, lists, loads, and validates agent skill
documents. It is the package-level primitive behind Nebutra's tool and skill
surface, not a UI or model-runtime package.

## Installation

```bash
pnpm add @nebutra/tool-registry
```

## Usage

```ts
import { ToolRegistry } from "@nebutra/tool-registry";

const registry = await ToolRegistry.open(".nebutra/tools", {
  tenantId: "org_123",
});

await registry.writeSkill(
  "summarize_docs",
  [
    "---",
    "name: summarize_docs",
    "description: Summarize documentation files",
    "version: 1.0.0",
    "allowed_tools: []",
    "mcp_servers: []",
    "---",
    "",
    "## What this skill does",
    "",
    "Reads docs and returns a concise summary.",
  ].join("\n"),
);

const skills = await registry.list();
const skill = await registry.load("summarize_docs");
```

## API

| Export | Description |
| --- | --- |
| `ToolRegistry.open(root, options)` | Open a content-backed registry and reindex existing skills |
| `registry.writeSkill(name, markdown)` | Persist and index a `SKILL.md` document |
| `registry.newSkill(name)` | Create a starter skill document |
| `registry.reload()` | Reindex the skill directory |
| `registry.list()` | Return sorted skill metadata |
| `registry.load(name)` | Load one skill body and metadata |
| `registry.test(name)` | Run structural checks against a skill |
| `parseSkillFrontmatter(markdown)` | Parse required YAML frontmatter |
| `parseSkillMarkdown(markdown)` | Parse and validate a complete skill document |
| `readSkillDebug(limit)` | Read debug events for registry operations |

## Skill Metadata

Required frontmatter:

```yaml
---
name: summarize_docs
description: Summarize documentation files
version: 1.0.0
allowed_tools: []
mcp_servers: []
---
```

Optional fields include `inputs`, `outputs`, and `budget`.

## License

MIT
