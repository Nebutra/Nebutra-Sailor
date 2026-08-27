import { SandboxRuntime } from "../src/index";

const runtime = SandboxRuntime.fromConfig();
const health = await runtime.doctor();

process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
