# event-log replication guide

```ts
import { EventLog } from "@nebutra/event-log";

const log = await EventLog.open(".nebutra/events", {
  tenantId: "local",
});

const id = await log.commit({
  traceId: "thread_1",
  kind: "tool_call",
  affected: ["hello.md"],
  parent: null,
  snapshot: { "hello.md": "hi" },
});

const rollback = await log.rollbackTo(id);
process.stdout.write(`${JSON.stringify(rollback, null, 2)}\n`);
```

## Goal

Record every agent action as an immutable event, store changed content by hash, and support rollback planning and branches.

## Run it

```bash
pnpm chronos:doctor
tsx packages/ai/event-log/examples/commit-rollback.ts
pnpm chronos:timeline
```

## Files to inspect

- `packages/ai/event-log/src/index.ts`
- `packages/ai/event-log/examples/timeline.ts`
- `.nebutra/debug/event-log.jsonl`

## Replication steps

1. Open a tenant-scoped log root.
2. Commit an event with affected paths and optional snapshot content.
3. Read the timeline.
4. Generate a rollback dry-run.
5. Branch from an event id when exploring alternatives.

## Expected result

The timeline is append-only, snapshot objects are content-addressed, and rollback returns a plan instead of mutating files.
