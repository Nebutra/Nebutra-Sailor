import { readTimeMachineDebug, TimeMachine } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.TIME_MACHINE_ROOT ?? ".nebutra/time-machine";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const machine = await TimeMachine.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await machine.doctor(), null, 2)}\n`);
  } finally {
    await machine.close();
  }
} else if (command === "quickstart") {
  const machine = await TimeMachine.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await machine.timelineView(), null, 2)}\n`);
  } finally {
    await machine.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "time-machine", entries: await readTimeMachineDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown time-machine command: ${command}\n`);
  process.exitCode = 1;
}
