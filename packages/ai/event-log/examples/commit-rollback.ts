import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventLog } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "event-log-"));
const log = await EventLog.open(root, { tenantId: "demo" });
const id = await log.commit({
  traceId: "trace_1",
  kind: "tool_call",
  affected: ["hello.md"],
  parent: null,
  snapshot: { "hello.md": "hi" },
});

const rollback = await log.rollbackTo(id);
process.stdout.write(`${JSON.stringify(rollback, null, 2)}\n`);
