import { TimeMachine } from "../src/index";

const machine = await TimeMachine.open(".nebutra/time-machine-example", { tenantId: "local" });

try {
  process.stdout.write(`${JSON.stringify(await machine.doctor(), null, 2)}\n`);
} finally {
  await machine.close();
}
