import { readTraceDebug, TraceStore } from "./index";

const command = process.argv[2] ?? "doctor";

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "trace-store", ...TraceStore.default().doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "trace-store", entries: await readTraceDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown trace-store command: ${command}\n`);
  process.exitCode = 1;
}
