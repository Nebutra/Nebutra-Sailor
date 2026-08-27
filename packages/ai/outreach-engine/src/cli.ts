import { OutreachEngine, readOutreachEngineDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.OUTREACH_ENGINE_ROOT ?? ".nebutra/outreach-engine";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const engine = await OutreachEngine.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await engine.doctor(), null, 2)}\n`);
  } finally {
    await engine.close();
  }
} else if (command === "quickstart") {
  const engine = await OutreachEngine.open(root, { tenantId });
  try {
    process.stdout.write(
      `${JSON.stringify(
        await engine.createCampaign({
          tenantId,
          icpDescription:
            process.argv.slice(3).join(" ") ||
            "decision makers at mid-size D2C e-commerce companies",
          targetCount: 10,
          product: "Loop helps teams debug production issues",
          sequenceLength: 3,
          sendPerDay: 5,
          senderEmails: ["founder@loop.test"],
          complianceProfile: {
            physicalAddress: "123 Market St, San Francisco, CA",
            unsubscribeUrl: "https://loop.test/unsubscribe",
            gdprBasis: "legitimate_interest",
          },
        }),
        null,
        2,
      )}\n`,
    );
  } finally {
    await engine.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "outreach-engine", entries: await readOutreachEngineDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown outreach-engine command: ${command}\n`);
  process.exitCode = 1;
}
