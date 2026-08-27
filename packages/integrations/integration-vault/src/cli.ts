import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { IntegrationVault } from "./index";

const command = process.argv[2] ?? "doctor";
const tenantId = process.env.TENANT_ID ?? "local";
const statePath = join(process.cwd(), ".nebutra", "debug", "integration-vault.jsonl");
const vault = IntegrationVault.local();

async function appendState(entry: Record<string, unknown>): Promise<void> {
  await writeFile(statePath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  }).catch(async (error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(dirname(statePath), { recursive: true }),
    );
    await writeFile(statePath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
      flag: "a",
    });
  });
}

try {
  if (command === "doctor") {
    process.stdout.write(
      `${JSON.stringify({ capability: "integration-vault", ...(await vault.doctor()) }, null, 2)}\n`,
    );
  } else if (command === "connect") {
    const app = process.argv[3];
    if (!app) throw new Error("Missing app name");
    const flow = await vault.startOAuth({ app, tenantId });
    await appendState({ type: "connect", app, tenantId, flow });
    process.stdout.write(
      `${JSON.stringify({ capability: "integration-vault", auth_url: flow.url, state: flow.state }, null, 2)}\n`,
    );
  } else if (command === "list") {
    process.stdout.write(
      `${JSON.stringify({ capability: "integration-vault", connections: await vault.list(tenantId) }, null, 2)}\n`,
    );
  } else if (command === "debug") {
    const raw = await readFile(statePath, "utf8").catch(() => "");
    const entries = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown);
    process.stdout.write(
      `${JSON.stringify({ capability: "integration-vault", entries }, null, 2)}\n`,
    );
  } else {
    process.stderr.write(`Unknown integration-vault command: ${command}\n`);
    process.exitCode = 1;
  }
} finally {
  await vault.close();
}
