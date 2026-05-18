import { OutreachEngine } from "../src/index";

const engine = await OutreachEngine.open(".nebutra/outreach-engine-example", {
  tenantId: "local",
});

try {
  process.stdout.write(
    `${JSON.stringify(
      await engine.createCampaign({
        tenantId: "local",
        icpDescription: "decision makers at mid-size D2C e-commerce companies",
        targetCount: 10,
        product: "Loop helps teams debug production issues",
        sequenceLength: 3,
        sendPerDay: 5,
        senderEmails: ["founder@loop.test"],
        complianceProfile: {
          physicalAddress: "123 Market St",
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
