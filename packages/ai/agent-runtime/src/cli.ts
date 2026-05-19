import { readCapabilityDebug } from "@nebutra/capability-kit/debug";

const command = process.argv[2] ?? "doctor";

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "agent-runtime",
        ok: true,
        checks: ["thread-turn-item", "rollout-store", "pulsar-facade", "subagent-briefs"],
      },
      null,
      2,
    )}\n`,
  );
} else if (command === "debug" || command === "replay") {
  const threadId = process.argv[3];
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "agent-runtime",
        threadId,
        entries: await readCapabilityDebug("agent-runtime", { limit: 20 }),
        suggestion:
          "Use a RolloutStore-backed host to replay full thread events; this CLI reports local debug lines.",
      },
      null,
      2,
    )}\n`,
  );
} else if (command === "subagent-trace" || command === "subagent-cost") {
  const threadId = process.argv[3];
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "agent-runtime",
        command,
        threadId,
        entries: await readCapabilityDebug("agent-runtime", { limit: 20 }),
      },
      null,
      2,
    )}\n`,
  );
} else {
  process.stderr.write(`Unknown agent-runtime command: ${command}\n`);
  process.exitCode = 1;
}
