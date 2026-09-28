import { brand } from "@nebutra/brand/metadata";
import { getBrandMailFrom } from "@nebutra/brand/metadata-helpers";
import { getEmailProvider } from "@nebutra/email";
import type { StatusMailContext } from "@nebutra/status";
import { statusOrigin } from "./status-checks";

/** The status core's mail output, sent through the app's one email provider. */
export function statusMailContext(): StatusMailContext {
  return {
    origin: statusOrigin(),
    pageName: brand.name,
    mailer: async (mail) => {
      await getEmailProvider().send({
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        from: process.env.EMAIL_FROM ?? getBrandMailFrom(),
        tags: [{ name: "type", value: "status" }],
      });
    },
  };
}
