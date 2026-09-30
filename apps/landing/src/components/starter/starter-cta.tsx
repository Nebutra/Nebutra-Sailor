import { ArrowRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/content/site";
import { StarterLink } from "./starter-link";

export async function StarterCta({ locale }: { locale: string }) {
  const { cta } = SITE;
  const t = await getTranslations({ locale, namespace: "site.cta" });
  return (
    <section aria-labelledby="cta-title" className="px-4 pt-8 pb-24 md:px-6 md:pb-32">
      <AnimateIn preset="fadeUp">
        <div className="relative isolate mx-auto max-w-content overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card px-6 py-14 text-center shadow-ambient-md md:py-20">
          <div
            aria-hidden="true"
            className="-z-10 absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,var(--neutral-3),transparent_70%)]"
          />
          <h2
            id="cta-title"
            className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground">{t("body")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="ink">
              <StarterLink href={cta.primary.href}>
                {t("primaryLabel")}
                <ArrowRight aria-hidden="true" />
              </StarterLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <StarterLink href={cta.secondary.href}>{t("secondaryLabel")}</StarterLink>
            </Button>
          </div>
        </div>
      </AnimateIn>
    </section>
  );
}
