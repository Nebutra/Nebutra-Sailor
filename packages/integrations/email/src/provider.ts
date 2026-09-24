/**
 * @nebutra/email — Provider abstraction
 *
 * Supports multiple email providers via auto-detection:
 *   1. EMAIL_PROVIDER env var (explicit)
 *   2. RESEND_API_KEY → Resend
 *   3. Fallback → Console (dev/test)
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

export type EmailProviderType = "resend" | "console";

// ── Factory ──────────────────────────────────────────────────────────────────

import { ConsoleEmailProvider } from "./providers/console";
import { ResendEmailProvider } from "./providers/resend";

let cachedProvider: EmailProvider | undefined;

function detectProviderType(): EmailProviderType {
  const explicit = process.env.EMAIL_PROVIDER;
  if (explicit === "resend" || explicit === "console") {
    return explicit;
  }

  if (process.env.RESEND_API_KEY) return "resend";
  return "console";
}

function createProvider(type: EmailProviderType): EmailProvider {
  switch (type) {
    case "resend":
      return new ResendEmailProvider(process.env.RESEND_API_KEY!);
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
