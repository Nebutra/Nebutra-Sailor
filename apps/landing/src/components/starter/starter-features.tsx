import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { getTranslations } from "next-intl/server";
import { SITE, type SiteTranslator } from "@/content/site";
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
      className="scroll-mt-20 px-4 py-20 md:px-6 md:py-28"
    >
      <div className="mx-auto max-w-content">
        <SectionHeading
          id="features-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
        />
        <AnimateInGroup
          stagger="fast"
          className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.items.map((item) => (
            <AnimateIn key={item.icon} preset="fadeUp" className="bg-card p-6 md:p-8">
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-border bg-background text-foreground">
                <StarterIcon name={item.icon} />
              </span>
              <h3 className="mt-5 font-medium text-foreground">{t(`items.${item.icon}.title`)}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t(`items.${item.icon}.body`)}
              </p>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}
