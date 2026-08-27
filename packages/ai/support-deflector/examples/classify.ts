import { classifyTicket } from "../src/index";

process.stdout.write(
  `${JSON.stringify(
    classifyTicket({
      id: "ticket_1",
      tenantId: "local",
      customer: { id: "customer_1", email: "a@example.com", plan: "enterprise" },
      subject: "Production bug",
      body: "I am angry because this broke production.",
    }),
    null,
    2,
  )}\n`,
);
