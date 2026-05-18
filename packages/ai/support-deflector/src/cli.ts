import { readSupportDeflectorDebug, SupportDeflector } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.SUPPORT_DEFLECTOR_ROOT ?? ".nebutra/support-deflector";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

if (command === "doctor") {
  const support = await SupportDeflector.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await support.doctor(), null, 2)}\n`);
  } finally {
    await support.close();
  }
} else if (command === "quickstart") {
  const support = await SupportDeflector.open(root, { tenantId });
  try {
    process.stdout.write(
      `${JSON.stringify(
        await support.handleTicket({
          ticket: {
            id: "ticket_demo",
            tenantId,
            customer: { id: "customer_demo", email: "demo@example.com", plan: "free" },
            subject: "How do refunds work?",
            body: "Can I get a refund if I cancel this week?",
          },
          articles: [
            {
              id: "kb_refund",
              title: "Refund policy",
              body: "Refunds are available within 14 days. Contact support with your account email.",
            },
          ],
          policy: { autoReplyThreshold: 0.82 },
        }),
        null,
        2,
      )}\n`,
    );
  } finally {
    await support.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "support-deflector", entries: await readSupportDeflectorDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown support-deflector command: ${command}\n`);
  process.exitCode = 1;
}
