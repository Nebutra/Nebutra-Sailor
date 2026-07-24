"use server";

import { brand } from "@nebutra/brand/metadata";
import { getBrandEmail } from "@nebutra/brand/metadata-helpers";
import { logger } from "@nebutra/logger";
import pRetry, { AbortError } from "p-retry";
import { z } from "zod";

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
  const to = process.env.CONTACT_FORM_TO ?? getBrandEmail("contact");

  if (!apiKey) {
    // In development without Resend, log and return success so the form is testable.
    if (process.env.NODE_ENV !== "production") {
      logger.info("Contact form submission (Resend not configured)", {
        name,
        email,
        category,
        subject,
      });
      return { status: "success" };
    }
    logger.error("RESEND_API_KEY is not set — contact form submission dropped");
    return {
      status: "error",
      message: "Email delivery is not configured. Please email us directly.",
    };
  }

  const payload = JSON.stringify({
    from: `${brand.name} Contact Form <${getBrandEmail("noreply")}>`,
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
  // 4xx client errors are permanent — aborted immediately via AbortError.
  try {
    await pRetry(
      async () => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });

        // 4xx errors are permanent failures — abort retrying immediately
        if (res.status >= 400 && res.status < 500) {
          const body = await res.text().catch(() => "");
          logger.error("Resend API client error (no retry)", undefined, {
            status: res.status,
            body,
          });
          throw new AbortError(`HTTP ${res.status}`);
        }

        if (!res.ok) {
          // 5xx — transient, let p-retry apply backoff
          const body = await res.text().catch(() => "");
          logger.warn("Resend API server error", { status: res.status, body });
          throw new Error(`HTTP ${res.status}`);
        }

        logger.info("Contact form submitted", {
          category,
          email: email.replace(/(.{2}).*@/, "$1***@"),
        });
      },
      {
        retries: 2, // 1 initial + 2 retries = 3 total attempts
        minTimeout: 500,
        maxTimeout: 2_000,
        factor: 2,
        onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
          logger.warn(`Contact form fetch failed (attempt ${attemptNumber}, ${retriesLeft} left)`, {
            error: error.message,
          });
        },
      },
    );

    return { status: "success" };
  } catch (err) {
    // AbortError means a 4xx permanent failure — user-facing message already logged
    if (err instanceof AbortError) {
      return { status: "error", message: "Failed to send message. Please try again." };
    }
    logger.error("Contact form submission failed after all retries", undefined, {
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "error", message: "Network error. Please try again later." };
  }
}
