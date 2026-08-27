import { decideTicket } from "../src/index";

process.stdout.write(
  `${JSON.stringify(
    decideTicket(
      {
        id: "ticket_1",
        tenantId: "local",
        customer: { id: "customer_1", email: "a@example.com", plan: "free" },
        subject: "Refund",
        body: "How do refunds work?",
      },
      [
        {
          id: "kb_refund",
          title: "Refund policy",
          body: "Refunds are available within 14 days.",
        },
      ],
      { autoReplyThreshold: 0.82 },
    ),
    null,
    2,
  )}\n`,
);
