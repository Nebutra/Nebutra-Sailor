"use server";

import { z } from "zod";
import { serverLog } from "@/lib/server-log";

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  category: z.enum(["general", "sales", "support", "legal", "privacy", "partnership", "press"]),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    category: formData.get("category"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Invalid form data. Please check all fields." };
  }

  const { name, email, company, category, subject, message } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_FORM_TO ?? "contact@nebutra.com";

  if (!apiKey) {
    // In development without Resend, log and return success so the form is testable.
    if (process.env.NODE_ENV !== "production") {
      serverLog.info("Contact form submission (Resend not configured)", {
        name,
        email,
        category,
        subject,
      });
      return { status: "success" };
    }
    serverLog.error("RESEND_API_KEY is not set — contact form submission dropped");
    return {
      status: "error",
      message: "Email delivery is not configured. Please email us directly.",
    };
  }

  const payload = JSON.stringify({
    from: "Nebutra Contact Form <noreply@nebutra.com>",
    to,
    reply_to: email,
    subject: `[${category}] ${subject}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      `Category: ${category}`,
      ``,
      message,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  // Exponential backoff retry: 3 attempts with 500ms → 1s → 2s delays.
  // Retries only on transient errors (network failure or 5xx from Resend).
  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      // 4xx errors are permanent failures — don't retry
      if (res.status >= 400 && res.status < 500) {
        const body = await res.text().catch(() => "");
        serverLog.error("Resend API client error (no retry)", { status: res.status, body });
        return { status: "error", message: "Failed to send message. Please try again." };
      }

      if (!res.ok) {
        // 5xx — transient, retry after backoff
        const body = await res.text().catch(() => "");
        serverLog.warn(`Resend API server error (attempt ${attempt}/${MAX_ATTEMPTS})`, {
          status: res.status,
          body,
        });
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        serverLog.info("Contact form submitted", {
          category,
          email: email.replace(/(.{2}).*@/, "$1***@"),
        });
        return { status: "success" };
      }
    } catch (err) {
      serverLog.warn(`Contact form fetch failed (attempt ${attempt}/${MAX_ATTEMPTS})`, {
        error: err instanceof Error ? err.message : String(err),
      });
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      // 500ms, 1000ms — capped at 2s
      await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** (attempt - 1), 2_000)));
    }
  }

  serverLog.error("Contact form submission failed after all retries", {
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  return { status: "error", message: "Network error. Please try again later." };
}
