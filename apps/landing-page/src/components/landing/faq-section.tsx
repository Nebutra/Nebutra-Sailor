"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FAQS } from "@/lib/landing/faqs";

/**
 * Marketing FAQ section.
 *
 * Renders an accessible single-open accordion driven by the static catalog in
 * `@/lib/landing/faqs`. Each entry's question/answer text is sourced via
 * `next-intl` under the `landing.faq.items.{id}.{question,answer}` namespace.
 */
export function FAQSection() {
  const t = useTranslations("landing.faq");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      id="faq"
      className="relative w-full bg-background py-24 md:py-32"
      aria-labelledby="landing-faq-title"
    >
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            {t("badge")}
          </p>
          <h2
            id="landing-faq-title"
            className="text-balance text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground"
            style={{
              letterSpacing: "var(--tracking-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div
          className="mx-auto mt-12 max-w-4xl divide-y divide-border rounded-[var(--radius-card)] border border-border bg-muted/40"
          style={{ boxShadow: "var(--ring-hairline)" }}
        >
          {FAQS.map((entry) => {
            const isOpen = openId === entry.id;
            const panelId = `faq-panel-${entry.id}`;
            const triggerId = `faq-trigger-${entry.id}`;

            return (
              <div key={entry.id}>
                <h3>
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId((prev) => (prev === entry.id ? null : entry.id))}
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left text-base font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-1 md:px-8 md:py-6 md:text-lg"
                  >
                    <span>
                      {/* next-intl's strict key typing cannot prove the
                          dynamic id is part of the union — the ids list is
                          kept in sync with the i18n bundle by lib/landing/faqs. */}
                      {t(
                        // biome-ignore lint/suspicious/noExplicitAny: dynamic i18n key, ids tracked in lib/landing/faqs
                        `items.${entry.id}.question` as any,
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`text-[hsl(var(--primary))] transition-transform ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <section
                  id={panelId}
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                  className="px-6 pb-6 text-base leading-relaxed text-muted-foreground md:px-8"
                >
                  {t(
                    // biome-ignore lint/suspicious/noExplicitAny: dynamic i18n key, ids tracked in lib/landing/faqs
                    `items.${entry.id}.answer` as any,
                  )}
                </section>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

FAQSection.displayName = "LandingFAQSection";
