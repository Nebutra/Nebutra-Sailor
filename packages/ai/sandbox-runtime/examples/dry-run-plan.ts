import { SandboxRuntime } from "../src/index";

const runtime = SandboxRuntime.fromConfig();
const plan = runtime.plan({
  cmd: "echo sandbox ok",
  hints: { needsGpu: false, durationS: 1 },
});

process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
