import { SandboxRuntime } from "../src/index";

const runtime = SandboxRuntime.fromConfig();
const result = await runtime.exec({
  cmd: "echo sandbox ok",
  hints: { needsGpu: false },
  tenantId: "local",
  threadId: "example",
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
