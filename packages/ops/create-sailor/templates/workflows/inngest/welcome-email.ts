/**
 * Sample Inngest welcome-email function for scaffolds.
 *
 * Production path: swap the step body for `@nebutra/email` once the
 * generated project has a real email provider env (RESEND_API_KEY etc.):
 *
 *   import { sendEmail } from "@nebutra/email";
 *   await sendEmail({ to: event.data.email, template: "welcome", ... });
 *
 * Until then this is intentionally sample-only — returns the intended
 * recipient so the workflow is testable without sending mail.
 */
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "{PRODUCT_NAME}" });

export const welcomeEmail = inngest.createFunction(
  { id: "welcome-email" },
  { event: "user/created" },
  async ({ event, step }) => {
    await step.run("send-welcome", async () => {
      // Sample-only: do not send until @nebutra/email + provider keys are wired.
      return {
        to: event.data.email,
        status: "sample-only",
        hint: "Replace with sendEmail() from @nebutra/email",
      };
    });
  },
);
