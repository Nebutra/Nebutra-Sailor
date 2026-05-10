/**
 * Nodemailer email provider — SMTP-based, self-hosted fallback.
 * Requires SMTP_HOST (+ optional SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE).
 */

import type { EmailProvider, SendOptions, SendResult } from "../provider";

export interface NodemailerConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?:
    | {
        user: string;
        pass: string;
      }
    | undefined;
}

export class NodemailerEmailProvider implements EmailProvider {
  readonly name = "nodemailer" as const;
  private config: NodemailerConfig;
  private transporter: unknown;

  constructor(config: NodemailerConfig) {
    if (!config.host) {
      throw new Error("SMTP_HOST is required for Nodemailer provider");
    }
    this.config = config;
  }

  private async getTransporter() {
    if (this.transporter) return this.transporter;

    // Lazy import to avoid requiring nodemailer when using other providers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = await (import("nodemailer" as string) as Promise<{
      createTransport(opts: Record<string, unknown>): {
        sendMail(opts: Record<string, unknown>): Promise<{ messageId: string }>;
      };
    }>);
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      ...(this.config.auth ? { auth: this.config.auth } : {}),
    });
    return this.transporter;
  }

  async send(opts: SendOptions): Promise<SendResult> {
    const transporter = (await this.getTransporter()) as {
      sendMail(opts: Record<string, unknown>): Promise<{ messageId: string }>;
    };

    const info = await transporter.sendMail({
      from: opts.from,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(opts.tags?.length
        ? {
            headers: {
              "X-Email-Tags": opts.tags.map((t) => `${t.name}=${t.value}`).join(", "),
            },
          }
        : {}),
    });

    return { id: info.messageId };
  }
}
