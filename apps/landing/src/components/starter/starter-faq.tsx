import { Plus } from "@nebutra/icons";
import { getTranslations } from "next-intl/server";
import { SITE, type SiteTranslator } from "@/content/site";
import { SectionHeading } from "./section-heading";

/** The questions from messages/en.json → site.faq, as native disclosures (no script needed). */
export async function StarterFaq({ locale, level = 2 }: { locale: string; level?: 1 | 2 }) {
  const { faq } = SITE;
  const t = (await getTranslations({ locale, namespace: "site.faq" })) as unknown as SiteTranslator;
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 px-4 py-16 md:px-6 md:py-28"
    >
      <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeading
          id="faq-title"
          level={level}
          align="start"
          title={t("title")}
          lead={t("lead")}
        />
        <div className="divide-y divide-border border-y border-border">
          {faq.items.map((item) => (
            <details key={item.id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {t(`items.${item.id}.q`)}
                <Plus
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform duration-micro group-open:rotate-45"
                />
              </summary>
              <p className="pb-5 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t(`items.${item.id}.a`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
