/**
 * @nebutra/email — Provider abstraction
 *
 * Supports multiple email providers via auto-detection:
 *   1. EMAIL_PROVIDER env var (explicit)
 *   2. RESEND_API_KEY → Resend
 *   3. SMTP_HOST → Nodemailer
 *   4. Fallback → Console (dev/test)
 */

// ── Interface ────────────────────────────────────────────────────────────────

export interface SendOptions {
  to: string | string[];
  subject: string;
  html: string;
  from: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendResult {
  id: string;
}

export interface EmailProvider {
  readonly name: string;
  send(opts: SendOptions): Promise<SendResult>;
}

// ── Provider types ───────────────────────────────────────────────────────────

export type EmailProviderType = "resend" | "nodemailer" | "console";

// ── Factory ──────────────────────────────────────────────────────────────────

import { ConsoleEmailProvider } from "./providers/console";
import { NodemailerEmailProvider } from "./providers/nodemailer";
import { ResendEmailProvider } from "./providers/resend";

let cachedProvider: EmailProvider | undefined;

function detectProviderType(): EmailProviderType {
  const explicit = process.env.EMAIL_PROVIDER;
  if (explicit === "resend" || explicit === "nodemailer" || explicit === "console") {
    return explicit;
  }

  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "nodemailer";
  return "console";
}

function createProvider(type: EmailProviderType): EmailProvider {
  switch (type) {
    case "resend":
      return new ResendEmailProvider(process.env.RESEND_API_KEY!);
    case "nodemailer":
      return new NodemailerEmailProvider({
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
          : undefined,
      });
    case "console":
      return new ConsoleEmailProvider();
  }
}

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;
  const type = detectProviderType();
  cachedProvider = createProvider(type);
  return cachedProvider;
}

export function resetEmailProvider(): void {
  cachedProvider = undefined;
}
