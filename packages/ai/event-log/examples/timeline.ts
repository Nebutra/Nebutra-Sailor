import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventLog } from "../src/index";

const root = await mkdtemp(join(tmpdir(), "event-log-"));
const log = await EventLog.open(root, { tenantId: "demo" });

await log.commit({ traceId: "trace_1", kind: "llm_call", affected: [], parent: null });
await log.commit({ traceId: "trace_1", kind: "sandbox_exec", affected: [], parent: null });

process.stdout.write(`${JSON.stringify(await log.timeline(), null, 2)}\n`);
