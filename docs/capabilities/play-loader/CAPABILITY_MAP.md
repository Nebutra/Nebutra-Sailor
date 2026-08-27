# play-loader Capability Map

## Decision

PORT as `@nebutra/play-loader`, while reusing `@nebutra/tool-registry` as the
single owner of SKILL.md frontmatter parsing.

## Depends On

- `agent-loop`
- `tool-registry`
- `subagent-orchestration`

## Mapping

| Need | Sailor location | Decision |
| --- | --- | --- |
| SKILL.md metadata parser | `@nebutra/tool-registry` | SKIP |
| Play-specific metadata | `@nebutra/play-loader` | PORT delta |
| Play DAG ordering | `resolvePlayChain` | PORT delta |
| Local registry CLI | `PlayLoader` + `play:*` scripts | WRAP |

## Current Gaps

- Remote installs are intentionally restricted to `file:` sources.
- Runtime execution is not owned here; callers pass plays into `@nebutra/agent-runtime`.
