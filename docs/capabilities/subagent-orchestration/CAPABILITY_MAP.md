# subagent-orchestration Capability Map

## Decision

WRAP / EXTEND `@nebutra/agent-runtime`.

Subagent orchestration is a policy layer over briefs, dependency ordering, and
cost reporting. It does not own model calls, tool implementations, or parent
state mutation.

## Depends On

- `agent-loop`

## Mapping

| Need | Sailor location | Decision |
| --- | --- | --- |
| Subagent definition loading | `@nebutra/agent-runtime/subagents` | SKIP |
| Brief schema | `@nebutra/agent-runtime/orchestration` | PORT delta |
| Fan-out guard | `planSubagentDispatch` | PORT delta |
| Cost summary | `costReport` | WRAP |

## Current Gaps

- Compile-time fan-out independence is represented as runtime validation in TypeScript.
- Worker-pool execution remains host-injected.
