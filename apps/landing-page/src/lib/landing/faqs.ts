/**
 * FAQ entries shown on the marketing landing page.
 *
 * `id` is a stable slug used as the i18n key suffix:
 *   landing.faq.items.{id}.question
 *   landing.faq.items.{id}.answer
 *
 * The component renders question/answer text via `useTranslations("landing.faq")`
 * so each entry only needs metadata here.
 */
export interface FaqEntry {
  readonly id: string;
}

export const FAQS: readonly FaqEntry[] = [
  { id: "what-is-sailor" },
  { id: "who-is-it-for" },
  { id: "free-or-paid" },
  { id: "china-friendly" },
  { id: "deployment" },
  { id: "security" },
  { id: "support" },
  { id: "byo-provider" },
  { id: "tech-stack" },
  { id: "license" },
] as const;
