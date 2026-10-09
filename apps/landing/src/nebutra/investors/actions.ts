"use server";

import { z } from "zod";
import { type ContactFormState, submitContactForm } from "@/app/[lang]/(legal)/contact/actions";

/**
 * The investors page asks for the deck through the site's own contact
 * pipeline (Resend → CONTACT_FORM_TO), so delivery, retries and logging stay
 * in one place; the founder's address sits beside the form as the direct
 * line. This only shapes the request: the intent becomes the subject, the
 * category is "partnership".
 */
const INTENTS = ["deck", "call", "partner"] as const;
export type Intent = (typeof INTENTS)[number];

const SUBJECT: Record<Intent, string> = {
  deck: "[Investors] Deck request",
  call: "[Investors] Call request",
  partner: "[Partners] Partnership enquiry",
};

const schema = z.object({
  intent: z.enum(INTENTS),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  firm: z.string().trim().max(100).optional(),
  message: z.string().trim().max(4000).optional(),
});

export type IntroState = { status: "idle" } | { status: "success" } | { status: "error" };

export async function requestIntro(_prev: IntroState, formData: FormData): Promise<IntroState> {
  const parsed = schema.safeParse({
    intent: formData.get("intent"),
    name: formData.get("name"),
    email: formData.get("email"),
    firm: formData.get("firm") || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { status: "error" };

  const { intent, name, email, firm, message } = parsed.data;
  const body = new FormData();
  body.set("name", name);
  body.set("email", email);
  if (firm) body.set("company", firm);
  body.set("category", "partnership");
  body.set("subject", firm ? `${SUBJECT[intent]} — ${firm}` : SUBJECT[intent]);
  body.set("message", [`Sent from /investors (${intent}).`, message].filter(Boolean).join("\n\n"));

  const result: ContactFormState = await submitContactForm({ status: "idle" }, body);
  return result.status === "success" ? { status: "success" } : { status: "error" };
}
