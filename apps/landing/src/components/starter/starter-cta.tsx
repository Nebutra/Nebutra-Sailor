import { ArrowRight } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/content/site";
import { StarterLink } from "./starter-link";

export async function StarterCta({ locale }: { locale: string }) {
  const { cta } = SITE;
  const t = await getTranslations({ locale, namespace: "site.cta" });
  // The last section is a section like the others: same heading size, same
  // rhythm, no frame, glow or shadow — two buttons and nothing that moves.
  return (
    <section aria-labelledby="cta-title" className="px-4 py-16 md:px-6 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="cta-title"
          className="font-heading text-balance text-3xl tracking-tight text-foreground [font-weight:var(--font-weight-heading,500)] md:text-5xl"
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-base text-muted-foreground md:text-lg">
          {t("body")}
        </p>
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
    </section>
  );
}
