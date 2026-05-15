import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "{PRODUCT_NAME}" });

export const welcomeEmail = inngest.createFunction(
  { id: "welcome-email" },
  { event: "user/created" },
  async ({ event, step }) => {
    await step.run("send-welcome", async () => {
      // TODO: dispatch via @nebutra/email
      return { to: event.data.email };
    });
  },
);
