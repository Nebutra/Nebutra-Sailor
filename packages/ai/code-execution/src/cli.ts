import { CodeExecutor, readExecutionDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const exec = new CodeExecutor({ tenantId: process.env.NEBUTRA_TENANT_ID ?? "local" });

if (command === "doctor") {
  process.stdout.write(`${JSON.stringify(await exec.doctor(), null, 2)}\n`);
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "code-execution", entries: await readExecutionDebug() }, null, 2)}\n`,
  );
} else if (command === "policy") {
  const rules = exec.policy().map((rule) => ({
    ...rule,
    match: rule.match instanceof RegExp ? rule.match.source : rule.match,
  }));
  process.stdout.write(`${JSON.stringify({ capability: "code-execution", rules }, null, 2)}\n`);
} else if (command === "replay") {
  const actionId = process.argv[3];
  const entries = await readExecutionDebug(process.cwd(), 100);
  const entry = entries.find((item) => {
    if (!item || typeof item !== "object") return false;
    const value = item as { action?: { actionId?: string }; observation?: { actionId?: string } };
    return value.action?.actionId === actionId || value.observation?.actionId === actionId;
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "code-execution",
        actionId,
        replayable: Boolean(entry),
        entry,
        suggestion: entry
          ? "Use the stored action payload as the deterministic replay input."
          : "Run `pnpm exec:debug` and choose an action id from the recent log.",
      },
      null,
      2,
    )}\n`,
  );
} else {
  process.stderr.write(`Unknown code-execution command: ${command}\n`);
  process.exitCode = 1;
}
