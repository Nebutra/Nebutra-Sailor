# agent-loop Capability Map

## Decision

WRAP / EXTEND existing `@nebutra/agent-runtime`.

Do not create a new package. The repo already owns Thread / Turn / Item, `runTurn`,
durable turns, rollout, tool dispatch, and sandbox seams in `packages/ai/agent-runtime`.
The Layer 2 delta is a `Pulsar` facade that composes those primitives into a
tenant-scoped start / resume / branch API.

## Depends On

- `tool-protocol`
- `tool-registry`
- `event-log`
- `trace-store`

Model execution remains injected. Production model calls stay with `@nebutra/agents`.

## Mapping

| Layer 2 need | Sailor location | Decision |
| --- | --- | --- |
| Thread / Turn / Item events | `@nebutra/agent-runtime/model` | SKIP |
| Model -> tool loop | `@nebutra/agent-runtime/loop` | SKIP |
| Durable replay | `@nebutra/agent-runtime/durable-turn` | WRAP |
| Item-level stream facade | `@nebutra/agent-runtime/pulsar` | PORT delta |
| Event-log branch seam | `PulsarEventLogPort` | WRAP |

## Current Gaps

- `Pulsar` uses injected ports and in-memory tests; production queue/store adapters are still host-owned.
- `pulsar:debug` reads local debug lines; full replay remains a RolloutStore-backed host responsibility.
