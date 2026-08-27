import { TraceStore } from "../src/index";

const store = TraceStore.default();
const span = store.start("tool", "sandbox_echo", { traceId: "example_trace", token: "hidden" });

span.end({ status: "ok" });
await store.flush();

process.stdout.write("tool span flushed\n");
