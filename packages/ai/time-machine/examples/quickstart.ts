import { TimeMachine } from "../src/index";

const machine = await TimeMachine.open(".nebutra/time-machine-example", { tenantId: "local" });

try {
  const view = await machine.timelineView();
  process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
} finally {
  await machine.close();
}
