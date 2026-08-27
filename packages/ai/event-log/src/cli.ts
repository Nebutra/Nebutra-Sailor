import { EventLog } from "./index";

const command = process.argv[2] ?? "doctor";
const log = await EventLog.open(process.env.EVENT_LOG_ROOT ?? ".nebutra/.chronos");

if (command === "doctor") {
  const timeline = await log.timeline();
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "event-log",
        ok: timeline.length > 0,
        events: timeline.length,
        ...(timeline.length === 0 && {
          suggestion: "Run the Layer 0 demo to create the first event.",
        }),
      },
      null,
      2,
    )}\n`,
  );
} else if (command === "timeline" || command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "event-log", events: await log.timeline() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown event-log command: ${command}\n`);
  process.exitCode = 1;
}
