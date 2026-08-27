import { SupportDeflector } from "../src/index";

const support = await SupportDeflector.open(".nebutra/support-deflector-example", {
  tenantId: "local",
});

try {
  process.stdout.write(
    `${JSON.stringify(
      await support.handleTicket({
        ticket: {
          id: "ticket_demo",
          tenantId: "local",
          customer: { id: "customer_1", email: "a@example.com", plan: "free" },
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
