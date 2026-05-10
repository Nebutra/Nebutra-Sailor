/**
 * Resend email provider — production-grade transactional email.
 * Requires RESEND_API_KEY environment variable.
 */

import { Resend } from "resend";
import type { EmailProvider, SendOptions, SendResult } from "../provider";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend" as const;
  private client: Resend;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required for Resend provider");
    }
    this.client = new Resend(apiKey);
  }

  async send(opts: SendOptions): Promise<SendResult> {
    const { data, error } = await this.client.emails.send({
      from: opts.from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(opts.tags ? { tags: opts.tags } : {}),
    });

    if (error) {
      throw new Error(`Resend send failed: ${error.message}`);
    }

    return { id: data?.id ?? "unknown" };
  }
}
