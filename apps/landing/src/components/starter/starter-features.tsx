import { getTranslations } from "next-intl/server";
import { SITE, type SiteTranslator } from "@/content/site";
import { RevealGroup } from "@/shared/animation/reveal-group";
import { SectionHeading } from "./section-heading";
import { StarterIcon } from "./starter-icon";

export async function StarterFeatures({ locale }: { locale: string }) {
  const { features } = SITE;
  const t = (await getTranslations({
    locale,
    namespace: "site.features",
  })) as unknown as SiteTranslator;
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-20 px-4 py-16 md:px-6 md:py-28"
    >
      <div className="mx-auto max-w-content">
        <SectionHeading id="features-title" title={t("title")} lead={t("lead")} />
        {/* One framed artifact for the section: a hairline grid. The icons sit
            on the cell itself — no box inside the box. */}
        <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((item) => (
            <div key={item.icon} className="bg-card p-6 md:p-8">
              <span className="text-foreground">
                <StarterIcon name={item.icon} size={20} />
              </span>
              <h3 className="mt-5 font-medium text-foreground">{t(`items.${item.icon}.title`)}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t(`items.${item.icon}.body`)}
              </p>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
