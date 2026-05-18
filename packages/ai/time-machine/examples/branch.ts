import { EventLog } from "@nebutra/event-log";
import { TimeMachine } from "../src/index";

const root = ".nebutra/time-machine-branch-example";
const tenantId = "local";
const eventLog = await EventLog.open(`${root}/event-log`, { tenantId });
const eventId = await eventLog.commit({
  traceId: "demo_decision",
  kind: "content_write",
  affected: ["company/BRAND.md"],
  parent: null,
  snapshot: { "company/BRAND.md": "name: Loop\npalette: blue\n" },
});
const machine = await TimeMachine.open(root, { tenantId });

try {
  process.stdout.write(
    `${JSON.stringify(await machine.branchFrom(eventId, "purple version"), null, 2)}\n`,
  );
} finally {
  await machine.close();
}
