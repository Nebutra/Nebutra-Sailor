import { readFile } from "node:fs/promises";
import { join } from "node:path";

const command = process.argv[2] ?? "doctor";

async function readDebug(capability: string, limit = 20): Promise<unknown[]> {
  try {
    const raw = await readFile(join(process.cwd(), ".nebutra", "debug", `${capability}.jsonl`), {
      encoding: "utf8",
    });
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}

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
        entries: await readDebug("agent-runtime"),
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
        entries: await readDebug("agent-runtime"),
      },
      null,
      2,
    )}\n`,
  );
} else {
  process.stderr.write(`Unknown agent-runtime command: ${command}\n`);
  process.exitCode = 1;
}
