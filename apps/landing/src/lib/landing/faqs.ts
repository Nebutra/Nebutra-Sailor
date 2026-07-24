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

// Two former subsections — the high-level "Questions, answered straight" and the
// engineering "Evaluating the stack" — are merged into a single accordion. Order
// flows from product/commercial → operations → engineering depth so a casual
// visitor sees their concerns first, while an engineer can scroll into detail.
export const FAQS: readonly FaqEntry[] = [
  // Product / commercial
  { id: "what-is-sailor" },
  { id: "who-is-it-for" },
  { id: "free-or-paid" },
  { id: "license" },
  { id: "paid-updates" },
  { id: "support" },
  // Operations
  { id: "deployment" },
  { id: "china-friendly" },
  // Engineering depth
  { id: "tech-stack" },
  { id: "why-turborepo" },
  { id: "multi-tenancy" },
  { id: "swap-clerk" },
  { id: "byo-provider" },
  { id: "security" },
] as const;
