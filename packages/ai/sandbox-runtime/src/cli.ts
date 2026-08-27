import { readSandboxDebug, SandboxRuntime } from "./index";

const command = process.argv[2] ?? "doctor";
const runtime = SandboxRuntime.fromConfig();

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "sandbox-runtime", results: await runtime.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "sandbox-runtime", entries: await readSandboxDebug() }, null, 2)}\n`,
  );
} else if (command === "plan") {
  const task = process.argv.slice(3).join(" ") || "echo sandbox ok";
  process.stdout.write(
    `${JSON.stringify({ capability: "sandbox-runtime", task, plan: runtime.plan({ cmd: task }) }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown sandbox-runtime command: ${command}\n`);
  process.exitCode = 1;
}
