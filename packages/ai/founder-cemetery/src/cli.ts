import { FounderCemetery, readFounderCemeteryDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.FOUNDER_CEMETERY_ROOT ?? ".nebutra/founder-cemetery";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const cemetery = await FounderCemetery.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await cemetery.doctor(), null, 2)}\n`);
  } finally {
    await cemetery.close();
  }
} else if (command === "quickstart") {
  const cemetery = await FounderCemetery.open(root, { tenantId });
  try {
    const flow = await cemetery.startClosingFlow({
      companyId: "loop",
      companyName: "Loop",
      founderIds: ["alice"],
    });
    process.stdout.write(`${JSON.stringify(flow, null, 2)}\n`);
  } finally {
    await cemetery.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "founder-cemetery", entries: await readFounderCemeteryDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown founder-cemetery command: ${command}\n`);
  process.exitCode = 1;
}
