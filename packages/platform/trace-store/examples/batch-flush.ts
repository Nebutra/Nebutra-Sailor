import { TraceStore } from "../src/index";

const store = TraceStore.default();
const first = store.start("agent", "plan", { traceId: "example_trace" });
const second = store.start("tool", "write_file", { traceId: "example_trace" });

first.end({ outcome: "ok" });
second.end({ path: "hello.md" });
await store.flush();

process.stdout.write(`${JSON.stringify(store.doctor(), null, 2)}\n`);
