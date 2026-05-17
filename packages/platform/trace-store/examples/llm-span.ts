import { TraceStore } from "../src/index";

const store = TraceStore.default();
const span = store.start("llm", "completion", { traceId: "example_trace", model: "local" });

span.end({ inputTokens: 4, outputTokens: 3 });
await store.flush();

process.stdout.write("llm span flushed\n");
